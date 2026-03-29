import type { AlertLevel, Resident, Shelter } from '../types'
import { getMood, ZONE_LABELS, ALERT_COLORS } from '../lib/geo'

const BRIDGE_NAMES: Record<string, string> = {
  gandy:            'Gandy Bridge',
  howard_frankland: 'Howard Frankland',
  sunshine_skyway:  'Sunshine Skyway',
}

interface Props {
  x:          number
  y:          number
  agent:      Resident
  shelters:   Record<string, Shelter>
  alertLevel: AlertLevel
}

export function HoverCard({ x, y, agent, shelters, alertLevel }: Props) {
  const mood = getMood(agent.status, alertLevel, agent.progress)
  const shelter = agent.assigned_shelter ? shelters[agent.assigned_shelter] : null

  // Keep card on screen: flip left if near right edge
  const cardW = 220
  const left = x + 16 + cardW > window.innerWidth ? x - cardW - 12 : x + 16
  const top  = Math.min(y - 10, window.innerHeight - 280)

  const statusColor =
    agent.status === 'safe'       ? '#10B981'
    : agent.status === 'evacuating' ? '#22D3EE'
    : '#94A3B8'

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        width: cardW,
        zIndex: 500,
        background: 'rgba(6, 11, 18, 0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        backdropFilter: 'blur(20px)',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Coloured top stripe */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${mood.color}, transparent)` }} />

      <div style={{ padding: '10px 12px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <p style={{ fontFamily: 'Space Mono', fontSize: 8, letterSpacing: '0.18em', color: '#374151', marginBottom: 3 }}>RESIDENT</p>
            <p style={{ fontFamily: 'Space Grotesk', fontSize: 17, fontWeight: 600, color: '#F1F5F9', lineHeight: 1 }}>
              #{String(agent.id).padStart(4, '0')}
            </p>
          </div>
          <span style={{
            fontFamily: 'Space Mono', fontSize: 8, letterSpacing: '0.1em',
            color: mood.color, background: `${mood.color}18`,
            border: `1px solid ${mood.color}40`, borderRadius: 4, padding: '2px 6px',
          }}>
            {mood.label}
          </span>
        </div>

        {/* Grid of stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
          <Chip label="ZONE"   value={agent.zone} color={ALERT_COLORS[alertLevel]} />
          <Chip label="STATUS" value={agent.status.toUpperCase()} color={statusColor} />
          <Chip label="VEHICLE"  value={agent.has_car ? 'YES' : 'NO'} color={agent.has_car ? '#A78BFA' : '#EF4444'} />
          <Chip label="MOBILITY" value={agent.mobility.toUpperCase()} />
        </div>

        {/* Zone label */}
        <p style={{ fontFamily: 'Space Mono', fontSize: 8, color: '#374151', letterSpacing: '0.06em', marginTop: 7 }}>
          {ZONE_LABELS[agent.zone]}
        </p>

        {/* Progress bar if evacuating */}
        {agent.status === 'evacuating' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'Space Mono', fontSize: 8, letterSpacing: '0.1em', color: '#374151' }}>PROGRESS</span>
              <span style={{ fontFamily: 'Space Mono', fontSize: 8, color: '#22D3EE' }}>{Math.round(agent.progress * 100)}%</span>
            </div>
            <div style={{ height: 2.5, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${agent.progress * 100}%`, background: 'linear-gradient(90deg,#22D3EE,#10B981)', borderRadius: 2 }} />
            </div>
            {shelter && (
              <p style={{ fontFamily: 'Space Mono', fontSize: 8, color: '#10B981', marginTop: 5, letterSpacing: '0.06em' }}>
                → {shelter.name}
              </p>
            )}
            {agent.assigned_bridge && (
              <p style={{ fontFamily: 'Space Mono', fontSize: 8, color: '#64748B', marginTop: 2, letterSpacing: '0.06em' }}>
                via {BRIDGE_NAMES[agent.assigned_bridge] ?? agent.assigned_bridge}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 4, padding: '4px 6px' }}>
      <p style={{ fontFamily: 'Space Mono', fontSize: 7, letterSpacing: '0.12em', color: '#374151', marginBottom: 2 }}>{label}</p>
      <p style={{ fontFamily: 'Space Mono', fontSize: 10, fontWeight: 700, color: color ?? '#CBD5E1' }}>{value}</p>
    </div>
  )
}
