import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { EnvironmentState, TripDatum } from '../data/simulationTypes'
import { useSimulationState } from '../state/SimulationStateContext'

export type A2ALogLevel = 'system' | 'alert' | 'rpc'

export type A2ALogEntry = {
  id: string
  ts: Date
  level: A2ALogLevel
  text: string
}

type ZoneFilter = {
  minLon: number
  maxLon: number
  minLat: number
  maxLat: number
} | null

export type StormHud = {
  label: string
  windMph: number
  category: number
}

type C2Value = {
  connected: boolean
  tick: number
  tickCount: number
  tickHours: number
  currentTime: number
  playing: boolean
  trips: TripDatum[]
  bridges: import('../data/simulationTypes').BridgeState[]
  telemetry: import('../data/simulationTypes').Telemetry | null
  storm: StormHud
  evacuationPct: number
  missionDeadline: Date | null
  simulationClockUtc: string | null
  serverTimeUtc: string | null
  environmentState: EnvironmentState | null
  logs: A2ALogEntry[]
  selectedZone: ZoneFilter
  highlightedAgentIds: Set<number> | null
  hoverBridgeId: string | null
  setTick: (t: number) => void
  togglePlay: () => void
  appendLog: (level: A2ALogLevel, text: string) => void
  setHoverBridgeId: (id: string | null) => void
  drillZone: (zone: ZoneFilter) => void
  clearZone: () => void
}

const C2Context = createContext<C2Value | null>(null)

export function C2Provider({ children }: { children: ReactNode }) {
  const sim = useSimulationState()
  const [logs, setLogs] = useState<A2ALogEntry[]>([])
  const [hoverBridgeId, setHoverBridgeId] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<ZoneFilter>(null)
  const [highlightedAgentIds, setHighlightedAgentIds] = useState<Set<number> | null>(
    null,
  )

  const tickCount =
    sim.state?.tick_count ?? sim.handshake?.tick_count ?? 14
  const tickHours =
    sim.state?.tick_hours ?? sim.handshake?.tick_hours ?? 12

  const tick = sim.state?.tick_index ?? 0
  const playing = sim.state?.playing ?? false
  const trips = sim.state?.positions ?? []
  const bridges = sim.state?.bridges ?? []
  const telemetry = sim.state?.telemetry ?? null

  const storm = useMemo<StormHud>(() => {
    if (!telemetry) {
      return { label: '—', windMph: 0, category: 0 }
    }
    return {
      label: telemetry.category_label,
      windMph: telemetry.wind_speed_mph,
      category: telemetry.category,
    }
  }, [telemetry])

  const evacuationPct = telemetry?.evacuation_percent ?? 0

  const missionDeadline = useMemo(() => {
    const raw = sim.handshake?.mission_deadline_utc
    if (!raw) return null
    return new Date(raw)
  }, [sim.handshake?.mission_deadline_utc])

  const simulationClockUtc = sim.state?.simulation_clock_utc ?? null
  const serverTimeUtc = sim.state?.server_time_utc ?? null
  const environmentState = sim.state?.environment_state ?? null

  const appendLog = useCallback((level: A2ALogLevel, text: string) => {
    const entry: A2ALogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ts: new Date(),
      level,
      text,
    }
    setLogs((prev) => [...prev.slice(-200), entry])
  }, [])

  const setTick = useCallback(
    (t: number) => {
      const max = Math.max(0, tickCount - 1)
      sim.sendControl('set_tick', Math.max(0, Math.min(max, Math.round(t))))
    },
    [sim, tickCount],
  )

  const togglePlay = useCallback(() => {
    sim.sendControl(playing ? 'pause' : 'play')
  }, [sim, playing])

  const drillZone = useCallback(
    (zone: ZoneFilter) => {
      setSelectedZone(zone)
      if (!zone) {
        setHighlightedAgentIds(null)
        return
      }
      const ids = new Set<number>()
      const ti = Math.min(tick, Math.max(0, tickCount - 1))
      trips.forEach((tr) => {
        const idx = Math.min(ti, tr.path.length - 1)
        const [lon, lat] = tr.path[idx]
        if (
          lon >= zone.minLon &&
          lon <= zone.maxLon &&
          lat >= zone.minLat &&
          lat <= zone.maxLat
        ) {
          ids.add(tr.id)
        }
      })
      setHighlightedAgentIds(ids)
      appendLog('system', `ZONE_DRILL: ${ids.size} resident agents in bbox`)
    },
    [appendLog, tick, tickCount, trips],
  )

  const clearZone = useCallback(() => {
    setSelectedZone(null)
    setHighlightedAgentIds(null)
  }, [])

  const connectLogged = useRef(false)
  useEffect(() => {
    if (sim.connected && !connectLogged.current) {
      connectLogged.current = true
      appendLog('system', 'WebSocket connected · simulation stream')
    }
    if (!sim.connected) connectLogged.current = false
  }, [sim.connected, appendLog])

  const value = useMemo<C2Value>(
    () => ({
      connected: sim.connected,
      tick,
      tickCount,
      tickHours,
      currentTime: tick,
      playing,
      trips,
      bridges,
      telemetry,
      storm,
      evacuationPct,
      missionDeadline,
      simulationClockUtc,
      serverTimeUtc,
      environmentState,
      logs,
      selectedZone,
      highlightedAgentIds,
      hoverBridgeId,
      setTick,
      togglePlay,
      appendLog,
      setHoverBridgeId,
      drillZone,
      clearZone,
    }),
    [
      sim.connected,
      tick,
      tickCount,
      tickHours,
      playing,
      trips,
      bridges,
      telemetry,
      storm,
      evacuationPct,
      missionDeadline,
      simulationClockUtc,
      serverTimeUtc,
      environmentState,
      logs,
      selectedZone,
      highlightedAgentIds,
      hoverBridgeId,
      setTick,
      togglePlay,
      appendLog,
      drillZone,
      clearZone,
    ],
  )

  return <C2Context.Provider value={value}>{children}</C2Context.Provider>
}

export function useC2() {
  const ctx = useContext(C2Context)
  if (!ctx) throw new Error('useC2 must be used within C2Provider')
  return ctx
}
