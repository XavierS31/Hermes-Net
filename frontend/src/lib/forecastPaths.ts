import type { SimState } from '../types'
import type { HurricaneOrigin } from './geo'
import { HURRICANE_PATHS } from './geo'

/** Prefer live forecast from backend (simulation + AI / coordinator); fallback to static origin path. */
export function getForecastPathLngLat(
  state: SimState | null,
  origin: HurricaneOrigin,
): [number, number][] {
  const fs = state?.forecast_snapshot as
    | { forecast_track?: { lat: number; lng: number }[] }
    | undefined
  const ft = fs?.forecast_track
  if (Array.isArray(ft) && ft.length > 0) {
    const out: [number, number][] = []
    for (const p of ft) {
      if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
        out.push([p.lng, p.lat])
      }
    }
    if (out.length > 0) return out
  }
  return HURRICANE_PATHS[origin]
}

export function getObservedTrackLngLat(state: SimState | null): [number, number][] {
  const fs = state?.forecast_snapshot as { observed_track?: { lat: number; lng: number }[] } | undefined
  const ot = fs?.observed_track
  if (Array.isArray(ot) && ot.length > 0) {
    return ot.map((p) => [p.lng, p.lat] as [number, number])
  }
  const th = state?.hurricane?.track_history
  if (Array.isArray(th) && th.length > 0) {
    return th.map((p: number[]) => [p[0], p[1]] as [number, number])
  }
  return []
}
