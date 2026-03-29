import { useEffect, useRef } from 'react'
import { useMap } from 'react-map-gl'
import { useSimStore } from '../../store/simulationStore'
import { buildHurricanePath, pathToGeoJSON } from '../../utils/hurricanePath'

const CATEGORY_COLORS = { 1:'#3ddc84', 2:'#ffd166', 3:'#ff8c42', 4:'#ff4d4d', 5:'#cc00ff' }

export default function HurricaneLayer() {
  const { mainMap } = useMap()
  const animFrameRef   = useRef(null)
  const rotationRef    = useRef(0)
  const canvasRef      = useRef(null)
  const readyRef       = useRef(false)
  const hurricaneRef   = useRef(null)   // always holds latest hurricane
  const colorRef       = useRef('#ff4d4d') // always holds latest color

  const hurricane         = useSimStore(s => s.hurricane)
  const hurricanePosition = useSimStore(s => s.hurricanePosition)
  const categoryColor     = CATEGORY_COLORS[hurricane.category] ?? '#ff4d4d'

  // Keep refs current on every render
  hurricaneRef.current = hurricane
  colorRef.current     = categoryColor

  // ── One-time layer setup on map load ─────────────────────────
  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()

    const setup = () => {
      try {
        const emptyLine = { type:'Feature', geometry:{ type:'LineString', coordinates:[] }, properties:{} }
        const emptyPoly = { type:'Feature', geometry:{ type:'Polygon',    coordinates:[[]] }, properties:{} }

        if (!map.getSource('h-path')) {
          map.addSource('h-path', { type:'geojson', data: emptyLine })
          map.addLayer({ id:'h-path-line', type:'line', source:'h-path',
            paint:{ 'line-color':'#ff4d4d', 'line-width':2.5, 'line-dasharray':[5,4], 'line-opacity':0.7 }
          })
        }
        if (!map.getSource('h-cone')) {
          map.addSource('h-cone', { type:'geojson', data: emptyPoly })
          map.addLayer({ id:'h-cone-fill', type:'fill', source:'h-cone',
            paint:{ 'fill-color':'#ff4d4d', 'fill-opacity':0.08 }
          }, 'h-path-line')
        }
        readyRef.current = true

        // draw with latest hurricane data (via ref, not stale closure)
        updateLayers(map, hurricaneRef.current, colorRef.current)
      } catch(e) { console.warn('HurricaneLayer setup:', e.message) }
    }

    // 'styledata' fires as soon as the style JSON is parsed in mapbox-gl v3,
    // which is earlier and more reliable than 'load' for adding custom layers.
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
        ['h-path-line','h-cone-fill'].forEach(l => { if(map.getLayer(l)) map.removeLayer(l) })
        ['h-path','h-cone'].forEach(s => { if(map.getSource(s)) map.removeSource(s) })
      } catch(_) {}
    }
  }, [mainMap])

  // ── Update path whenever hurricane preset/params change ───────
  useEffect(() => {
    if (!mainMap || !readyRef.current) return
    const map = mainMap.getMap()
    updateLayers(map, hurricaneRef.current, colorRef.current)
  }, [hurricane.originLng, hurricane.originLat, hurricane.destLng, hurricane.destLat, hurricane.category, hurricane.windSpeed])

  // ── Canvas spiral — mount once ────────────────────────────────
  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()

    const setupCanvas = () => {
      const container = map.getCanvasContainer()
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:5;'
      canvasRef.current = canvas
      container.appendChild(canvas)

      const resize = () => { canvas.width = container.offsetWidth; canvas.height = container.offsetHeight }
      resize()
      map.on('resize', resize)

      const draw = () => {
        const pos   = canvas._pos      ?? { lng:-82.4572, lat:27.9506 }
        const color = canvas._color    ?? '#ff4d4d'
        const cat   = canvas._cat      ?? 4
        const wind  = canvas._wind     ?? 150

        const { x:ex, y:ey } = map.project([pos.lng, pos.lat])
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        rotationRef.current += 1.2
        const rot  = rotationRef.current * Math.PI / 180
        const BASE = 80

        // Rain bands
        for (let b = 7; b >= 1; b--) {
          const r = BASE + b * 28
          ctx.save(); ctx.translate(ex, ey); ctx.rotate(rot + b * 0.55)
          const g = ctx.createRadialGradient(0,0,r*0.3,0,0,r)
          g.addColorStop(0,   `rgba(210,235,255,${0.05 + b*0.015})`)
          g.addColorStop(0.6, `rgba(190,225,255,${0.03 + b*0.01})`)
          g.addColorStop(1,   'rgba(160,210,255,0)')
          ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*1.65)
          ctx.strokeStyle=g; ctx.lineWidth=b*6; ctx.lineCap='round'; ctx.stroke()
          ctx.restore()
        }

        // 3 spiral arms
        for (let arm = 0; arm < 3; arm++) {
          ctx.save(); ctx.translate(ex, ey); ctx.rotate(rot + (arm * Math.PI * 2) / 3)
          const sg = ctx.createLinearGradient(0,0,BASE*0.9,BASE*0.9)
          sg.addColorStop(0,   'rgba(255,255,255,0.75)')
          sg.addColorStop(0.5, 'rgba(220,240,255,0.4)')
          sg.addColorStop(1,   'rgba(180,215,255,0)')
          ctx.beginPath()
          for (let t=0; t<=1; t+=0.018) {
            const a = t*Math.PI*2.6, r = BASE*0.08 + t*BASE*0.78
            t===0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r)
          }
          ctx.strokeStyle=sg; ctx.lineWidth=3.5; ctx.globalAlpha=0.8; ctx.stroke()
          ctx.restore()
        }

        // Eye wall ring
        ctx.save(); ctx.translate(ex,ey)
        ctx.beginPath(); ctx.arc(0,0,28,0,Math.PI*2)
        ctx.strokeStyle='rgba(255,255,255,0.92)'; ctx.lineWidth=4; ctx.stroke()
        ctx.restore()

        // Eye dark center
        ctx.save(); ctx.translate(ex,ey)
        const eg = ctx.createRadialGradient(0,0,0,0,0,14)
        eg.addColorStop(0,'rgba(7,11,20,0.95)'); eg.addColorStop(1,'rgba(7,11,20,0)')
        ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fillStyle=eg; ctx.fill()
        ctx.restore()

        // Label
        ctx.save(); ctx.translate(ex, ey-48)
        ctx.font='bold 11px "Barlow Condensed",sans-serif'
        ctx.fillStyle=color; ctx.textAlign='center'; ctx.globalAlpha=0.95
        ctx.fillText(`CAT ${cat}  ·  ${wind} MPH`, 0, 0)
        ctx.restore()

        animFrameRef.current = requestAnimationFrame(draw)
      }

      animFrameRef.current = requestAnimationFrame(draw)
      canvas._stop = () => { map.off('resize',resize); canvas.parentNode?.removeChild(canvas) }
    }

    if (map.isStyleLoaded()) setupCanvas()
    else map.once('load', setupCanvas)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      canvasRef.current?._stop?.()
    }
  }, [mainMap])

  // Sync live values to canvas every render
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current._pos   = hurricanePosition
      canvasRef.current._color = categoryColor
      canvasRef.current._cat   = hurricane.category
      canvasRef.current._wind  = hurricane.windSpeed
    }
  })

  return null
}

function updateLayers(map, hurricane, color) {
  try {
    const pts  = buildHurricanePath(hurricane)
    const path = pathToGeoJSON(pts)
    const cone = buildCone(path)

    map.getSource('h-path')?.setData(path)
    map.getSource('h-cone')?.setData(cone)

    if (map.getLayer('h-path-line')) map.setPaintProperty('h-path-line','line-color', color)
    if (map.getLayer('h-cone-fill')) map.setPaintProperty('h-cone-fill','fill-color', color)
  } catch(e) { console.warn('updateLayers:', e.message) }
}

function buildCone(pathGeoJSON) {
  const coords = pathGeoJSON.geometry.coordinates
  if (!coords?.length) return { type:'Feature', geometry:{ type:'Polygon', coordinates:[[]] }, properties:{} }
  const L=[], R=[]
  coords.forEach(([lng,lat],i) => {
    const w = 1.2 * (0.15 + (i/coords.length)*0.85)
    L.push([lng-w, lat-w*0.35])
    R.push([lng+w, lat+w*0.35])
  })
  return { type:'Feature', geometry:{ type:'Polygon', coordinates:[[...L,...R.reverse(),L[0]]] }, properties:{} }
}