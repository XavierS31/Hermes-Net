/**
 * Smoothly interpolates agent + hurricane positions between WebSocket ticks
 * so the map animates at ~60 fps instead of jumping every 2 s.
 */
import { useEffect, useRef, useState } from 'react'
import type { SimState } from '../types'

const TICK_MS = 2000 // WebSocket broadcast interval (backend _tick_loop)

export function useInterpolation(state: SimState | null): SimState | null {
  const prevRef = useRef<SimState | null>(null)
  const [display, setDisplay] = useState<SimState | null>(state)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!state) return
    prevRef.current = display        // snapshot current displayed state as "from"
    startRef.current = Date.now()

    cancelAnimationFrame(rafRef.current)

    function animate() {
      const t = Math.min((Date.now() - startRef.current) / TICK_MS, 1)
      const prev = prevRef.current
      if (!prev || !state) { setDisplay(state); return }

      const residents = state.residents.map((r) => {
        const p = prev.residents.find((x) => x.id === r.id)
        if (!p) return r
        return {
          ...r,
          lat:      p.lat      + (r.lat      - p.lat)      * t,
          lng:      p.lng      + (r.lng      - p.lng)      * t,
          progress: p.progress + (r.progress - p.progress) * t,
        }
      })

      const hurricane = {
        ...state.hurricane,
        lat: prev.hurricane.lat + (state.hurricane.lat - prev.hurricane.lat) * t,
        lng: prev.hurricane.lng + (state.hurricane.lng - prev.hurricane.lng) * t,
      }

      setDisplay({ ...state, residents, hurricane })
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return display
}
