import { useEffect, useRef } from 'react'
import { useSimStore } from '../store/simulationStore'
import { buildHurricanePath, interpolatePosition } from '../utils/hurricanePath'

const SIM_START_PROGRESS = 0.40  // start hurricane approaching Tampa, not at origin
import { assignAgentsToZones } from '../utils/shortestRoute'

const TICK_MS = 100 // base tick interval in ms

export function useSimulation() {
  const store = useSimStore()
  const frameRef = useRef(null)
  const rotationRef = useRef(0)
  const pathRef = useRef(null)

  // Build path when hurricane changes
  useEffect(() => {
    pathRef.current = buildHurricanePath(store.hurricane)
  }, [store.hurricane])

  // Main tick loop
  useEffect(() => {
    if (store.status !== 'running') {
      clearInterval(frameRef.current)
      return
    }

    frameRef.current = setInterval(() => {
      const state = useSimStore.getState()
      const { speed, hurricaneProgress, agents, safeZones } = state

      // ── Hurricane movement ──────────────────────────────────
      const newProgress = Math.min(hurricaneProgress + 0.001 * speed, 1)
      const newPos = interpolatePosition(pathRef.current, newProgress)
      rotationRef.current = (rotationRef.current + 2 * speed) % 360

      useSimStore.setState({
        hurricaneProgress: newProgress,
        hurricanePosition: newPos,
        hurricaneRotation: rotationRef.current,
        tick: state.tick + 1,
        elapsedHours: parseFloat((state.elapsedHours + 0.05 * speed).toFixed(2)),
      })

      // ── Agent movement ──────────────────────────────────────
      const updatedAgents = agents.map(agent => {
        if (agent.status === 'arrived' || agent.status === 'stranded') return agent
        if (!agent.route || agent.route.length < 2) return agent

        const step = 0.008 * agent.speed * speed
        const newProgress = Math.min(agent.progress + step, 1)

        // Interpolate along route
        const routeLen = agent.route.length - 1
        const routeT = newProgress * routeLen
        const routeIdx = Math.min(Math.floor(routeT), routeLen - 1)
        const routeFrac = routeT - routeIdx

        const from = agent.route[routeIdx]
        const to   = agent.route[Math.min(routeIdx + 1, routeLen)]
        const lng  = from[0] + (to[0] - from[0]) * routeFrac
        const lat  = from[1] + (to[1] - from[1]) * routeFrac

        const newStatus = newProgress >= 1 ? 'arrived' : 'evacuating'

        if (newStatus === 'arrived' && agent.status !== 'arrived') {
          useSimStore.getState().addLog(
            `${agent.label} agent arrived at safe zone`,
            'success'
          )
          // Update safe zone occupancy
          useSimStore.getState().updateSafeZone(agent.assignedZoneId, {})
        }

        return { ...agent, progress: newProgress, position: { lng, lat }, status: newStatus }
      })

      useSimStore.setState({ agents: updatedAgents })

      // ── Check completion ────────────────────────────────────
      if (newProgress >= 1) {
        useSimStore.setState({ status: 'complete' })
        useSimStore.getState().addLog('Hurricane has passed Tampa Bay', 'warning')
      }

    }, TICK_MS)

    return () => clearInterval(frameRef.current)
  }, [store.status, store.speed])

  // ── Start simulation ───────────────────────────────────────
  const startSimulation = () => {
    const state = useSimStore.getState()
    if (state.safeZones.length === 0) {
      alert('Generate safe zones first.')
      return
    }

    // Spawn agents if none exist
    let { agents } = state
    if (agents.length === 0) {
      useSimStore.getState().spawnAgents(80)
      agents = useSimStore.getState().agents
    }

    // Assign agents to zones
    const assignments = assignAgentsToZones(agents, state.safeZones)
    const assignedAgents = agents.map(agent => {
      const a = assignments.find(x => x.agentId === agent.id)
      return a
        ? { ...agent, assignedZoneId: a.zoneId, route: a.route, distanceKm: a.distanceKm, etaHours: a.etaHours, status: a.zoneId ? 'evacuating' : 'stranded' }
        : agent
    })

    const startPos = pathRef.current
      ? interpolatePosition(pathRef.current, SIM_START_PROGRESS)
      : { lng: state.hurricane.originLng, lat: state.hurricane.originLat }

    useSimStore.setState({
      agents: assignedAgents,
      status: 'running',
      hurricaneProgress: SIM_START_PROGRESS,
      hurricanePosition: startPos,
    })
    useSimStore.getState().addLog('Evacuation simulation started', 'info')
    useSimStore.getState().addLog(`${assignedAgents.length} agents assigned to safe zones`, 'info')
  }

  return { startSimulation }
}