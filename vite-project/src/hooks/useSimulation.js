import { useEffect, useRef } from 'react'
import { useSimStore } from '../store/simulationStore'
import { buildHurricanePath, interpolatePosition, distanceFromPath } from '../utils/hurricanePath'
import { assignAgentsToZones } from '../utils/shortestRoute'

const TICK_MS            = 100
const TAMPA              = { lat: 27.9506, lng: -82.4572 }
const THREAT_MAX_DIST_KM = 450
const EVAC_CERTAINTY_PCT = 60
const EVAC_DIST_KM       = 300
const EVAC_MIN_CATEGORY  = 3
const DANGER_RADIUS_KM   = 120

// ── Helpers ─────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function computeThreat(pos, hurricane) {
  const distKm      = haversineKm(pos.lat, pos.lng, TAMPA.lat, TAMPA.lng)
  const distanceMiles = Math.round(distKm * 0.621371)
  const distFactor  = Math.max(0, 1 - distKm / THREAT_MAX_DIST_KM)
  const catFactor   = Math.min(1.0, 0.5 + hurricane.category * 0.1)
  const certainty   = Math.max(5, Math.min(99, Math.round(distFactor * catFactor * 130)))

  let phase = 'MONITORING'
  if (certainty >= EVAC_CERTAINTY_PCT && distKm < EVAC_DIST_KM) phase = 'EVACUATION ORDER'
  else if (certainty >= 40 && distKm < EVAC_DIST_KM)            phase = 'WARNING'
  else if (certainty >= 20 && distKm < THREAT_MAX_DIST_KM)      phase = 'WATCH'

  return { distanceKm: Math.round(distKm), distanceMiles, certainty, phase }
}

