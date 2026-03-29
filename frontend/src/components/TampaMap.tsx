import { useEffect, useMemo, useRef, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, PathLayer, PolygonLayer } from '@deck.gl/layers'
import Map from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import type { SimState, Resident } from '../types'
import type { HurricaneOrigin } from '../lib/geo'
import {
  agentFill,
  HURRICANE_PATHS,
  SURGE_POLYGONS,
  circlePolygon,
} from '../lib/geo'
import { useRoutes } from '../hooks/useRoutes'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

const INITIAL_VIEW: MapViewState = {
  longitude: -82.52,
  latitude:  27.80,
  zoom:      10.0,
  pitch:     50,
  bearing:   -18,
}

const SAFE_ZONES = [
  { id: 'north',     lng: -82.6862, lat: 28.3512 },
  { id: 'northeast', lng: -82.1543, lat: 28.1012 },
  { id: 'east',      lng: -81.9123, lat: 27.9512 },
]

const BRIDGE_POINTS = [
  { id: 'gandy',            lng: -82.5618, lat: 27.9089 },
  { id: 'howard_frankland', lng: -82.5960, lat: 27.9342 },
  { id: 'sunshine_skyway',  lng: -82.6548, lat: 27.6203 },
]

// ── Hurricane geometry helpers ───────────────────────────────────────────────

/** Ring polygon (donut) — outer ring + reversed inner ring as a hole */
function ringPolygon(
  lng: number, lat: number,
  innerDeg: number, outerDeg: number,
  points = 48,
): [number, number][][] {
  const outer: [number, number][] = []
  const inner: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * 2 * Math.PI
    outer.push([lng + outerDeg * Math.cos(a), lat + outerDeg * Math.sin(a)])
  }
  for (let i = points; i >= 0; i--) {
    const a = (i / points) * 2 * Math.PI
    inner.push([lng + innerDeg * Math.cos(a), lat + innerDeg * Math.sin(a)])
  }
  return [outer, inner]
}

/**
 * One spiral rain band.  startAngle drives rotation so we can animate.
 * CCW (northern hemisphere): angle increases outward.
 */
function spiralPath(
  lng: number, lat: number,
  startAngle: number,
  points = 90,
): [number, number][] {
  const path: [number, number][] = []
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const r = 0.06 + t * 0.36
    const angle = startAngle + t * 2.4 * Math.PI   // 1.2 full turns
    path.push([
      lng + r * Math.cos(angle),
      lat + r * 0.88 * Math.sin(angle),
    ])
  }
  return path
}

/** Walk a polyline and return the [lng,lat] at the given 0–1 progress. */
function positionOnPath(
  path: [number, number][],
  progress: number,
): [number, number] {
  if (path.length === 0) return [0, 0]
  if (path.length === 1 || progress <= 0) return path[0]
  if (progress >= 1) return path[path.length - 1]
  let total = 0
  const segs: number[] = []
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0]
    const dy = path[i][1] - path[i - 1][1]
    const len = Math.sqrt(dx * dx + dy * dy)
    segs.push(len)
    total += len
  }
  let dist = progress * total
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i]) {
      const t = dist / segs[i]
      return [
        path[i][0] + (path[i + 1][0] - path[i][0]) * t,
        path[i][1] + (path[i + 1][1] - path[i][1]) * t,
      ]
    }
    dist -= segs[i]
  }
  return path[path.length - 1]
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface HoverInfo { x: number; y: number; object: Resident }

interface Props {
  state:        SimState | null
  origin:       HurricaneOrigin
  onAgentHover: (info: HoverInfo | null) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TampaMap({ state, origin, onAgentHover }: Props) {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW)

