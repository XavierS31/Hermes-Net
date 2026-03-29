import { useEffect, useRef, useState, useCallback } from 'react'
import type { SimState } from '../types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const WS  = import.meta.env.VITE_WS_URL  ?? 'ws://localhost:8000/ws'

export function useSimulation() {
  const [state, setState] = useState<SimState | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        if (retryRef.current) clearTimeout(retryRef.current)
      }

      ws.onmessage = (e) => {
        try { setState(JSON.parse(e.data as string)) } catch { /* ignore */ }
      }

      ws.onclose = () => {
        setConnected(false)
        retryRef.current = setTimeout(connect, 2500)
      }

      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      wsRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [])

  const tick = useCallback(async () => {
    const res = await fetch(`${API}/tick`, { method: 'POST' })
    setState(await res.json())
  }, [])

  const reset = useCallback(async () => {
    await fetch(`${API}/reset`, { method: 'POST' })
    const res = await fetch(`${API}/state`)
    setState(await res.json())
  }, [])

  const runAgents = useCallback(async () => {
    const res = await fetch(`${API}/agents/run`, { method: 'POST' })
    return res.json()
  }, [])

  const setOrigin = useCallback(async (origin: string) => {
    await fetch(`${API}/hurricane/origin/${encodeURIComponent(origin)}`, { method: 'POST' })
  }, [])

  return { state, connected, tick, reset, runAgents, setOrigin }
}
