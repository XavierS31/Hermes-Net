import { useState } from 'react'
import axios from 'axios'
import { useSimStore } from '../../store/simulationStore'
import { useHurricane } from '../../hooks/useHurricane'
import styles from './LeftPanel.module.css'

export default function LeftPanel() {
  const {
    hurricane,
    hurricanePresets,
    setHurricanePreset,
    updateHurricaneCustom,
    setSafeZones,
    setSafeZonesLoading,
    setSafeZonesError,
    safeZonesLoading,
    safeZonesError,
    safeZones,
    setPickingMode,
    addLog,
    spawnAgents,
    agents,
  } = useSimStore()

  const { categoryColor } = useHurricane()
  const [activePreset, setActivePreset] = useState(hurricanePresets[0].id)

  const handlePreset = (id) => {
    setActivePreset(id)
    setHurricanePreset(id)
  }

  const generateSafeZones = async () => {
    setSafeZonesLoading(true)
    setSafeZonesError(null)
    addLog('Requesting AI safe zone analysis...', 'info')

    try {
      const res = await axios.post('/api/generate-safe-zones', {
        origin_lng: hurricane.originLng,
        origin_lat: hurricane.originLat,
        dest_lng: hurricane.destLng,
        dest_lat: hurricane.destLat,
        category: hurricane.category,
        wind_speed: hurricane.windSpeed,
      })

      const zones = res.data.safe_zones
      setSafeZones(zones)
      addLog(`AI placed ${zones.length} safe zones based on storm path`, 'success')
    } catch (err) {
      // Fallback: mock zones for development
      const mockZones = getMockSafeZones(hurricane)
      setSafeZones(mockZones)
      //setSafeZonesError('Backend offline — using mock zones')
      //addLog('Using mock safe zones (backend offline)', 'warning')
    } finally {
      setSafeZonesLoading(false)
    }
  }

  const handleSpawnAgents = () => {
    spawnAgents(80)
    addLog('Spawned 80 civilian agents across Tampa Bay', 'info')
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLabel}>STORM CONFIGURATION</div>
      </div>

      {/* Preset selector */}
      <Section title="Historical Storm">
        <div className={styles.presets}>
          {hurricanePresets.map(p => (
            <button
              key={p.id}
              className={`${styles.presetBtn} ${activePreset === p.id ? styles.activePreset : ''}`}
              onClick={() => handlePreset(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Section>

      {/* Hurricane details */}
      <Section title="Storm Parameters">
        <Field label="Category" value={hurricane.category} color={categoryColor}>
          <div className={styles.catBar}>
            {[1, 2, 3, 4, 5].map(c => (
              <div
                key={c}
                className={`${styles.catSegment} ${c <= hurricane.category ? styles.catActive : ''}`}
                style={c <= hurricane.category ? { background: categoryColor } : {}}
              />
            ))}
          </div>
        </Field>
        <Field label="Wind Speed" value={`${hurricane.windSpeed} mph`} />
        <Field label="Origin" value={`${hurricane.originLat.toFixed(2)}°N ${Math.abs(hurricane.originLng).toFixed(2)}°W`} />
        <Field label="Destination" value={`${hurricane.destLat.toFixed(2)}°N ${Math.abs(hurricane.destLng).toFixed(2)}°W`} />
      </Section>

      {/* Map picking — only for custom */}
      {activePreset === 'custom' && (
        <Section title="Set Custom Path">
          <button className={styles.pickBtn} onClick={() => setPickingMode('origin')}>
            📍 Click Map → Set Origin
          </button>
          <button className={styles.pickBtn} onClick={() => setPickingMode('dest')}>
            🏁 Click Map → Set Destination
          </button>
          <div className={styles.row}>
            <label>Category</label>
            <input
              type="range" min="1" max="5" step="1"
              value={hurricane.category}
              onChange={e => updateHurricaneCustom('category', e.target.value)}
              className={styles.slider}
            />
            <span style={{ color: categoryColor }}>{hurricane.category}</span>
          </div>
          <div className={styles.row}>
            <label>Wind (mph)</label>
            <input
              type="range" min="74" max="185" step="5"
              value={hurricane.windSpeed}
              onChange={e => updateHurricaneCustom('windSpeed', e.target.value)}
              className={styles.slider}
            />
            <span>{hurricane.windSpeed}</span>
          </div>
        </Section>
      )}

      {/* AI Safe Zone Generation */}
      <Section title="AI Safe Zones">
        <p className={styles.hint}>
          The AI agent analyzes the storm path and places optimal evacuation zones outside the danger cone.
        </p>

        <button
          className={`${styles.actionBtn} ${styles.generateBtn}`}
          onClick={generateSafeZones}
          disabled={safeZonesLoading}
        >
          {safeZonesLoading ? (
            <><Spinner /> ANALYZING PATH...</>
          ) : (
            <>{safeZones.length > 0 ? '↻ REGENERATE' : 'GENERATE'} SAFE ZONES</>
          )}
        </button>

        {safeZonesError && (
          <div className={styles.errorNote}>{safeZonesError}</div>
        )}

        {safeZones.length > 0 && (
          <div className={styles.zoneList}>
            {safeZones.map((z, i) => (
              <div key={z.id} className={styles.zoneItem}>
                <div className={styles.zoneIndex}>{i + 1}</div>
                <div className={styles.zoneInfo}>
                  <div className={styles.zoneName}>{z.name}</div>
                  <div className={styles.zoneMeta}>Cap: {z.capacity} · {z.lat?.toFixed(2)}°N</div>
                </div>
                <div className={styles.zoneGreen}>✓</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Agents */}
      <Section title="Civilian Agents">
        <p className={styles.hint}>
          80 AI agents across Tampa Bay neighborhoods, each with unique demographics and evacuation needs.
        </p>
        <button
          className={`${styles.actionBtn} ${styles.agentBtn}`}
          onClick={handleSpawnAgents}
          disabled={agents.length > 0}
        >
          {agents.length > 0 ? `✓ ${agents.length} AGENTS SPAWNED` : '👥 SPAWN AGENTS'}
        </button>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, color, children }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue} style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </div>
      {children}
    </div>
  )
}

function Spinner() {
  return <span className={styles.spinner}>◌</span>
}

// Fallback mock zones when backend is offline
function getMockSafeZones(hurricane) {
  return [
    { id: 'sz1', name: 'Raymond James Stadium', lat: 27.9759, lng: -82.5033, capacity: 500, supplies: { food: 1000, water: 2000, medical: 50 }, reasoning: 'Northwest of storm path, high capacity' },
    { id: 'sz2', name: 'USF Campus Center',     lat: 28.0587, lng: -82.4149, capacity: 400, supplies: { food: 800,  water: 1600, medical: 40 }, reasoning: 'Inland, north of danger zone' },
    { id: 'sz3', name: 'Brandon Town Center',   lat: 27.9378, lng: -82.2859, capacity: 350, supplies: { food: 700,  water: 1400, medical: 35 }, reasoning: 'East of Tampa, away from coast' },
    { id: 'sz4', name: 'Wiregrass Mall Area',   lat: 28.1780, lng: -82.3460, capacity: 450, supplies: { food: 900,  water: 1800, medical: 45 }, reasoning: 'Far north, safe from surge' },
    { id: 'sz5', name: 'Plant City Fairgrounds', lat: 28.0189, lng: -82.1143, capacity: 600, supplies: { food: 1200, water: 2400, medical: 60 }, reasoning: 'Inland, high elevation, large capacity' },
  ]
}