  // Unified animation clock: seconds elapsed.
  // pulse  = smooth oscillation 0→1→0  (2 s period, via sin)
  // rotAngle = ever-increasing angle for spiral rotation
  const [animTime, setAnimTime] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const start = Date.now()
    function tick() {
      setAnimTime((Date.now() - start) / 1000)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const pulse    = Math.sin(animTime * Math.PI)           // –1 → +1, 2 s period
  const rotAngle = animTime * 0.12                        // ~1 full turn per 52 s (slow real-ish)

  const routes = useRoutes(state)

  const alert         = state?.alert_level ?? 'monitor'
  const hurricanePath = HURRICANE_PATHS[origin]

  // ── Storm surge (2-D, semi-transparent) ─────────────────────────────────
  const surgeLayer = useMemo(() => new PolygonLayer({
    id: 'surge',
    data: SURGE_POLYGONS,
    extruded: false,
    getPolygon:   (d) => d.polygon,
    getFillColor: [0, 180, 255, 28],
    getLineColor: [0, 180, 255, 80],
    lineWidthMinPixels: 1,
    stroked: true,
    filled: true,
  }), [])

  // ── Safe zones — darker halos ────────────────────────────────────────────
  const safeZoneLayer = useMemo(() => new PolygonLayer({
    id: 'safe-zones',
    data: SAFE_ZONES.map((z) => ({ ...z, polygon: circlePolygon(z.lng, z.lat, 0.07) })),
    getPolygon:   (d) => d.polygon,
    getFillColor: [16, 185, 129, 70],
    getLineColor: [16, 185, 129, 200],
    lineWidthMinPixels: 2,
    stroked: true,
    filled: true,
  }), [])

  const safeZoneDots = useMemo(() => new ScatterplotLayer({
    id: 'safe-zone-dots',
    data: SAFE_ZONES,
    getPosition:  (d) => [d.lng, d.lat],
    getRadius:    2000,
    getFillColor: [16, 185, 129, 200],
    getLineColor: [16, 185, 129, 255],
    lineWidthMinPixels: 2,
    stroked: true,
    radiusUnits: 'meters',
  }), [])

  // ── Hurricane track cone ─────────────────────────────────────────────────
  const coneBand = useMemo(() => new PathLayer({
    id: 'hurricane-cone',
    data: [{ path: hurricanePath }],
    getPath:  (d) => d.path,
    getColor: [245, 158, 11, 16],
    getWidth: 70,
    widthUnits: 'pixels',
    capRounded: true,
    jointRounded: true,
  }), [hurricanePath])

  const trackLine = useMemo(() => new PathLayer({
    id: 'hurricane-track',
    data: [{ path: hurricanePath }],
    getPath:  (d) => d.path,
    getColor: [245, 158, 11, 120],
    getWidth: 2,
    widthMinPixels: 2,
  }), [hurricanePath])

  // ── 3-D Hurricane structure ───────────────────────────────────────────────
  // Built from extruded ring polygons + animated spiral rain bands.
  // Heights chosen so the eye wall towers visibly when pitch ≈ 50°.
  const hurricaneLayers = useMemo(() => {
    if (!state) return []
    const { lng, lat } = state.hurricane
    const breathe = pulse * 0.004   // ±0.4 ° ring breathing

    type RingDatum = { polygon: [number,number][][]; elevation: number; color: [number,number,number,number] }

    const rings: RingDatum[] = [
      // Outermost rain band — low, wide, near-transparent
      {
        polygon:   ringPolygon(lng, lat, 0.18 + breathe * 0.5, 0.42 + breathe),
        elevation: 3500,
        color:     [140, 170, 210, 35],
      },
      // Middle cloud band
      {
        polygon:   ringPolygon(lng, lat, 0.10 + breathe * 0.3, 0.18 + breathe * 0.5),
        elevation: 9000,
        color:     [180, 150, 90, 55],
      },
      // Inner core band
      {
        polygon:   ringPolygon(lng, lat, 0.055 + breathe * 0.2, 0.10 + breathe * 0.3),
        elevation: 16000,
        color:     [220, 130, 50, 80],
      },
      // Eye wall — tallest, brightest
      {
        polygon:   ringPolygon(lng, lat, 0.038,  0.055 + breathe * 0.2),
        elevation: 26000 + 2000 * pulse,
        color:     [245, 158, 11, 160 + Math.round(40 * pulse)],
      },
      // Eye — calm, lower tower
      {
        polygon:   [circlePolygon(lng, lat, 0.038)],
        elevation: 4000,
        color:     [255, 230, 140, 50],
      },
    ]

    const ringLayer = new PolygonLayer<RingDatum>({
      id: 'hurricane-rings',
      data: rings,
      extruded: true,
      getPolygon:   (d) => d.polygon as unknown as [number,number][],
      getElevation: (d) => d.elevation,
      getFillColor: (d) => d.color,
      material: { ambient: 0.3, diffuse: 0.7, shininess: 40, specularColor: [255, 200, 100] },
      updateTriggers: { getElevation: [pulse], getFillColor: [pulse], getPolygon: [pulse] },
    })

    // 4 animated spiral rain bands
    const spiralData = Array.from({ length: 4 }, (_, i) => ({
      path: spiralPath(lng, lat, rotAngle + i * (Math.PI / 2)),
      opacity: 100 + Math.round(50 * pulse),
    }))

    const spiralLayer = new PathLayer({
      id: 'hurricane-spirals',
      data: spiralData,
      getPath:  (d) => d.path,
      getColor: (d) => [200, 160, 60, d.opacity],
      getWidth: 3,
      widthMinPixels: 2,
      widthMaxPixels: 5,
      capRounded: true,
      jointRounded: true,
      updateTriggers: { getPath: [rotAngle], getColor: [pulse] },
    })

    // Eye core glow — single bright dot
    type EyeDot = { lng: number; lat: number }
    const eyeGlow = new ScatterplotLayer<EyeDot>({
      id: 'eye-glow',
      data: [{ lng, lat }],
      getPosition:  (d) => [d.lng, d.lat],
      getRadius:    3500 + 300 * pulse,
      getFillColor: [255, 230, 140, 180 + Math.round(60 * pulse)],
      getLineColor: [255, 255, 200, 200],
      lineWidthMinPixels: 1.5,
      stroked: true,
      radiusUnits: 'meters',
      updateTriggers: { getRadius: [pulse], getFillColor: [pulse] },
    })

    return [ringLayer, spiralLayer, eyeGlow]
  }, [state?.hurricane.lng, state?.hurricane.lat, pulse, rotAngle])

  // ── Evacuation routes (real roads) ───────────────────────────────────────
  const routeLayer = useMemo(() => {
    if (!state) return null
    const data: { path: [number, number][]; id: number }[] = []
    state.residents
      .filter((r) => r.status === 'evacuating' && r.assigned_shelter)
      .forEach((r) => {
        const road = routes.get(r.id)
        if (road && road.length >= 2) {
          data.push({ path: road, id: r.id })
        } else {
          const s = state.shelters[r.assigned_shelter!]
          if (s) data.push({ path: [[r.lng, r.lat], [s.lng, s.lat]], id: r.id })
        }
      })
    return new PathLayer({
      id: 'evac-routes',
      data,
      getPath:  (d) => d.path,
      getColor: [34, 211, 238, 70],
      getWidth: 4,
      widthMinPixels: 2,
    })
  }, [state?.residents, state?.shelters, routes])

  // ── Bridge markers ────────────────────────────────────────────────────────
  const bridgeLayer = useMemo(() => new ScatterplotLayer({
    id: 'bridges',
    data: BRIDGE_POINTS,
    getPosition:  (d) => [d.lng, d.lat],
    getRadius:    400,
    getFillColor: [100, 116, 139, 80],
    getLineColor: [148, 163, 184, 200],
    lineWidthMinPixels: 1,
    stroked: true,
    radiusUnits: 'meters',
  }), [])

  // ── Agents — road-following + pulsing ────────────────────────────────────
  const agentLayer = useMemo(() => {
    if (!state) return null
    const p = pulse

    const data = state.residents.map((r) => {
      if (r.status === 'evacuating') {
        const road = routes.get(r.id)
        if (road && road.length >= 2) {
          const [lng, lat] = positionOnPath(road, r.progress)
          return { ...r, lng, lat }
        }
      }
      return r
    })

    return new ScatterplotLayer<Resident>({
      id: 'agents',
      data,
      getPosition:  (d) => [d.lng, d.lat],
      getRadius:    (d) =>
        d.status === 'evacuating' ? 550 + 80 * p :
        d.status === 'safe'       ? 420 :
                                    500 + 40 * p,
      getFillColor: (d) => agentFill(d.status, alert, false),
      getLineColor: (d) =>
        d.status === 'evacuating' ? [34, 211, 238, 180 + Math.round(60 * p)] :
        d.status === 'safe'       ? [16, 185, 129, 200] :
                                    [148, 163, 184, 100],
      lineWidthMinPixels: 1.5,
      radiusUnits: 'meters',
      pickable: true,
      onHover: (info: PickingInfo) => {
        if (info.object && isResident(info.object)) {
          onAgentHover({ x: info.x, y: info.y, object: info.object })
        } else {
          onAgentHover(null)
        }
      },
      updateTriggers: {
        getFillColor: [alert],
        getRadius:    [pulse],
        getLineColor: [pulse],
      },
    })
  }, [state?.residents, alert, onAgentHover, routes, pulse])

  const layers = [
    surgeLayer, safeZoneLayer, safeZoneDots,
    coneBand, trackLine,
    ...hurricaneLayers,
    routeLayer, bridgeLayer, agentLayer,
  ].filter(Boolean)

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#4B5563', fontFamily: 'Space Mono', fontSize: 13,
      }}>
        Set VITE_MAPBOX_TOKEN in frontend/.env
      </div>
    )
  }

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: vs }) => setViewState(vs as MapViewState)}
      controller
      layers={layers}
      style={{ width: '100%', height: '100%' }}
      getCursor={() => 'crosshair'}
    >
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
      />
    </DeckGL>
  )
}

function isResident(obj: unknown): obj is Resident {
  return typeof obj === 'object' && obj !== null && 'zone' in obj && 'status' in obj
}
