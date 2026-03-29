import { useEffect, useRef } from 'react'
import { useMap } from 'react-map-gl'
import { useSimStore } from '../../store/simulationStore'

// Zone tower radius in degrees (~280 m at Tampa latitude)
const ZONE_R = 0.0025

function zonesToGeoJSON(zones, agents) {
  const features = zones.map(zone => {
    const occupants = agents.filter(
      a => a.assignedZoneId === zone.id && a.status === 'arrived'
    ).length

    const fillPct = zone.capacity > 0 ? occupants / zone.capacity : 0
    const color =
      fillPct > 0.8 ? '#ff4d4d' :
      fillPct > 0.5 ? '#ff8c42' :
      '#3ddc84'

    // Tower height grows from 60 m to 220 m
    const height = Math.round(60 + fillPct * 160)

    const n = 16
    const coords = Array.from({ length: n + 1 }, (_, i) => {
      const a = (i / n) * Math.PI * 2
      return [
        zone.lng + ZONE_R * Math.cos(a),
        zone.lat + ZONE_R * Math.sin(a),
      ]
    })

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
      properties: {
        color,
        height,
      },
    }
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}

export default function SafeZones3DLayer() {
  const { mainMap } = useMap()
  const zones = useSimStore(s => s.safeZones)
  const agents = useSimStore(s => s.agents)
  const readyRef = useRef(false)

  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()

    const setup = () => {
      try {
        if (!map.getSource('zones-3d')) {
          map.addSource('zones-3d', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          })

          map.addLayer({
            id: 'zones-3d-extrude',
            type: 'fill-extrusion',
            source: 'zones-3d',
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.72,
            },
          })

          map.addLayer({
            id: 'zones-3d-ring',
            type: 'line',
            source: 'zones-3d',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 2,
              'line-opacity': 0.65,
            },
          })
        }

        readyRef.current = true
      } catch (e) {
        console.warn('SafeZones3DLayer:', e.message)
      }
    }

    const onStyleData = () => {
      if (map.isStyleLoaded() && !readyRef.current) {
        setup()
      }
    }

    map.on('styledata', onStyleData)

    if (map.isStyleLoaded()) setup()
    else map.once('load', setup)

    return () => {
      readyRef.current = false
      map.off('styledata', onStyleData)

      try {
        ;['zones-3d-extrude', 'zones-3d-ring'].forEach(layerId => {
          if (map.getLayer(layerId)) map.removeLayer(layerId)
        })

        if (map.getSource('zones-3d')) map.removeSource('zones-3d')
      } catch (_) {}
    }
  }, [mainMap])

  useEffect(() => {
    if (!mainMap || !readyRef.current) return

    try {
      const source = mainMap.getMap().getSource('zones-3d')
      source?.setData(zonesToGeoJSON(zones, agents))
    } catch (_) {}
  }, [zones, agents, mainMap])

  return null
}