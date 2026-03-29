/**
 * Hurricane3DLayer — Canvas-inside-Marker approach
 *
 * Uses a react-map-gl <Marker> for positioning (same mechanism as the
 * visible text label — proven to render above the map).
 * A 2-D canvas is rendered inside the Marker; an rAF loop drives rotation.
 * Size is updated imperatively on zoom without triggering React re-renders.
 */
import { useEffect, useRef } from 'react'
import { Marker } from 'react-map-gl'
import { useSimStore } from '../../store/simulationStore'

const CANVAS_MAX = 100   // canvas size in px — hurricane fills this exactly

export default function Hurricane3DLayer() {
  const hurricanePosition = useSimStore(s => s.hurricanePosition)

  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const rotRef    = useRef(0)

  // ── Animation loop ────────────────────────────────────────────
  useEffect(() => {
    let lastTime = performance.now()

    const draw = () => {
      animRef.current = requestAnimationFrame(draw)
      const now = performance.now()
      const dt  = Math.min((now - lastTime) / 1000, 0.05)
      lastTime  = now
      rotRef.current = (rotRef.current + 55 * dt) % 360

      const c = canvasRef.current
      if (!c) return
      try { drawHurricane(c.getContext('2d'), CANVAS_MAX, rotRef.current) } catch (_) {}
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <Marker
      longitude={hurricanePosition.lng}
      latitude={hurricanePosition.lat}
      anchor="center"
      style={{ zIndex: 20 }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_MAX}
        height={CANVAS_MAX}
        style={{
          display:       'block',
          width:         CANVAS_MAX + 'px',
          height:        CANVAS_MAX + 'px',
          pointerEvents: 'none',
        }}
      />
    </Marker>
  )
}

// ── Satellite-style 2-D hurricane renderer ────────────────────────────────────
function drawHurricane(ctx, size, rotDeg) {
  const cx  = size / 2
  const cy  = size / 2
  const R   = size / 2 * 0.90
  const rot = rotDeg * Math.PI / 180

  ctx.clearRect(0, 0, size, size)

  // 1 ── Large atmospheric glow ─────────────────────────────────────
  const atmo = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R)
  atmo.addColorStop(0.00, 'rgba( 10,  18,  40, 0.00)')
  atmo.addColorStop(0.07, 'rgba(220, 238, 255, 0.32)')
  atmo.addColorStop(0.18, 'rgba(200, 228, 255, 0.18)')
  atmo.addColorStop(0.50, 'rgba(165, 210, 250, 0.09)')
  atmo.addColorStop(1.00, 'rgba(130, 190, 242, 0.00)')
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = atmo
  ctx.fill()

  // 2 ── Rain bands (concentric arc strokes, each offset so they spiral) ────
  const bands = [
    { frac: 0.93, width: 0.25, alpha: 0.15 },
    { frac: 0.72, width: 0.20, alpha: 0.24 },
    { frac: 0.52, width: 0.17, alpha: 0.38 },
    { frac: 0.34, width: 0.14, alpha: 0.58 },
    { frac: 0.19, width: 0.11, alpha: 0.80 },
  ]
  bands.forEach(({ frac, width, alpha }, i) => {
    const bR = R * frac
    const bW = R * width
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot + i * 0.55)
    const g = ctx.createRadialGradient(0, 0, bR - bW * 0.6, 0, 0, bR + bW * 0.6)
    g.addColorStop(0.0, `rgba(190, 220, 255,  0)`)
    g.addColorStop(0.3, `rgba(225, 240, 255,  ${alpha})`)
    g.addColorStop(0.5, `rgba(248, 252, 255,  ${Math.min(alpha * 1.6, 1)})`)
    g.addColorStop(0.7, `rgba(225, 240, 255,  ${alpha})`)
    g.addColorStop(1.0, `rgba(190, 220, 255,  0)`)
    ctx.beginPath()
    ctx.arc(0, 0, bR, -Math.PI * 0.3, Math.PI * 1.7)
    ctx.lineWidth   = bW
    ctx.strokeStyle = g
    ctx.stroke()
    ctx.restore()
  })

  // 3 ── Two spiral arms (3 render passes each: halo → glow → core) ─────────
  for (let arm = 0; arm < 2; arm++) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot + arm * Math.PI)

    const passes = [
      { lw: R * 0.11, alpha: 0.10 },   // wide soft halo
      { lw: R * 0.05, alpha: 0.42 },   // medium glow
      { lw: R * 0.018, alpha: 0.90 },  // crisp bright core
    ]

    passes.forEach(({ lw, alpha }) => {
      ctx.beginPath()
      for (let t = 0; t <= 1; t += 0.005) {
        const theta = t * Math.PI * 2.6
        const rad   = R * 0.075 + t * R * 0.855
        const x     = Math.cos(theta) * rad
        const y     = Math.sin(theta) * rad
        t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = `rgba(248, 252, 255, ${alpha})`
      ctx.lineWidth   = lw
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.stroke()
    })

    ctx.restore()
  }

  // 4 ── Eye wall — bright white ring with soft halo ─────────────────────────
  const ewR = R * 0.096
  ctx.save()
  ctx.translate(cx, cy)

  const halo = ctx.createRadialGradient(0, 0, ewR * 0.45, 0, 0, ewR * 1.95)
  halo.addColorStop(0.0, 'rgba(255, 255, 255, 0.00)')
  halo.addColorStop(0.4, 'rgba(255, 255, 255, 0.48)')
  halo.addColorStop(0.6, 'rgba(255, 255, 255, 0.62)')
  halo.addColorStop(1.0, 'rgba(255, 255, 255, 0.00)')
  ctx.beginPath()
  ctx.arc(0, 0, ewR * 1.35, 0, Math.PI * 2)
  ctx.lineWidth   = ewR * 0.9
  ctx.strokeStyle = halo
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(0, 0, ewR, 0, Math.PI * 2)
  ctx.lineWidth   = Math.max(size * 0.0025, 1.5)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.stroke()

  ctx.restore()

  // 5 ── Dark calm eye ────────────────────────────────────────────────────────
  const eyeR = R * 0.062
  ctx.save()
  ctx.translate(cx, cy)
  const eye = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeR)
  eye.addColorStop(0.0, 'rgba( 4,  7, 16, 1.00)')
  eye.addColorStop(0.6, 'rgba( 6, 10, 22, 0.96)')
  eye.addColorStop(1.0, 'rgba( 8, 14, 28, 0.00)')
  ctx.beginPath()
  ctx.arc(0, 0, eyeR, 0, Math.PI * 2)
  ctx.fillStyle = eye
  ctx.fill()
  ctx.restore()
}
