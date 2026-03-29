/**
 * HurricaneLayer — Mapbox GL layers only:
 *   • Dashed forecast track line
 *   • Uncertainty cone (fill + outline)
 *   • CAT / wind-speed label marker
 *
 * The animated hurricane visual is handled by Hurricane3DLayer.
 */
import { useEffect, useRef } from 'react'
<<<<<<< HEAD
import { Source, Layer, useMap } from 'react-map-gl'
import mapboxgl from 'mapbox-gl'
=======
import { useMap, Marker } from 'react-map-gl'
>>>>>>> 40d8313db30ab9bd85728431ffdccc5835d59e5c
import { useSimStore } from '../../store/simulationStore'
import { buildHurricanePath, interpolatePosition } from '../../utils/hurricanePath'

<<<<<<< HEAD
const CATEGORY_COLORS = { 1:'#3ddc84', 2:'#ffd166', 3:'#ff8c42', 4:'#ff4d4d', 5:'#cc00ff' }
const PREVIEW_START  = 0.40
const PREVIEW_END    = 0.95
const FORECAST_AHEAD = 0.13
const TRAIL_STEPS    = 80
const CANVAS_SIZE    = 180
=======
const CATEGORY_COLORS = { 1: '#3ddc84', 2: '#ffd166', 3: '#ff8c42', 4: '#ff4d4d', 5: '#cc00ff' }
>>>>>>> 40d8313db30ab9bd85728431ffdccc5835d59e5c

// ── helpers ────────────────────────────────────────────────────────────────
const emptyLine = () => ({
  type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {}
})
const emptyCollection = () => ({ type: 'FeatureCollection', features: [] })

function buildTrail(pts, t) {
  if (t <= 0.004) return emptyLine()
  const steps = Math.max(2, Math.floor(t * TRAIL_STEPS))
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const pos = interpolatePosition(pts, (i / steps) * t)
    coords.push([pos.lng, pos.lat])
  }
  return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }
}

function buildForecast(pts, t, strands, rot) {
  const forecastEnd = Math.min(t + FORECAST_AHEAD, 1)
  if (forecastEnd <= t + 0.004) return emptyCollection()
  const STEPS = 22
  const features = []

  for (const strand of strands) {
    const start = interpolatePosition(pts, t)
    const coords = [[start.lng, start.lat]]

    for (let i = 1; i <= STEPS; i++) {
      const stepT    = t + (i / STEPS) * (forecastEnd - t)
      const progress = i / STEPS
      const pos  = interpolatePosition(pts, Math.min(stepT, 1))
      const next = interpolatePosition(pts, Math.min(stepT + 0.004, 1))

      // Tangent → perpendicular in geo-space
      const dlng = next.lng - pos.lng
      const dlat = next.lat - pos.lat
      const len  = Math.sqrt(dlng * dlng + dlat * dlat) || 1

      // Offset grows with distance; gentle wobble for organic feel
      const wobble = Math.sin(rot * 0.014 + strand.phase + progress * Math.PI * 2) * 0.04
      const perp   = strand.side * progress * 0.9 + wobble * progress
      coords.push([pos.lng + (-dlat / len) * perp, pos.lat + (dlng / len) * perp])
    }

    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    })
  }
  return { type: 'FeatureCollection', features }
}

function drawSpiral(canvas, color, cat, wind, rotation) {
  const ctx  = canvas.getContext('2d')
  const cx   = canvas.width  / 2
  const cy   = canvas.height / 2
  const BASE = Math.min(cx, cy) * 0.82
  const rot  = rotation * Math.PI / 180

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Rain bands
  for (let b = 7; b >= 1; b--) {
    const r = BASE * 0.22 + b * BASE * 0.11
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot + b * 0.55)
    const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r)
    g.addColorStop(0,   `rgba(210,235,255,${0.05 + b * 0.015})`)
    g.addColorStop(0.6, `rgba(190,225,255,${0.03 + b * 0.01})`)
    g.addColorStop(1,   'rgba(160,210,255,0)')
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 1.65)
    ctx.strokeStyle = g; ctx.lineWidth = b * 5; ctx.lineCap = 'round'; ctx.stroke()
    ctx.restore()
  }

  // Spiral arms
  for (let arm = 0; arm < 3; arm++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot + (arm * Math.PI * 2) / 3)
    const sg = ctx.createLinearGradient(0, 0, BASE * 0.85, BASE * 0.85)
    sg.addColorStop(0,   'rgba(255,255,255,0.78)')
    sg.addColorStop(0.5, 'rgba(220,240,255,0.40)')
    sg.addColorStop(1,   'rgba(180,215,255,0)')
    ctx.beginPath()
    for (let s = 0; s <= 1; s += 0.02) {
      const a = s * Math.PI * 2.6
      const r = BASE * 0.07 + s * BASE * 0.73
      s === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
              : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.strokeStyle = sg; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.82; ctx.stroke()
    ctx.restore()
  }

  // Eye wall ring
  ctx.save(); ctx.translate(cx, cy)
  ctx.beginPath(); ctx.arc(0, 0, BASE * 0.18, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.93)'; ctx.lineWidth = 4; ctx.stroke()
  ctx.restore()

  // Eye dark centre
  ctx.save(); ctx.translate(cx, cy)
  const eg = ctx.createRadialGradient(0, 0, 0, 0, 0, BASE * 0.10)
  eg.addColorStop(0, 'rgba(7,11,20,0.96)'); eg.addColorStop(1, 'rgba(7,11,20,0)')
  ctx.beginPath(); ctx.arc(0, 0, BASE * 0.10, 0, Math.PI * 2)
  ctx.fillStyle = eg; ctx.fill()
  ctx.restore()

  // Label
  ctx.save(); ctx.translate(cx, cy - BASE * 0.34)
  ctx.font = 'bold 11px "Barlow Condensed",monospace'
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.globalAlpha = 0.95
  ctx.fillText(`CAT ${cat}  ·  ${wind} MPH`, 0, 0)
  ctx.restore()
}

