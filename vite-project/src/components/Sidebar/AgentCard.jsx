import { useSimStore } from '../../store/simulationStore'
import styles from './AgentCard.module.css'

const STATUS_META = {
  waiting:    { label: 'STANDBY',    color: 'var(--text-muted)' },
  evacuating: { label: 'EVACUATING', color: 'var(--accent-cyan)' },
  sheltering: { label: 'SHELTERING', color: '#ffd166' },
  arrived:    { label: 'SAFE',       color: 'var(--accent-green)' },
  stranded:   { label: 'STRANDED',   color: 'var(--accent-orange)' },
  safe:       { label: 'CLEAR ZONE', color: '#4a5568' },
  casualty:   { label: 'CASUALTY',   color: 'var(--accent-red, #ff4d4d)' },
}

export default function AgentCard({ agent, compact = false }) {
  const safeZones    = useSimStore(s => s.safeZones)
  const selectAgent  = useSimStore(s => s.selectAgent)
  const selectedId   = useSimStore(s => s.selectedAgentId)

  const zone     = safeZones.find(z => z.id === agent.assignedZoneId)
  const st       = STATUS_META[agent.status] || STATUS_META.waiting
  const selected = selectedId === agent.id
  const name     = agent.name || agent.label

  if (compact) {
    return (
      <div
        className={`${styles.compact} ${selected ? styles.selected : ''}`}
        onClick={() => selectAgent(agent.id)}
        style={{ '--agent-color': agent.color }}
      >
        <div className={styles.dot} />
        <div className={styles.compactInfo}>
          <span className={styles.compactLabel}>{name}</span>
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
      className={`${styles.card} ${selected ? styles.selected : ''} ${agent.status === 'casualty' ? styles.casualtyCard : ''}`}
      onClick={() => selectAgent(agent.id)}
      style={{ '--agent-color': agent.color }}
    >
      {/* Header */}
      <div className={styles.top}>
        <div className={styles.avatar} style={{ background: agent.color + '22', border: `1px solid ${agent.color}` }}>
          <span>{agent.icon}</span>
        </div>
        <div className={styles.info}>
          <div className={styles.name}>{name}</div>
          <div className={styles.meta2}>
            {agent.age && <span>{agent.age} yrs</span>}
            <span>{agent.label}</span>
            <span>{agent.neighborhood}</span>
          </div>
        </div>
        <div className={styles.statusBadge} style={{ color: st.color, borderColor: st.color + '55' }}>
          {st.label}
        </div>
      </div>

      {/* Personal situation */}
      {agent.situation && (
        <div className={styles.situation}>{agent.situation}</div>
      )}

      {/* AI reasoning */}
      {agent.aiDecision?.reasoning && (
        <div className={styles.reasoning}>
          <span className={styles.reasoningLabel}>
            {agent.status === 'casualty' ? 'Final words' : 'Their thinking'}
          </span>
          <span className={styles.reasoningText}>"{agent.aiDecision.reasoning}"</span>
        </div>
      )}

      {/* Evacuation progress */}
      {agent.route && agent.status === 'evacuating' && (
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

      {/* Meta */}
      <div className={styles.metaRow}>
        {zone && <MetaItem label="Destination" value={zone.name} />}
        {agent.distanceKm && <MetaItem label="Distance" value={`${agent.distanceKm} km`} />}
        {agent.etaHours   && <MetaItem label="ETA"      value={`${agent.etaHours.toFixed(1)}h`} />}
        {agent.needsMedical && <MetaItem label="Medical" value="Required" color="var(--accent-orange)" />}
        {agent.personality && <MetaItem label="Trait" value={agent.personality} />}
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
