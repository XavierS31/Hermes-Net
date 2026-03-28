import { useEffect, useRef } from 'react'
import { useC2 } from '../../context/C2Context'
import { useSimulationWebSocket } from '../../hooks/useSimulationWebSocket'

const wsUrl =
  import.meta.env.VITE_API_WS_URL ?? 'ws://localhost:8000/ws/simulation'

/**
 * Pushes backend JSON payloads into the A2A terminal (deduped by stringified body).
 */
export function WsBridge() {
  const { appendLog } = useC2()
  const msg = useSimulationWebSocket(wsUrl)
  const last = useRef<string>('')

  useEffect(() => {
    if (msg == null) return
    const s = JSON.stringify(msg)
    if (s === last.current) return
    last.current = s
    appendLog('system', s)
  }, [msg, appendLog])

  return null
}
