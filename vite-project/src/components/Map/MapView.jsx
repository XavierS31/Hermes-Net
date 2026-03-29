import { useCallback } from 'react'
import Map, { NavigationControl } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useSimStore } from '../../store/simulationStore'
import HurricaneLayer    from './HurricaneLayer'
import Hurricane3DLayer  from './Hurricane3DLayer'
import SafeZoneMarkers   from './SafeZoneMarkers'
import SafeZones3DLayer  from './SafeZones3DLayer'
import AgentMarkers      from './AgentMarkers'
import Agents3DLayer     from './Agents3DLayer'
import EvacRoutes        from './EvacRoutes'
import styles            from './MapView.module.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export default function MapView() {
  const pickingMode           = useSimStore(s => s.pickingMode)
  const setPickingMode        = useSimStore(s => s.setPickingMode)
  const updateHurricaneCustom = useSimStore(s => s.updateHurricaneCustom)

  const handleMapClick = useCallback((e) => {
    if (!pickingMode) return
    const { lng, lat } = e.lngLat
    if (pickingMode === 'origin') {
      updateHurricaneCustom('originLng', lng)
      updateHurricaneCustom('originLat', lat)
    } else if (pickingMode === 'dest') {
      updateHurricaneCustom('destLng', lng)
      updateHurricaneCustom('destLat', lat)
    }
    setPickingMode(null)
  }, [pickingMode])   // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoad = useCallback((e) => {
    const map = e.target

    // Sky / atmosphere layer
    if (!map.getLayer('sky')) {
      map.addLayer({
        id: 'sky', type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      })
    }

    // 3-D buildings
    if (!map.getLayer('buildings-3d')) {
      map.addLayer({
        id: 'buildings-3d', source: 'composite', 'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion', minzoom: 12,
        paint: {
          'fill-extrusion-color': '#131929',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.05, ['get', 'height']],
          'fill-extrusion-base':   ['interpolate', ['linear'], ['zoom'], 12, 0, 12.05, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.85,
        },
      })
    }
  }, [])

  return (
    <div className={`${styles.mapWrap} ${pickingMode ? styles.picking : ''}`}>
      {pickingMode && (
        <div className={styles.pickHint}>
          Click map to set {pickingMode === 'origin' ? 'hurricane origin' : 'destination'}
        </div>
      )}
      <div className={styles.viewHint}>
        Right-click drag to rotate · Scroll to zoom · Ctrl+drag to pitch
      </div>

      <Map
        id="mainMap"
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: -81.8,
          latitude:   26.0,   // midpoint between hurricane origin (24.2) and Tampa (27.9)
          zoom:        6,
          pitch:      30,
          bearing:   -10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onClick={handleMapClick}
        cursor={pickingMode ? 'crosshair' : 'grab'}
        maxPitch={85}
        onLoad={handleLoad}
      >
        <NavigationControl position="bottom-right" visualizePitch={true} />

        <EvacRoutes />
        <SafeZones3DLayer />
        <SafeZoneMarkers />
        <Agents3DLayer />
        <AgentMarkers />
        {/* Hurricane3DLayer: Three.js particle vortex (CSS-positioned canvas) */}
        <Hurricane3DLayer />
        {/* HurricaneLayer: 2D spiral overlay + forecast track + cone */}
        <HurricaneLayer />
      </Map>
    </div>
  )
}
