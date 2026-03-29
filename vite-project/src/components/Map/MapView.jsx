import { useCallback } from 'react'
import Map, { NavigationControl } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useSimStore } from '../../store/simulationStore'
import HurricaneLayer from './HurricaneLayer'
import SafeZoneMarkers from './SafeZoneMarkers'
import AgentMarkers from './AgentMarkers'
import EvacRoutes from './EvacRoutes'
import styles from './MapView.module.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export default function MapView() {
  const pickingMode = useSimStore(s => s.pickingMode)
  const setPickingMode = useSimStore(s => s.setPickingMode)
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
  }, [pickingMode])

  return (
    <div className={`${styles.mapWrap} ${pickingMode ? styles.picking : ''}`}>
      {pickingMode && (
        <div className={styles.pickHint}>
          Click on the map to set {pickingMode === 'origin' ? 'hurricane origin' : 'destination'}
        </div>
      )}

      <Map
        id="mainMap"
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: -82.4572,
          latitude: 27.9506,
          zoom: 9.5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onClick={handleMapClick}
        cursor={pickingMode ? 'crosshair' : 'grab'}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <EvacRoutes />
        <SafeZoneMarkers />
        <AgentMarkers />
        <HurricaneLayer />
      </Map>
    </div>
  )
}