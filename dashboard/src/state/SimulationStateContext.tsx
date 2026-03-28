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
import type { HandshakeConfig, SimulationStatePayload } from '../data/simulationTypes'

const WS_URL =
  import.meta.env.VITE_API_WS_URL ?? 'ws://localhost:8000/ws/simulation'

type SimulationContextValue = {
  connected: boolean
  handshake: HandshakeConfig | null
  state: SimulationStatePayload | null
  sendControl: (
    action: 'play' | 'pause' | 'set_tick',
    tick?: number,
  ) => void
}

const SimulationStateContext = createContext<SimulationContextValue | null>(
  null,
)

export function SimulationStateProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [handshake, setHandshake] = useState<HandshakeConfig | null>(null)
  const [state, setState] = useState<SimulationStatePayload | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const sendControl = useCallback(
    (action: 'play' | 'pause' | 'set_tick', tick?: number) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      const body: Record<string, unknown> = { type: 'control', action }
      if (action === 'set_tick' && tick !== undefined) {
        body.tick = tick
      }
      ws.send(JSON.stringify(body))
    },
    [],
  )

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
    }
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>
        if (msg.type === 'handshake' && msg.config) {
          setHandshake(msg.config as HandshakeConfig)
        }
        if (msg.type === 'simulation_state') {
          setState(msg as unknown as SimulationStatePayload)
        }
      } catch {
        /* ignore malformed */
      }
    }
    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [])

  const value = useMemo<SimulationContextValue>(
    () => ({
      connected,
      handshake,
      state,
      sendControl,
    }),
    [connected, handshake, state, sendControl],
  )

  return (
    <SimulationStateContext.Provider value={value}>
      {children}
    </SimulationStateContext.Provider>
  )
}

export function useSimulationState() {
  const ctx = useContext(SimulationStateContext)
  if (!ctx) {
    throw new Error('useSimulationState requires SimulationStateProvider')
  }
  return ctx
}
