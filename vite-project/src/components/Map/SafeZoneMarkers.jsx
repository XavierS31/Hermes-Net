import { Marker, Popup } from 'react-map-gl'
import { useState } from 'react'
import { useSimStore } from '../../store/simulationStore'
import styles from './SafeZoneMarkers.module.css'

export default function SafeZoneMarkers() {
  const safeZones = useSimStore(s => s.safeZones)
  const agents = useSimStore(s => s.agents)
  const [popupId, setPopupId] = useState(null)

  return (
    <>
      {safeZones.map(zone => {
        const occupants = agents.filter(a => a.assignedZoneId === zone.id && a.status === 'arrived').length
        const fillPct   = Math.round((occupants / zone.capacity) * 100)
        const fillColor = fillPct > 80 ? '#ff4d4d' : fillPct > 50 ? '#ff8c42' : '#3ddc84'

        return (
          <div key={zone.id}>
            <Marker
              longitude={zone.lng}
              latitude={zone.lat}
              anchor="center"
              onClick={e => { e.originalEvent.stopPropagation(); setPopupId(zone.id) }}
            >
              <div className={styles.marker} style={{ '--fill-color': fillColor }}>
                <div className={styles.icon}>⛺</div>
                <div className={styles.ring} />
                <div className={styles.pulse} />
              </div>
            </Marker>

            {popupId === zone.id && (
              <Popup
                longitude={zone.lng}
                latitude={zone.lat}
                anchor="bottom"
                onClose={() => setPopupId(null)}
                closeButton={false}
                className={styles.popup}
              >
                <div className={styles.popupContent}>
                  <div className={styles.popupTitle}>{zone.name}</div>
                  <div className={styles.popupRow}>
                    <span>Capacity</span>
                    <span>{occupants} / {zone.capacity}</span>
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${fillPct}%`, background: fillColor }} />
                  </div>
                  <div className={styles.popupRow}>
                    <span>Food</span>
                    <span>{zone.supplies?.food ?? '—'} units</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Water</span>
                    <span>{zone.supplies?.water ?? '—'} L</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Medical</span>
                    <span>{zone.supplies?.medical ?? '—'} kits</span>
                  </div>
                  {zone.reasoning && (
                    <div className={styles.reasoning}>{zone.reasoning}</div>
                  )}
                </div>
              </Popup>
            )}
          </div>
        )
      })}
    </>
  )
}