// ── component ──────────────────────────────────────────────────────────────
export default function HurricaneLayer() {
<<<<<<< HEAD
  const { mainMap } = useMap()
  const frameRef   = useRef(null)
  const rotRef     = useRef(0)
  const previewRef = useRef(PREVIEW_START)
  const markerRef  = useRef(null)
  const canvasRef  = useRef(null)
  const strandsRef = useRef(null)

  const hurricane = useSimStore(s => s.hurricane)
  const categoryColor = CATEGORY_COLORS[hurricane.category] ?? '#ff4d4d'
  const controlPoints = buildHurricanePath(hurricane)

  // Stable strands — regenerate only when preset changes
  if (!strandsRef.current || strandsRef.current.key !== hurricane.id) {
    strandsRef.current = {
      key: hurricane.id,
      strands: Array.from({ length: 6 }, () => ({
        side:  (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.6),
        alpha: 0.12 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
      })),
    }
  }

  // Reset preview position when preset changes
  useEffect(() => {
    previewRef.current = PREVIEW_START
  }, [hurricane.id])

  // ── main effect: marker + animation loop ────────────────────────────────
=======
  const { mainMap }       = useMap()
  const hurricane         = useSimStore(s => s.hurricane)
  const hurricanePosition = useSimStore(s => s.hurricanePosition)
  const categoryColor     = CATEGORY_COLORS[hurricane.category] ?? '#ff4d4d'
  const readyRef          = useRef(false)

  // ── Add forecast track + cone once, update when hurricane changes ─
>>>>>>> 40d8313db30ab9bd85728431ffdccc5835d59e5c
  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()
    if (!map) return

    const pts      = buildHurricanePath(hurricane)
    const path     = pathToGeoJSON(pts)
    const cone     = buildCone(path)

<<<<<<< HEAD
    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.width  = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    canvas.style.cssText = `width:${CANVAS_SIZE}px;height:${CANVAS_SIZE}px;display:block;pointer-events:none;`
    canvasRef.current = canvas

    // Create Mapbox GL marker (positioned by Mapbox — always visible)
    const marker = new mapboxgl.Marker({ element: canvas, anchor: 'center' })
      .setLngLat([-82.4572, 27.9506])
      .addTo(map)
    markerRef.current = marker

    const pts     = controlPoints
    const strands = strandsRef.current.strands
    const cat     = hurricane.category
    const wind    = hurricane.windSpeed

    const tick = () => {
      // Current t along path
      let t
      const s = useSimStore.getState()
      if (s.status === 'running' || s.status === 'paused' || s.status === 'complete') {
        t = s.hurricaneProgress
      } else {
        previewRef.current += 0.00035
        if (previewRef.current > PREVIEW_END) previewRef.current = PREVIEW_START
        t = previewRef.current
      }

      // Move marker
      const cur = interpolatePosition(pts, Math.min(t, 1))
      marker.setLngLat([cur.lng, cur.lat])

      // Draw spiral
      drawSpiral(canvas, categoryColor, cat, wind, rotRef.current)
      rotRef.current += 1.2

      // Update trail source
      map.getSource('h-trail')?.setData(buildTrail(pts, t))

      // Update forecast source
      map.getSource('h-forecast')?.setData(buildForecast(pts, t, strands, rotRef.current))

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameRef.current)
      marker.remove()
      markerRef.current  = null
      canvasRef.current  = null
    }
  }, [mainMap, hurricane.id])

  return (
    <>
      <Source id="h-trail" type="geojson" data={emptyLine()}>
        <Layer
          id="h-trail-line"
          type="line"
          paint={{
            'line-color':     categoryColor,
            'line-width':     2.5,
            'line-dasharray': [6, 5],
            'line-opacity':   0.55,
          }}
        />
      </Source>
      <Source id="h-forecast" type="geojson" data={emptyCollection()}>
        <Layer
          id="h-forecast-lines"
          type="line"
          paint={{
            'line-color':   'rgb(255,185,55)',
            'line-width':   1.5,
            'line-opacity': 0.30,
          }}
        />
      </Source>
    </>
  )
}
=======
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
>>>>>>> 40d8313db30ab9bd85728431ffdccc5835d59e5c
