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

  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()
    if (!map) return

    const pts      = buildHurricanePath(hurricane)
    const fullPath = pathToGeoJSON(pts)
    const fullCone = buildCone(fullPath)
    const isCustom = hurricane.id === 'custom'

    // Cancel any running path animation
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }

    const runAnimation = () => {
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
    }

    const setup = () => {
      try {
        const sourcesExist = !!map.getSource('h-path')

        if (!sourcesExist) {
          // ── First-time initialization ──────────────────────────
          map.addSource('h-path', { type: 'geojson', data: isCustom ? EMPTY_LINE : fullPath })
          map.addLayer({
            id: 'h-path-line', type: 'line', source: 'h-path',
            paint: {
              'line-color':     categoryColor,
              'line-width':     2.5,
              'line-dasharray': [5, 3],
              'line-opacity':   0.85,
            },
          })
          map.addSource('h-cone', { type: 'geojson', data: isCustom ? EMPTY_CONE : fullCone })
          map.addLayer({
            id: 'h-cone-fill', type: 'fill', source: 'h-cone',
            paint: { 'fill-color': categoryColor, 'fill-opacity': 0.07 },
          })
          map.addLayer({
            id: 'h-cone-outline', type: 'line', source: 'h-cone',
            paint: {
              'line-color':     categoryColor,
              'line-width':     1,
              'line-opacity':   0.35,
              'line-dasharray': [3, 4],
            },
          })
        } else {
          // ── Update in place — no remove/re-add needed ──────────
          map.setPaintProperty('h-path-line',   'line-color', categoryColor)
          map.setPaintProperty('h-cone-fill',   'fill-color', categoryColor)
          map.setPaintProperty('h-cone-outline', 'line-color', categoryColor)

          if (isCustom) {
            map.getSource('h-path').setData(EMPTY_LINE)
            map.getSource('h-cone').setData(EMPTY_CONE)
          } else {
            map.getSource('h-path').setData(fullPath)
            map.getSource('h-cone').setData(fullCone)
          }
        }

        // Animate custom path drawing
        if (isCustom) runAnimation()
      } catch (e) {
        console.warn('HurricaneLayer:', e.message)
      }
    }

    // Only re-run setup via styledata if sources were lost (e.g. style reload)
    const onStyleData = () => {
      if (map.isStyleLoaded() && !map.getSource('h-path')) setup()
    }

    map.on('styledata', onStyleData)
    if (map.isStyleLoaded()) setup()
    else map.once('load', setup)

    return () => {
      if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
      map.off('styledata', onStyleData)
      ;['h-path-line', 'h-cone-fill', 'h-cone-outline'].forEach(l => {
        try { if (map.getLayer(l)) map.removeLayer(l) } catch (_) {}
      })
      ;['h-path', 'h-cone'].forEach(s => {
        try { if (map.getSource(s)) map.removeSource(s) } catch (_) {}
      })
    }
  }, [mainMap, hurricane.id, hurricane.originLng, hurricane.originLat, hurricane.destLng, hurricane.destLat, hurricane.category])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Minimal text label ─────────────────────────────────────────
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
  if (!coords?.length || coords.length < 2) {
    return EMPTY_CONE
  }
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
