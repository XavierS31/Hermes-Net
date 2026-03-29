import { useSimStore } from '../../store/simulationStore'
import styles from './AgentCard.module.css'

const STATUS_LABEL = {
  waiting:    { label: 'WAITING',    color: 'var(--text-muted)' },
  evacuating: { label: 'EVACUATING', color: 'var(--accent-cyan)' },
  arrived:    { label: 'SAFE',       color: 'var(--accent-green)' },
  stranded:   { label: 'STRANDED',   color: 'var(--accent-red)' },
}

export default function AgentCard({ agent, compact = false }) {
  const safeZones = useSimStore(s => s.safeZones)
  const selectAgent = useSimStore(s => s.selectAgent)
  const selectedAgentId = useSimStore(s => s.selectedAgentId)

  const zone = safeZones.find(z => z.id === agent.assignedZoneId)
  const st = STATUS_LABEL[agent.status] || STATUS_LABEL.waiting
  const isSelected = selectedAgentId === agent.id

  if (compact) {
    return (
      <div
        className={`${styles.compact} ${isSelected ? styles.selected : ''}`}
        onClick={() => selectAgent(agent.id)}
        style={{ '--agent-color': agent.color }}
      >
        <div className={styles.dot} />
        <div className={styles.compactInfo}>
          <span className={styles.compactLabel}>{agent.label}</span>
          <span className={styles.compactNeighborhood}>{agent.neighborhood}</span>
        </div>
        <div className={styles.compactStatus} style={{ color: st.color }}>
          {st.label}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={() => selectAgent(agent.id)}
      style={{ '--agent-color': agent.color }}
    >
      <div className={styles.top}>
        <div className={styles.avatar} style={{ background: agent.color + '22', border: `1px solid ${agent.color}` }}>
          <span>{agent.icon}</span>
        </div>
        <div className={styles.info}>
          <div className={styles.type}>{agent.label}</div>
          <div className={styles.neighborhood}>{agent.neighborhood}</div>
        </div>
        <div className={styles.statusBadge} style={{ color: st.color, borderColor: st.color + '44' }}>
          {st.label}
        </div>
      </div>

      {agent.route && (
        <div className={styles.progressRow}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${agent.progress * 100}%`, background: agent.color }}
            />
          </div>
          <span className={styles.progressPct}>{Math.round(agent.progress * 100)}%</span>
        </div>
      )}

      <div className={styles.meta}>
        {zone && <MetaItem label="Destination" value={zone.name} />}
        {agent.distanceKm && <MetaItem label="Distance" value={`${agent.distanceKm} km`} />}
        {agent.etaHours && <MetaItem label="ETA" value={`${agent.etaHours.toFixed(1)}h`} />}
        {agent.needsMedical && <MetaItem label="Medical" value="Required" color="var(--accent-orange)" />}
      </div>
    </div>
  )
}

function MetaItem({ label, value, color }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue} style={{ color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}