export function useSimulation() {
  const store    = useSimStore()
  const frameRef = useRef(null)
  const rotRef   = useRef(0)
  const pathRef  = useRef(null)

  useEffect(() => {
    pathRef.current = buildHurricanePath(store.hurricane)
  }, [store.hurricane])

  // ── Main tick loop ───────────────────────────────────────────
  useEffect(() => {
    if (store.status !== 'running') {
      clearInterval(frameRef.current)
      return
    }

    frameRef.current = setInterval(() => {
      const state = useSimStore.getState()
      const { speed, hurricaneProgress, hurricane, evacuationTriggered } = state

      // Hurricane movement
      const newProgress = Math.min(hurricaneProgress + 0.001 * speed, 1)
      const newPos      = interpolatePosition(pathRef.current, newProgress)
      rotRef.current    = (rotRef.current + 2 * speed) % 360

      useSimStore.setState({
        hurricaneProgress: newProgress,
        hurricanePosition: newPos,
        hurricaneRotation: rotRef.current,
        tick:         state.tick + 1,
        elapsedHours: parseFloat((state.elapsedHours + 0.05 * speed).toFixed(2)),
      })

      // Threat assessment
      const threat = computeThreat(newPos, hurricane)
      state.setThreatAssessment(threat)

      // Evacuation trigger — classify waiting agents by path proximity
      if (
        !evacuationTriggered &&
        threat.certainty   >= EVAC_CERTAINTY_PCT &&
        threat.distanceKm  <  EVAC_DIST_KM &&
        hurricane.category >= EVAC_MIN_CATEGORY
      ) {
        state.triggerEvacuation()
        const currentAgents = useSimStore.getState().agents
        let inPath = 0, outOfPath = 0
        const classified = currentAgents.map(a => {
          if (a.status !== 'waiting') return a   // sheltering/stranded keep their AI decision
          const d = distanceFromPath(a.position, pathRef.current)
          if (d < DANGER_RADIUS_KM) { inPath++;   return { ...a, status: 'evacuating' } }
          else                      { outOfPath++; return { ...a, status: 'safe' } }
        })
        useSimStore.setState({ agents: classified })
        state.addLog(
          `EVACUATION ORDER — ${inPath} agents evacuating, ${outOfPath} outside danger zone`,
          'warning'
        )
      }

      // Agent movement — only evacuating agents move
      const latestAgents = useSimStore.getState().agents
      const updatedAgents = latestAgents.map(agent => {
        if (['arrived', 'stranded', 'waiting', 'safe', 'sheltering', 'casualty'].includes(agent.status)) {
          return agent
        }
        if (!agent.route || agent.route.length < 2) return agent

        const step      = 0.008 * agent.speed * speed
        const newProg   = Math.min(agent.progress + step, 1)
        const routeLen  = agent.route.length - 1
        const routeT    = newProg * routeLen
        const routeIdx  = Math.min(Math.floor(routeT), routeLen - 1)
        const routeFrac = routeT - routeIdx
        const from      = agent.route[routeIdx]
        const to        = agent.route[Math.min(routeIdx + 1, routeLen)]
        const lng       = from[0] + (to[0] - from[0]) * routeFrac
        const lat       = from[1] + (to[1] - from[1]) * routeFrac
        const newStatus = newProg >= 1 ? 'arrived' : 'evacuating'

        if (newStatus === 'arrived' && agent.status !== 'arrived') {
          useSimStore.getState().addLog(`${agent.name || agent.label} reached safety`, 'success')
          useSimStore.getState().updateSafeZone(agent.assignedZoneId, {})
        }

        return { ...agent, progress: newProg, position: { lng, lat }, status: newStatus }
      })
      useSimStore.setState({ agents: updatedAgents })

      // Hurricane landfall — declare casualties
      if (newProgress >= 1) {
        const finalAgents = useSimStore.getState().agents
        const withCasualties = finalAgents.map(a => {
          if (a.status === 'arrived' || a.status === 'safe') return a
          return { ...a, status: 'casualty' }
        })
        useSimStore.setState({ agents: withCasualties, status: 'complete' })

        const casualties = withCasualties.filter(a => a.status === 'casualty')
        const survived   = withCasualties.filter(a => a.status === 'arrived').length

        casualties.forEach(a => {
          const name      = a.name || a.label
          const reasoning = a.aiDecision?.reasoning
          useSimStore.getState().addLog(
            `CASUALTY: ${name}, ${a.age ? `age ${a.age}, ` : ''}${a.neighborhood}${reasoning ? ` — "${reasoning}"` : ''}`,
            'error'
          )
        })

        useSimStore.getState().addLog(
          `Hurricane made landfall. ${casualties.length} casualt${casualties.length === 1 ? 'y' : 'ies'} — ${survived} confirmed safe.`,
          'error'
        )
      }

    }, TICK_MS)

    return () => clearInterval(frameRef.current)
  }, [store.status, store.speed])

  // ── Start simulation ─────────────────────────────────────────
  const startSimulation = async () => {
    const state = useSimStore.getState()
    if (state.safeZones.length === 0) {
      alert('Generate safe zones first.')
      return
    }

    useSimStore.setState({
      status:              'generating',
      evacuationTriggered: false,
      threatAssessment:    { distanceKm: 0, distanceMiles: 0, certainty: 5, phase: 'MONITORING' },
    })
    useSimStore.getState().addLog('Assigning evacuation routes…', 'info')

    let { agents } = state
    if (agents.length === 0) {
      useSimStore.getState().spawnAgents(80)
      agents = useSimStore.getState().agents
    }

    // Pre-classify — agents outside the hurricane path danger zone are already safe
    const path = pathRef.current
    const inDanger  = agents.filter(a => distanceFromPath(a.position, path) < DANGER_RADIUS_KM)
    const outOfPath = agents
      .filter(a => distanceFromPath(a.position, path) >= DANGER_RADIUS_KM)
      .map(a => ({ ...a, status: 'safe' }))

    if (outOfPath.length > 0) {
      useSimStore.getState().addLog(
        `${outOfPath.length} civilians outside hurricane path — no evacuation needed`,
        'info'
      )
    }

    // Phase 1 — assign routes (only agents in the danger zone)
    const assignments = await assignAgentsToZones(inDanger, useSimStore.getState().safeZones)
    const assignedAgents = inDanger.map(agent => {
      const a = assignments.find(x => x.agentId === agent.id)
      return a
        ? { ...agent, assignedZoneId: a.zoneId, route: a.route,
            distanceKm: a.distanceKm, etaHours: a.etaHours,
            status: a.zoneId ? 'waiting' : 'stranded' }
        : agent
    })

    // Phase 2 — AI character decisions (backend, optional, only for danger-zone agents)
    useSimStore.getState().addLog('AI assessing civilian profiles…', 'info')
    let agentsWithDecisions = assignedAgents
    try {
      const res = await fetch('http://localhost:8000/api/agent-decisions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          agents:     assignedAgents,
          hurricane:  state.hurricane,
          safe_zones: useSimStore.getState().safeZones,
        }),
        signal: AbortSignal.timeout(45000),
      })
      if (res.ok) {
        const { decisions } = await res.json()
        const decisionMap = Object.fromEntries(decisions.map(d => [d.agent_id, d]))
        agentsWithDecisions = assignedAgents.map(agent => {
          const d = decisionMap[agent.id]
          if (!d) return agent
          // AI said shelter or request help — override waiting status
          if (d.action === 'shelter_in_place') {
            return { ...agent, status: 'sheltering', aiDecision: d }
          }
          if (d.action === 'request_help') {
            return { ...agent, status: 'stranded', aiDecision: d }
          }
          return { ...agent, aiDecision: d }
        })
        const sheltering = agentsWithDecisions.filter(a => a.status === 'sheltering').length
        const stranded   = agentsWithDecisions.filter(a => a.status === 'stranded').length
        useSimStore.getState().addLog(
          `AI profiled ${decisions.length} civilians — ${sheltering} refusing to evacuate, ${stranded} requesting help`,
          'info'
        )
        decisions
          .filter(d => d.message)
          .slice(0, 5)
          .forEach(d => useSimStore.getState().addLog(d.message, 'info'))
      }
    } catch (_) {
      useSimStore.getState().addLog('AI character decisions unavailable — defaulting all to evacuate', 'info')
    }

    useSimStore.setState({ agents: [...agentsWithDecisions, ...outOfPath], status: 'running' })
    useSimStore.getState().addLog(
      `${agentsWithDecisions.length} civilians on standby — monitoring hurricane approach`,
      'info'
    )
  }

  return { startSimulation }
}
