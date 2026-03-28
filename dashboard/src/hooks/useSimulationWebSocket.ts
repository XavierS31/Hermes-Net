import { useEffect, useState } from 'react'

/**
 * Subscribes to FastAPI `/ws/simulation` heartbeats (12h Mesa ticks).
 * Decoupled from rendering — feed TripsLayer from `positions` in payloads.
 */
export function useSimulationWebSocket(url: string): unknown {
  const [lastMessage, setLastMessage] = useState<unknown>(null)

  useEffect(() => {
    const ws = new WebSocket(url)
    ws.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data as string))
      } catch {
        setLastMessage(event.data)
      }
    }
    return () => {
      ws.close()
    }
  }, [url])

  return lastMessage
}
