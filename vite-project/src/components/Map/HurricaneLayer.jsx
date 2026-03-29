/**
 * HurricaneLayer — Mapbox GL layers only:
 *   • Dashed forecast track line
 *   • Uncertainty cone (fill + outline)
 *   • CAT / wind-speed label marker
 *
 * The animated hurricane visual is handled by Hurricane3DLayer.
 */
import { useEffect, useRef } from 'react'
import { useMap, Marker } from 'react-map-gl'
import { useSimStore } from '../../store/simulationStore'
import { buildHurricanePath, pathToGeoJSON } from '../../utils/hurricanePath'

const CATEGORY_COLORS = { 1: '#3ddc84', 2: '#ffd166', 3: '#ff8c42', 4: '#ff4d4d', 5: '#cc00ff' }

const EMPTY_LINE = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }
const EMPTY_CONE = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} }

export default function HurricaneLayer() {
  const { mainMap }       = useMap()
  const hurricane         = useSimStore(s => s.hurricane)
  const hurricanePosition = useSimStore(s => s.hurricanePosition)
  const categoryColor     = CATEGORY_COLORS[hurricane.category] ?? '#ff4d4d'
  const animRef           = useRef(null)
  // Stores a data-update callback that Effect 1 will call once layers exist
  const pendingUpdateRef  = useRef(null)

  // ── Effect 1: Create layers once per map instance ──────────────
  // Only re-runs when mainMap changes (not on storm switches).
  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()
    if (!map) return

    const init = () => {
      if (map.getSource('h-path')) return  // already exists
      try {
        map.addSource('h-path', { type: 'geojson', data: EMPTY_LINE })
        map.addLayer({
          id: 'h-path-line', type: 'line', source: 'h-path',
          paint: {
            'line-color':     '#ff4d4d',
            'line-width':     2.5,
            'line-dasharray': [5, 3],
            'line-opacity':   0.85,
          },
        })
        map.addSource('h-cone', { type: 'geojson', data: EMPTY_CONE })
        map.addLayer({
          id: 'h-cone-fill', type: 'fill', source: 'h-cone',
          paint: { 'fill-color': '#ff4d4d', 'fill-opacity': 0.07 },
        })
        map.addLayer({
          id: 'h-cone-outline', type: 'line', source: 'h-cone',
          paint: {
            'line-color':     '#ff4d4d',
            'line-width':     1,
            'line-opacity':   0.35,
            'line-dasharray': [3, 4],
          },
        })
        // Apply any data update that Effect 2 queued while waiting for layers
        if (pendingUpdateRef.current) {
          pendingUpdateRef.current()
          pendingUpdateRef.current = null
        }
      } catch (e) {
        console.warn('HurricaneLayer init:', e.message)
      }
    }

    // Re-init if sources are lost (e.g. style reload)
    const onStyleData = () => { if (map.isStyleLoaded()) init() }
    map.on('styledata', onStyleData)

    if (map.isStyleLoaded()) init()
    else map.once('load', init)

    return () => {
      map.off('styledata', onStyleData)
      ;['h-path-line', 'h-cone-fill', 'h-cone-outline'].forEach(l => {
        try { if (map.getLayer(l)) map.removeLayer(l) } catch (_) {}
      })
      ;['h-path', 'h-cone'].forEach(s => {
        try { if (map.getSource(s)) map.removeSource(s) } catch (_) {}
      })
    }
  }, [mainMap])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Push new data whenever hurricane changes ─────────
  // Uses setData() only — never touches layer lifecycle.
  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()
    if (!map) return

    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }

    const pts      = buildHurricanePath(hurricane)
    const fullPath = pathToGeoJSON(pts)
    const fullCone = buildCone(fullPath)
    const isCustom = hurricane.id === 'custom'
    const color    = CATEGORY_COLORS[hurricane.category] ?? '#ff4d4d'

    const applyUpdate = () => {
      const pathSrc = map.getSource('h-path')
      const coneSrc = map.getSource('h-cone')
      if (!pathSrc || !coneSrc) return

      try {
        if (map.getLayer('h-path-line'))    map.setPaintProperty('h-path-line',    'line-color', color)
        if (map.getLayer('h-cone-fill'))    map.setPaintProperty('h-cone-fill',    'fill-color', color)
        if (map.getLayer('h-cone-outline')) map.setPaintProperty('h-cone-outline', 'line-color', color)

        if (isCustom) {
          pathSrc.setData(EMPTY_LINE)
          coneSrc.setData(EMPTY_CONE)
          const allCoords = fullPath.geometry.coordinates
          let step = 0
          const animate = () => {
            step = Math.min(step + 2, allCoords.length)
            const coords = allCoords.slice(0, Math.max(step, 2))
            const partial = { ...fullPath, geometry: { type: 'LineString', coordinates: coords } }
            try {
              map.getSource('h-path')?.setData(partial)
              map.getSource('h-cone')?.setData(buildCone(partial))
            } catch (_) {}
            if (step < allCoords.length) animRef.current = requestAnimationFrame(animate)
          }
          animate()
        } else {
          pathSrc.setData(fullPath)
          coneSrc.setData(fullCone)
        }
      } catch (e) {
        console.warn('HurricaneLayer update:', e.message)
      }
    }

    if (map.getSource('h-path')) {
      // Layers already exist — update immediately
      applyUpdate()
    } else {
      // Layers not ready yet — queue the update for Effect 1's init() to pick up
      pendingUpdateRef.current = applyUpdate
    }

    return () => {
      if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
    }
  }, [mainMap, hurricane.id, hurricane.originLng, hurricane.originLat, hurricane.destLng, hurricane.destLat, hurricane.category])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── CAT / wind-speed label ─────────────────────────────────────
  return (
    <Marker
      longitude={hurricanePosition.lng}
      latitude={hurricanePosition.lat}
      anchor="bottom"
      offset={[0, -90]}
    >
      <div style={{
        color:         categoryColor,
        fontSize:      13,
        fontWeight:    700,
        fontFamily:    '"Barlow Condensed", "Segoe UI", sans-serif',
        letterSpacing: '0.08em',
        textShadow:    '0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.9)',
        whiteSpace:    'nowrap',
        pointerEvents: 'none',
        userSelect:    'none',
      }}>
        CAT {hurricane.category} · {hurricane.windSpeed} MPH
      </div>
    </Marker>
  )
}

function buildCone(pathGeoJSON) {
  const coords = pathGeoJSON.geometry.coordinates
  if (!coords?.length || coords.length < 2) return EMPTY_CONE
  const L = [], R = []
  coords.forEach(([lng, lat], i) => {
    const w = 1.3 * (0.12 + (i / coords.length) * 0.88)
    L.push([lng - w, lat - w * 0.32])
    R.push([lng + w, lat + w * 0.32])
  })
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[...L, ...[...R].reverse(), L[0]]] },
    properties: {},
  }
}
