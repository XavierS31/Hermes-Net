/**
 * Fetches real road routes via Mapbox Directions API for evacuating residents.
 * Caches per resident ID so we only fetch once when evacuation starts.
 * Falls back to straight-line if the API fails.
 */
import { useEffect, useRef, useState } from 'react'
import type { SimState } from '../types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

export function useRoutes(state: SimState | null): Map<number, [number, number][]> {
  const cache   = useRef<Map<number, [number, number][]>>(new Map())
  const fetching = useRef<Set<number>>(new Set())
  const [routes, setRoutes] = useState<Map<number, [number, number][]>>(new Map())

  useEffect(() => {
    if (!state || !MAPBOX_TOKEN) return

    const evacuating = state.residents.filter(
      (r) => r.status === 'evacuating' && r.assigned_shelter,
    )

    evacuating.forEach(async (r) => {
      if (cache.current.has(r.id) || fetching.current.has(r.id)) return
      const shelter = state.shelters[r.assigned_shelter!]
      if (!shelter) return

      fetching.current.add(r.id)
      try {
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${r.lng},${r.lat};${shelter.lng},${shelter.lat}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`

        const res  = await fetch(url)
        const data = await res.json() as { routes?: { geometry: { coordinates: [number,number][] } }[] }

        if (data.routes?.[0]?.geometry.coordinates) {
          cache.current.set(r.id, data.routes[0].geometry.coordinates)
        } else {
          cache.current.set(r.id, [[r.lng, r.lat], [shelter.lng, shelter.lat]])
        }
      } catch {
        cache.current.set(r.id, [[r.lng, r.lat], [shelter.lng, shelter.lat]])
      } finally {
        fetching.current.delete(r.id)
        setRoutes(new Map(cache.current))
      }
    })

    // Evict routes for residents who are no longer evacuating
    let dirty = false
    for (const id of cache.current.keys()) {
      const r = state.residents.find((x) => x.id === id)
      if (!r || r.status !== 'evacuating') {
        cache.current.delete(id)
        dirty = true
      }
    }
    if (dirty) setRoutes(new Map(cache.current))
  }, [state?.residents])   // eslint-disable-line react-hooks/exhaustive-deps

  return routes
}
