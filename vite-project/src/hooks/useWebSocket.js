import { useEffect, useRef } from 'react'
import { useSimStore } from '../store/simulationStore'

const WS_URL = 'ws://localhost:8000/ws/simulation'

export function useWebSocket() {
  const wsRef = useRef(null)
  const addLog = useSimStore(s => s.addLog)
  const updateAgent = useSimStore(s => s.updateAgent)
  const setSafeZones = useSimStore(s => s.setSafeZones)

  useEffect(() => {
    const connect = () => {
      try {
        wsRef.current = new WebSocket(WS_URL)

        wsRef.current.onopen = () => {
          addLog('Connected to backend AI agents', 'success')
        }

        wsRef.current.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            handleMessage(msg)
          } catch (e) {
            console.error('WS parse error', e)
          }
        }

        wsRef.current.onclose = () => {
          addLog('Backend connection lost. Reconnecting...', 'warning')
          setTimeout(connect, 3000)
        }

        wsRef.current.onerror = () => {
          // silently fail if backend not running
        }
      } catch (e) {
        // backend not available
      }
    }

    // Only connect if backend expected
    // connect()

    return () => {
      wsRef.current?.close()
    }
  }, [])

  const handleMessage = (msg) => {
    switch (msg.type) {
      case 'agent_update':
        updateAgent(msg.agentId, msg.patch)
        break
      case 'safe_zones':
        setSafeZones(msg.zones)
        addLog('AI generated safe zone locations', 'success')
        break
      case 'log':
        addLog(msg.message, msg.level || 'info')
        break
      default:
        break
    }
  }

  const send = (data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }

  return { send }
}