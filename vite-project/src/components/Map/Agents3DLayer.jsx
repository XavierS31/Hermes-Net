import { useEffect, useRef } from 'react'
import { useMap } from 'react-map-gl'
import { useSimStore } from '../../store/simulationStore'

// Extrusion height (metres) by demographic type
const HEIGHT_BY_TYPE = { disabled: 14, elderly: 12, child: 8, family: 10, adult: 9 }

// Small octagon radius in degrees (~18 m at Tampa latitude)
const R = 0.00016

function agentToFeature(agent) {
  const n = 8
  const coords = Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [
      agent.position.lng + R * Math.cos(a),
      agent.position.lat + R * Math.sin(a),
    ]
  })

  const color =
    agent.status === 'stranded'  ? '#ff4d4d' :
    agent.status === 'arrived'   ? '#3ddc84' :
    agent.color

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {
      color,
      height: HEIGHT_BY_TYPE[agent.type] ?? 9,
    },
  }
}

export default function Agents3DLayer() {
  const { mainMap } = useMap()
  const agents      = useSimStore(s => s.agents)
  const readyRef    = useRef(false)

  // ── Create source + layer once ─────────────────────────────────
  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()

    const setup = () => {
      try {
        if (!map.getSource('agents-3d')) {
          map.addSource('agents-3d', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          })
          map.addLayer({
            id:     'agents-3d-extrude',
            type:   'fill-extrusion',
            source: 'agents-3d',
            paint: {
              'fill-extrusion-color':   ['get', 'color'],
              'fill-extrusion-height':  ['get', 'height'],
              'fill-extrusion-base':    0,
              'fill-extrusion-opacity': 0.9,
            },
          })
        }
        readyRef.current = true
      } catch (e) {
        console.warn('Agents3DLayer:', e.message)
      }
    }

    const onStyleData = () => {
      if (map.isStyleLoaded() && !readyRef.current) setup()
    }
    map.on('styledata', onStyleData)
    if (map.isStyleLoaded()) setup()
    else map.once('load', setup)

    return () => {
      readyRef.current = false
      map.off('styledata', onStyleData)
      try {
        if (map.getLayer('agents-3d-extrude')) map.removeLayer('agents-3d-extrude')
        if (map.getSource('agents-3d'))        map.removeSource('agents-3d')
      } catch (_) {}
    }
  }, [mainMap])

  // ── Push updated positions every time agents move ──────────────
  useEffect(() => {
    if (!mainMap || !readyRef.current || agents.length === 0) return
    try {
      const data = {
        type: 'FeatureCollection',
        features: agents.map(agentToFeature),
      }
      mainMap.getMap().getSource('agents-3d')?.setData(data)
    } catch (_) {}
  }, [agents, mainMap])

  return null
}
