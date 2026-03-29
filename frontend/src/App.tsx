import { useState, useCallback } from 'react'
import { TampaMap }    from './components/TampaMap'
import { HUD }         from './components/HUD'
import { HoverCard }   from './components/HoverCard'
import { StatusBar }   from './components/StatusBar'
import { useSimulation }    from './hooks/useSimulation'
import { useInterpolation } from './hooks/useInterpolation'
import type { Resident } from './types'
import type { HurricaneOrigin } from './lib/geo'

interface HoverInfo {
  x: number
  y: number
  object: Resident
}

export default function App() {
  const { state: rawState, connected, reset, setOrigin } = useSimulation()
  const state = useInterpolation(rawState)

  const [origin,    setOriginLocal]  = useState<HurricaneOrigin>('south')
  const [hoverInfo, setHoverInfo]    = useState<HoverInfo | null>(null)

  const handleOrigin = useCallback((o: HurricaneOrigin) => {
    setOriginLocal(o)
    setOrigin(o)
  }, [setOrigin])

  const handleHover = useCallback((info: HoverInfo | null) => {
    setHoverInfo(info)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#060A0F', position: 'relative', overflow: 'hidden' }}>
      {/* Full-screen 3-D map */}
      <TampaMap
        state={state}
        origin={origin}
        onAgentHover={handleHover}
      />

      {/* Top status bar */}
      <HUD
        state={state}
        connected={connected}
        origin={origin}
        onOrigin={handleOrigin}
        onReset={reset}
      />

      {/* Bottom narrative bar */}
      <StatusBar state={state} origin={origin} />

      {/* Hover card — appears near cursor */}
      {hoverInfo && (
        <HoverCard
          x={hoverInfo.x}
          y={hoverInfo.y}
          agent={hoverInfo.object}
          shelters={state?.shelters ?? {}}
          alertLevel={state?.alert_level ?? 'monitor'}
        />
      )}
    </div>
  )
}
