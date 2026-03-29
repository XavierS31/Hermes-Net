import { useSimStore } from '../../store/simulationStore'
import { useHurricane } from '../../hooks/useHurricane'
import hermesLogo from '../../assets/hermeslogo.png'
import styles from './StatusBar.module.css'

const CATEGORY_LABELS = {
  1: 'CAT 1 — MINIMAL',
  2: 'CAT 2 — MODERATE',
  3: 'CAT 3 — EXTENSIVE',
  4: 'CAT 4 — EXTREME',
  5: 'CAT 5 — CATASTROPHIC',
}

export default function StatusBar() {
  const status = useSimStore(s => s.status)
  const elapsedHours = useSimStore(s => s.elapsedHours)
  const agents = useSimStore(s => s.agents)
  const { hurricane, hurricaneProgress, categoryColor } = useHurricane()

  const arrived   = agents.filter(a => a.status === 'arrived').length
  const evacuating = agents.filter(a => a.status === 'evacuating').length
  const stranded  = agents.filter(a => a.status === 'stranded').length

  const statusLabel = {
    idle: 'STANDBY',
    generating: 'GENERATING ZONES',
    running: 'SIMULATION ACTIVE',
    paused: 'PAUSED',
    complete: 'COMPLETE',
  }[status] || 'STANDBY'

  const statusColor = {
    idle: 'var(--text-muted)',
    generating: 'var(--accent-yellow)',
    running: 'var(--accent-green)',
    paused: 'var(--accent-orange)',
    complete: 'var(--accent-cyan)',
  }[status]

  return (
    <div className={styles.bar}>
      {/* Left — system identity */}
      <div className={styles.left}>
        <div className={styles.brand}>
          <img src={hermesLogo} alt="Hermes" className={styles.logoImg} width={320} height={48} decoding="async" />
        </div>
      </div>

      {/* Center — storm info */}
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
      </div>

      {/* Right — sim stats */}
      <div className={styles.right}>
        <Stat label="STATUS" value={statusLabel} color={statusColor} />
        <Stat label="ELAPSED" value={`${elapsedHours.toFixed(1)}h`} />
        <Stat label="SAFE" value={arrived} color="var(--accent-green)" />
        <Stat label="MOVING" value={evacuating} color="var(--accent-cyan)" />
        {stranded > 0 && <Stat label="STRANDED" value={stranded} color="var(--accent-red)" />}
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