import { useSimStore } from '../../store/simulationStore'
import { useHurricane } from '../../hooks/useHurricane'
import styles from './StatusBar.module.css'

const CATEGORY_LABELS = {
  1: 'CAT 1 — MINIMAL',
  2: 'CAT 2 — MODERATE',
  3: 'CAT 3 — EXTENSIVE',
  4: 'CAT 4 — EXTREME',
  5: 'CAT 5 — CATASTROPHIC',
}

const PHASE_COLORS = {
  'MONITORING':      'var(--text-muted)',
  'WATCH':           '#ffd166',
  'WARNING':         '#ff8c42',
  'EVACUATION ORDER':'var(--accent-red, #ff4d4d)',
}

export default function StatusBar() {
  const status             = useSimStore(s => s.status)
  const elapsedHours       = useSimStore(s => s.elapsedHours)
  const agents             = useSimStore(s => s.agents)
  const threatAssessment   = useSimStore(s => s.threatAssessment)
  const evacuationTriggered = useSimStore(s => s.evacuationTriggered)
  const { hurricane, hurricaneProgress, categoryColor } = useHurricane()

  const arrived    = agents.filter(a => a.status === 'arrived').length
  const evacuating = agents.filter(a => a.status === 'evacuating').length
  const waiting    = agents.filter(a => a.status === 'waiting').length
  const sheltering = agents.filter(a => a.status === 'sheltering').length
  const safe       = agents.filter(a => a.status === 'safe').length
  const stranded   = agents.filter(a => a.status === 'stranded').length
  const casualties = agents.filter(a => a.status === 'casualty').length

  const statusLabel = {
    idle:       'STANDBY',
    generating: 'GENERATING ZONES',
    running:    'SIMULATION ACTIVE',
    paused:     'PAUSED',
    complete:   'COMPLETE',
  }[status] || 'STANDBY'

  const statusColor = {
    idle:       'var(--text-muted)',
    generating: 'var(--accent-yellow)',
    running:    'var(--accent-green)',
    paused:     'var(--accent-orange)',
    complete:   'var(--accent-cyan)',
  }[status]

  const phaseColor = PHASE_COLORS[threatAssessment.phase] ?? 'var(--text-muted)'
  const showThreat = status === 'running' || status === 'paused' || status === 'complete'

  return (
    <div className={styles.bar}>
      {/* Left — system identity */}
      <div className={styles.left}>
        <div className={styles.logo}>⚡ HURRICANE EVAC COMMAND</div>
        <div className={styles.sub}>Tampa Bay Emergency Management System</div>
      </div>

      {/* Center — storm info + threat assessment */}
      <div className={styles.center}>
        <div className={styles.stormName} style={{ color: categoryColor }}>
          {hurricane.name}
        </div>
        <div className={styles.stormDetail} style={{ color: categoryColor }}>
          {CATEGORY_LABELS[hurricane.category]} &nbsp;·&nbsp; {hurricane.windSpeed} MPH
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${hurricaneProgress * 100}%`, background: categoryColor }}
          />
        </div>

        {/* Live threat ticker */}
        {showThreat && (
          <div className={styles.threatRow}>
            <span className={styles.threatItem}>
              <span className={styles.threatLabel}>DIST</span>
              <span className={styles.threatValue}>{threatAssessment.distanceMiles} mi</span>
            </span>
            <span className={styles.dot}>·</span>
            <span className={styles.threatItem}>
              <span className={styles.threatLabel}>CERTAINTY</span>
              <span className={styles.threatValue}>{threatAssessment.certainty}%</span>
            </span>
            <span className={styles.dot}>·</span>
            <span
              className={`${styles.phaseBadge} ${evacuationTriggered ? styles.evacActive : ''}`}
              style={{ color: phaseColor, borderColor: phaseColor }}
            >
              {threatAssessment.phase}
            </span>
          </div>
        )}
      </div>

      {/* Right — sim stats */}
      <div className={styles.right}>
        <Stat label="STATUS"  value={statusLabel} color={statusColor} />
        <Stat label="ELAPSED" value={`${elapsedHours.toFixed(1)}h`} />
        {waiting    > 0 && <Stat label="STANDBY"   value={waiting}    color="var(--text-muted)" />}
        {sheltering > 0 && <Stat label="SHELTERING" value={sheltering} color="#ffd166" />}
        {safe       > 0 && <Stat label="CLEAR"     value={safe}       color="#4a5568" />}
        <Stat label="MOVING"    value={evacuating}   color="var(--accent-cyan)" />
        <Stat label="SAFE"      value={arrived}       color="var(--accent-green)" />
        {stranded   > 0 && <Stat label="STRANDED"  value={stranded}   color="var(--accent-orange)" />}
        {casualties > 0 && <Stat label="CASUALTIES" value={casualties} color="var(--accent-red, #ff4d4d)" />}
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}
