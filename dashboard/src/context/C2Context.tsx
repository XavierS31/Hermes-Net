import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  bridgeLocations,
  generateResidentTrips,
  stormAtTick,
  TICK_COUNT,
  type TripDatum,
} from '../data/mockSimulation'

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

type C2Value = {
  tick: number
  currentTime: number
  playing: boolean
  trips: TripDatum[]
  bridges: ReturnType<typeof bridgeLocations>
  storm: ReturnType<typeof stormAtTick>
  evacuationPct: number
  missionDeadline: Date
  simEpochUtc: Date
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

const MISSION_HOURS = 7 * 24

export function C2Provider({ children }: { children: ReactNode }) {
  const [tick, setTickState] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [logs, setLogs] = useState<A2ALogEntry[]>([])
  const [hoverBridgeId, setHoverBridgeId] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<ZoneFilter>(null)
  const [highlightedAgentIds, setHighlightedAgentIds] = useState<Set<number> | null>(
    null,
  )

  const trips = useMemo(() => generateResidentTrips(5200, 1337), [])
  const bridges = useMemo(() => bridgeLocations(), [])

  const missionDeadline = useMemo(
    () => new Date(Date.now() + MISSION_HOURS * 3600 * 1000),
    [],
  )
  const simEpochUtc = useMemo(
    () => new Date(Date.UTC(2026, 2, 28, 12, 0, 0)),
    [],
  )

  const currentTime = tick

  const storm = useMemo(() => stormAtTick(tick), [tick])

  const evacuationPct = useMemo(
    () => Math.min(98, 38 + tick * 2.1 + (tick > 8 ? 8 : 0)),
    [tick],
  )

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
      const next = Math.max(0, Math.min(TICK_COUNT - 1, t))
      setTickState(next)
    },
    [],
  )

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p)
  }, [])

  const drillZone = useCallback(
    (zone: ZoneFilter) => {
      setSelectedZone(zone)
      if (!zone) {
        setHighlightedAgentIds(null)
        return
      }
      const ids = new Set<number>()
      trips.forEach((tr) => {
        const [lon, lat] = tr.path[Math.min(tick, tr.path.length - 1)]
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
    [appendLog, tick, trips],
  )

  const clearZone = useCallback(() => {
    setSelectedZone(null)
    setHighlightedAgentIds(null)
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setTickState((t) => {
        if (t >= TICK_COUNT - 1) {
          return TICK_COUNT - 1
        }
        return t + 1
      })
    }, 1100)
    return () => window.clearInterval(id)
  }, [playing])

  useEffect(() => {
    appendLog('system', 'JSON-RPC 2.0 transport online · warden.discover')
  }, [appendLog])

  const value = useMemo<C2Value>(
    () => ({
      tick,
      currentTime,
      playing,
      trips,
      bridges,
      storm,
      evacuationPct,
      missionDeadline,
      simEpochUtc,
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
      tick,
      currentTime,
      playing,
      trips,
      bridges,
      storm,
      evacuationPct,
      missionDeadline,
      simEpochUtc,
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
