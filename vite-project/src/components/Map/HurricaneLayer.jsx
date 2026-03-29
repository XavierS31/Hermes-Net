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

export default function HurricaneLayer() {
  const { mainMap }       = useMap()
  const hurricane         = useSimStore(s => s.hurricane)
  const hurricanePosition = useSimStore(s => s.hurricanePosition)
  const categoryColor     = CATEGORY_COLORS[hurricane.category] ?? '#ff4d4d'
  const readyRef          = useRef(false)

  // ── Add forecast track + cone once, update when hurricane changes ─
  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()
    if (!map) return

    const pts      = buildHurricanePath(hurricane)
    const path     = pathToGeoJSON(pts)
    const cone     = buildCone(path)

    const setup = () => {
      try {
        // clean up any existing layers/sources first
        ;['h-path-line', 'h-cone-fill', 'h-cone-outline'].forEach(l => {
          try { if (map.getLayer(l)) map.removeLayer(l) } catch (_) {}
        })
        ;['h-path', 'h-cone'].forEach(s => {
          try { if (map.getSource(s)) map.removeSource(s) } catch (_) {}
        })

        map.addSource('h-path', { type: 'geojson', data: path })
        map.addLayer({
          id: 'h-path-line', type: 'line', source: 'h-path',
          paint: {
            'line-color':     categoryColor,
            'line-width':     2.5,
            'line-dasharray': [5, 3],
            'line-opacity':   0.85,
          },
        })

        map.addSource('h-cone', { type: 'geojson', data: cone })
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
        readyRef.current = true
      } catch (e) {
        console.warn('HurricaneLayer:', e.message)
      }
    }

    const onStyleData = () => { if (map.isStyleLoaded()) { readyRef.current = false; setup() } }
    map.on('styledata', onStyleData)
    if (map.isStyleLoaded()) setup()
    else map.once('load', setup)

    return () => {
      readyRef.current = false
      map.off('styledata', onStyleData)
      ;['h-path-line', 'h-cone-fill', 'h-cone-outline'].forEach(l => {
        try { if (map.getLayer(l)) map.removeLayer(l) } catch (_) {}
      })
      ;['h-path', 'h-cone'].forEach(s => {
        try { if (map.getSource(s)) map.removeSource(s) } catch (_) {}
      })
    }
  }, [mainMap, hurricane.originLng, hurricane.originLat, hurricane.destLng, hurricane.destLat, hurricane.category])  // eslint-disable-line react-hooks/exhaustive-deps

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
  if (!coords?.length) {
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} }
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
