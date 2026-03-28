import { useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { TripsLayer } from '@deck.gl/geo-layers'
import { IconLayer, PathLayer, PolygonLayer } from '@deck.gl/layers'
import Map from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MapMouseEvent, ViewState } from 'react-map-gl/mapbox'
import type { PickingInfo } from '@deck.gl/core'
import { useC2 } from '../../context/C2Context'
import { tripColor, type TripDatum } from '../../data/simulationTypes'
import { createBridgeIconAtlas } from '../../lib/bridgeIconAtlas'

const MAP_STYLE =
  (import.meta.env.VITE_MAPBOX_STYLE as string | undefined) ??
  'mapbox://styles/mapbox/satellite-streets-v12'

const INITIAL_VIEW: ViewState = {
  longitude: -82.45,
  latitude: 27.92,
  zoom: 9.4,
  pitch: 48,
  bearing: -18,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
}

type SentinelDeckMapProps = {
  className?: string
}

export function SentinelDeckMap({ className }: SentinelDeckMapProps) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined
  const {
    tick,
    currentTime,
    trips,
    bridges,
    environmentState,
    highlightedAgentIds,
    setHoverBridgeId,
    drillZone,
    appendLog,
  } = useC2()

  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW)
  const [atlas, setAtlas] = useState<ReturnType<
    typeof createBridgeIconAtlas
  > | null>(null)

  useEffect(() => {
    setAtlas(createBridgeIconAtlas())
  }, [])

  useEffect(() => {
    setViewState((v: ViewState) => ({
      ...v,
      bearing: -18 + tick * 4,
      pitch: 44 + tick * 1.1,
      zoom: 9.2 + tick * 0.04,
    }))
  }, [tick])

  const hurricaneMain = environmentState?.hurricane_main ?? []
  const hurricaneGhost = environmentState?.hurricane_ghost ?? []
  const surge = environmentState?.surge_polygons ?? []

  const layers = useMemo(() => {
    const tripLayer = new TripsLayer<TripDatum>({
      id: 'resident-trips',
      data: trips,
      getPath: (d) => d.path,
      getTimestamps: (d) => d.timestamps,
      getColor: (d) => {
        const c = tripColor(d.status)
        if (highlightedAgentIds && !highlightedAgentIds.has(d.id)) {
          return [c[0], c[1], c[2], 28] as [number, number, number, number]
        }
        return c
      },
      getWidth: (d) => (d.status === 'stuck' ? 4 : 2.5),
      widthUnits: 'pixels',
      capRounded: true,
      jointRounded: true,
      trailLength: 5,
      currentTime,
      fadeTrail: true,
      updateTriggers: {
        getColor: [highlightedAgentIds, trips],
      },
    })

    const coneOuter =
      hurricaneMain.length > 0
        ? new PathLayer<{ path: [number, number][] }>({
            id: 'hurricane-cone-outer',
            data: [{ path: hurricaneMain }],
            getPath: (d) => d.path,
            getColor: [0, 245, 255, 55],
            getWidth: 62,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
          })
        : null

    const coneInner =
      hurricaneMain.length > 0
        ? new PathLayer<{ path: [number, number][] }>({
            id: 'hurricane-cone-inner',
            data: [{ path: hurricaneMain }],
            getPath: (d) => d.path,
            getColor: [0, 245, 255, 200],
            getWidth: 6,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
          })
        : null

    const ghostTrack =
      hurricaneGhost.length > 0
        ? new PathLayer<{ path: [number, number][] }>({
            id: 'hurricane-ghost',
            data: [{ path: hurricaneGhost }],
            getPath: (d) => d.path,
            getColor: [255, 191, 0, 160],
            getWidth: 3,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
          })
        : null

    const surgeLayer =
      surge.length > 0
        ? new PolygonLayer<{
            polygon: [number, number][]
            height_ft: number
          }>({
            id: 'surge-extrusion',
            data: surge,
            extruded: true,
            wireframe: false,
            getPolygon: (d) => d.polygon,
            getElevation: (d) => d.height_ft * 0.3048,
            getFillColor: [0, 245, 255, 165],
            material: {
              ambient: 0.35,
              diffuse: 0.65,
              shininess: 32,
              specularColor: [0, 180, 255],
            },
          })
        : null

    const bridgeIconLayer =
      atlas?.url && bridges.length > 0
        ? new IconLayer<{
            id: string
            name: string
            position: [number, number]
            wind_mph: number
          }>({
            id: 'infrastructure-bridges',
            data: bridges,
            pickable: true,
            sizeUnits: 'pixels',
            iconAtlas: atlas.url,
            iconMapping: atlas.mapping,
            getIcon: (d) => (d.wind_mph > 45 ? 'closed' : 'bridge'),
            getPosition: (d) => d.position,
            getSize: 44,
            getColor: (d) =>
              d.wind_mph > 45 ? [255, 0, 51, 255] : [0, 245, 255, 255],
          })
        : null

    return [
      ...(surgeLayer ? [surgeLayer] : []),
      ...(coneOuter ? [coneOuter] : []),
      ...(coneInner ? [coneInner] : []),
      ...(ghostTrack ? [ghostTrack] : []),
      tripLayer,
      ...(bridgeIconLayer ? [bridgeIconLayer] : []),
    ]
  }, [
    trips,
    hurricaneMain,
    hurricaneGhost,
    surge,
    bridges,
    currentTime,
    highlightedAgentIds,
    tick,
    atlas,
  ])

  const onHover = (info: PickingInfo) => {
    if (info.layer?.id === 'infrastructure-bridges' && info.object) {
      const o = info.object as { id: string }
      setHoverBridgeId(o.id)
    } else {
      setHoverBridgeId(null)
    }
  }

  const onDeckClick = (info: PickingInfo) => {
    if (info.layer?.id === 'infrastructure-bridges' && info.object) {
      const o = info.object as { name: string; wind_mph: number }
      appendLog(
        'alert',
        `BRIDGE · ${o.name} · wind ${o.wind_mph} mph — closure check`,
      )
      return true
    }
    return false
  }

  const onMapClick = (e: MapMouseEvent) => {
    const lng = e.lngLat.lng
    const lat = e.lngLat.lat
    const pad = 0.06
    drillZone({
      minLon: lng - pad,
      maxLon: lng + pad,
      minLat: lat - pad,
      maxLat: lat + pad,
    })
    appendLog(
      'rpc',
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'zone.drill',
        params: { lng, lat, pad },
        id: `hud-${Date.now()}`,
      }),
    )
  }

  if (!token) {
    return (
      <div
        className={`flex items-center justify-center bg-[#0B0B0C] text-sm text-zinc-500 ${className ?? ''}`}
      >
        Set VITE_MAPBOX_ACCESS_TOKEN
      </div>
    )
  }

  return (
    <div className={`relative min-h-0 flex-1 ${className ?? ''}`}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) =>
          setViewState(vs as ViewState)
        }
        controller
        layers={layers}
        onHover={onHover}
        onClick={onDeckClick}
        style={{ width: '100%', height: '100%' }}
      >
        <Map
          mapboxAccessToken={token}
          mapStyle={MAP_STYLE}
          onClick={onMapClick}
        />
      </DeckGL>
    </div>
  )
}
