import { useState } from 'react'
import { useSimStore } from '../../store/simulationStore'
import AgentCard from './AgentCard'
import styles from './RightPanel.module.css'

const TABS = ['AGENTS', 'ZONES', 'LOGS']

export default function RightPanel() {
  const [tab, setTab] = useState('AGENTS')
  const agents = useSimStore(s => s.agents)
  const safeZones = useSimStore(s => s.safeZones)
  const logs = useSimStore(s => s.logs)
  const selectedAgentId = useSimStore(s => s.selectedAgentId)

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  const byStatus = {
    evacuating: agents.filter(a => a.status === 'evacuating'),
    arrived: agents.filter(a => a.status === 'arrived'),
    waiting: agents.filter(a => a.status === 'waiting'),
    stranded: agents.filter(a => a.status === 'stranded'),
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLabel}>COMMAND CENTER</div>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {/* AGENTS TAB */}
        {tab === 'AGENTS' && (
          <div className={styles.agentsTab}>
            {/* Selected agent detail */}
            {selectedAgent && (
              <div className={styles.selectedSection}>
                <div className={styles.sectionTitle}>SELECTED AGENT</div>
                <AgentCard agent={selectedAgent} compact={false} />
              </div>
            )}

            {/* Summary counts */}
            {agents.length > 0 && (
              <div className={styles.counts}>
                <CountBadge label="Evacuating" count={byStatus.evacuating.length} color="var(--accent-cyan)" />
                <CountBadge label="Safe"       count={byStatus.arrived.length}    color="var(--accent-green)" />
                <CountBadge label="Waiting"    count={byStatus.waiting.length}    color="var(--text-muted)" />
                <CountBadge label="Stranded"   count={byStatus.stranded.length}   color="var(--accent-red)" />
              </div>
            )}

            {/* All agents compact list */}
            {agents.length > 0 ? (
              <div className={styles.agentList}>
                <div className={styles.sectionTitle}>ALL AGENTS ({agents.length})</div>
                {/* Stranded first */}
                {byStatus.stranded.map(a => <AgentCard key={a.id} agent={a} compact />)}
                {byStatus.evacuating.map(a => <AgentCard key={a.id} agent={a} compact />)}
                {byStatus.waiting.map(a => <AgentCard key={a.id} agent={a} compact />)}
                {byStatus.arrived.map(a => <AgentCard key={a.id} agent={a} compact />)}
              </div>
            ) : (
              <div className={styles.empty}>
                Spawn agents and generate safe zones to begin.
              </div>
            )}
          </div>
        )}

        {/* ZONES TAB */}
        {tab === 'ZONES' && (
          <div className={styles.zonesTab}>
            {safeZones.length === 0 ? (
              <div className={styles.empty}>No safe zones generated yet. Use the left panel to generate AI safe zones.</div>
            ) : (
              safeZones.map(zone => {
                const occupants = agents.filter(a => a.assignedZoneId === zone.id && a.status === 'arrived').length
                const enroute   = agents.filter(a => a.assignedZoneId === zone.id && a.status === 'evacuating').length
                const fillPct   = Math.round((occupants / zone.capacity) * 100)
                const fillColor = fillPct > 80 ? 'var(--accent-red)' : fillPct > 50 ? 'var(--accent-orange)' : 'var(--accent-green)'

                return (
                  <div key={zone.id} className={styles.zoneCard}>
                    <div className={styles.zoneName}>{zone.name}</div>
                    <div className={styles.zoneCapRow}>
                      <span style={{ color: fillColor }}>{occupants} arrived</span>
                      <span className={styles.dot}>·</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>{enroute} en route</span>
                      <span className={styles.dot}>·</span>
                      <span className={styles.dimText}>{zone.capacity} cap</span>
                    </div>
                    <div className={styles.zoneFillBar}>
                      <div className={styles.zoneFill} style={{ width: `${fillPct}%`, background: fillColor }} />
                    </div>
                    <div className={styles.supplies}>
                      <Supply icon="🍎" label="Food" value={zone.supplies?.food} />
                      <Supply icon="💧" label="Water" value={zone.supplies?.water} />
                      <Supply icon="🏥" label="Medical" value={zone.supplies?.medical} />
                    </div>
                    {zone.reasoning && (
                      <div className={styles.reasoning}>AI: {zone.reasoning}</div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* LOGS TAB */}
        {tab === 'LOGS' && (
          <div className={styles.logsTab}>
            {logs.length === 0 ? (
              <div className={styles.empty}>No events yet.</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className={`${styles.log} ${styles[log.type]}`}>
                  <span className={styles.logTime}>{log.time.toFixed(1)}h</span>
                  <span className={styles.logMsg}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CountBadge({ label, count, color }) {
  return (
    <div className={styles.countBadge}>
      <div className={styles.countNum} style={{ color }}>{count}</div>
      <div className={styles.countLabel}>{label}</div>
    </div>
  )
}

function Supply({ icon, label, value }) {
  return (
    <div className={styles.supply}>
      <span>{icon}</span>
      <span className={styles.supplyLabel}>{label}</span>
      <span className={styles.supplyVal}>{value ?? '—'}</span>
    </div>
  )
}