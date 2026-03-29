import { useEffect, useMemo, useRef, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, PathLayer, PolygonLayer } from '@deck.gl/layers'
import Map, { type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import type { SimState, Resident } from '../types'
import type { HurricaneOrigin } from '../lib/geo'
import {
  agentFill,
  SURGE_POLYGONS,
  circlePolygon,
} from '../lib/geo'
import { getForecastPathLngLat, getObservedTrackLngLat } from '../lib/forecastPaths'
import { useRoutes } from '../hooks/useRoutes'
import { useGeography } from '../hooks/useGeography'
import { HurricaneThreeOverlay } from './HurricaneThreeOverlay'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

const INITIAL_VIEW: MapViewState = {
  longitude: -82.52,
  latitude: 27.80,
  zoom: 10.0,
  pitch: 50,
  bearing: -18,
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

interface HoverInfo {
  x: number
  y: number
  object: Resident
}

interface Props {
  state: SimState | null
  origin: HurricaneOrigin
  onAgentHover: (info: HoverInfo | null) => void
}

export function TampaMap({ state, origin, onAgentHover }: Props) {
  const mapRef = useRef<MapRef>(null)
  const geo = useGeography()
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW)

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

  const pulse = Math.sin(animTime * Math.PI)
  const routes = useRoutes(state)
  const alert = state?.alert_level ?? 'monitor'

  const forecastPath = useMemo(
    () => getForecastPathLngLat(state, origin),
    [state, state?.forecast_snapshot, origin],
  )
  const observedPath = useMemo(() => getObservedTrackLngLat(state), [state])

  const shelterZones = useMemo(() => {
    const pts = geo?.shelter_points
    if (pts && pts.length > 0) {
      return pts.map((z) => ({
        id: z.id,
        lng: z.lng,
        lat: z.lat,
        polygon: circlePolygon(z.lng, z.lat, 0.092),
      }))
    }
    return [
      { id: 'north', lng: -82.6862, lat: 28.3512, polygon: circlePolygon(-82.6862, 28.3512, 0.092) },
      { id: 'northeast', lng: -82.1543, lat: 28.1012, polygon: circlePolygon(-82.1543, 28.1012, 0.092) },
      { id: 'east', lng: -81.9123, lat: 27.9512, polygon: circlePolygon(-81.9123, 27.9512, 0.092) },
    ]
  }, [geo])

  const bridgePoints = useMemo(() => {
    const b = geo?.bridge_points
    if (b && b.length > 0) return b
    return [
      { id: 'gandy', lng: -82.5618, lat: 27.9089 },
      { id: 'howard_frankland', lng: -82.596, lat: 27.9342 },
      { id: 'sunshine_skyway', lng: -82.6548, lat: 27.6203 },
    ]
  }, [geo])

  const surgeLayer = useMemo(
    () =>
      new PolygonLayer({
        id: 'surge',
        data: SURGE_POLYGONS,
        extruded: false,
        getPolygon: (d) => d.polygon,
        getFillColor: [0, 180, 255, 28],
        getLineColor: [0, 180, 255, 80],
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
      }),
    [],
  )

  const safeZoneLayer = useMemo(
    () =>
      new PolygonLayer({
        id: 'safe-zones',
        data: shelterZones,
        getPolygon: (d) => d.polygon,
        getFillColor: [16, 185, 129, 130],
        getLineColor: [52, 211, 153, 255],
        lineWidthMinPixels: 4,
        stroked: true,
        filled: true,
      }),
    [shelterZones],
  )

  const safeZoneDots = useMemo(
    () =>
      new ScatterplotLayer({
        id: 'safe-zone-dots',
        data: shelterZones,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 3200,
        getFillColor: [34, 197, 94, 235],
        getLineColor: [187, 247, 208, 255],
        lineWidthMinPixels: 3,
        stroked: true,
        radiusUnits: 'meters',
      }),
    [shelterZones],
  )

  const coneBand = useMemo(
    () =>
      new PathLayer({
        id: 'hurricane-cone',
        data: [{ path: forecastPath }],
        getPath: (d) => d.path,
        getColor: [245, 158, 11, 28],
        getWidth: 78,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
      }),
    [forecastPath],
  )

  const trackLine = useMemo(
    () =>
      new PathLayer({
        id: 'hurricane-track',
        data: [{ path: forecastPath }],
        getPath: (d) => d.path,
        getColor: [251, 191, 36, 200],
        getWidth: 3,
        widthMinPixels: 3,
      }),
    [forecastPath],
  )

  const observedTrackLayer = useMemo(() => {
    if (observedPath.length < 2) return null
    return new PathLayer({
      id: 'observed-track',
      data: [{ path: observedPath }],
      getPath: (d) => d.path,
      getColor: [239, 68, 68, 220],
      getWidth: 4,
      widthMinPixels: 2,
      capRounded: true,
      jointRounded: true,
    })
  }, [observedPath])

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
      getPath: (d) => d.path,
      getColor: [34, 211, 238, 70],
      getWidth: 4,
      widthMinPixels: 2,
    })
  }, [state?.residents, state?.shelters, routes])

  const bridgeLayer = useMemo(
    () =>
      new ScatterplotLayer({
        id: 'bridges',
        data: bridgePoints,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 420,
        getFillColor: [100, 116, 139, 100],
        getLineColor: [148, 163, 184, 220],
        lineWidthMinPixels: 2,
        stroked: true,
        radiusUnits: 'meters',
      }),
    [bridgePoints],
  )

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
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) =>
        d.status === 'evacuating' ? 550 + 80 * p : d.status === 'safe' ? 420 : 500 + 40 * p,
      getFillColor: (d) => agentFill(d.status, alert, false),
      getLineColor: (d) =>
        d.status === 'evacuating'
          ? [34, 211, 238, 180 + Math.round(60 * p)]
          : d.status === 'safe'
            ? [16, 185, 129, 200]
            : [148, 163, 184, 100],
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
        getRadius: [pulse],
        getLineColor: [pulse],
      },
    })
  }, [state?.residents, alert, onAgentHover, routes, pulse])

  const layers = [
    surgeLayer,
    safeZoneLayer,
    safeZoneDots,
    coneBand,
    trackLine,
    observedTrackLayer,
    routeLayer,
    bridgeLayer,
    agentLayer,
  ].filter(Boolean)

  if (!MAPBOX_TOKEN) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#4B5563',
          fontFamily: 'Space Mono',
          fontSize: 13,
        }}
      >
        Set VITE_MAPBOX_TOKEN in frontend/.env
      </div>
    )
  }

  const h = state?.hurricane
  const r34 = h?.r34_nm ?? 90
  const bearing = h?.bearing_deg ?? 0

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as MapViewState)}
        controller
        layers={layers}
        style={{ width: '100%', height: '100%' }}
        getCursor={() => 'crosshair'}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/outdoors-v12"
        />
      </DeckGL>
      {h && (
        <HurricaneThreeOverlay
          mapRef={mapRef}
          lng={h.lng}
          lat={h.lat}
          windSpeed={h.wind_speed}
          category={h.category}
          r34Nm={r34}
          bearingDeg={bearing}
        />
      )}
    </div>
  )
}

function isResident(obj: unknown): obj is Resident {
  return typeof obj === 'object' && obj !== null && 'zone' in obj && 'status' in obj
}
