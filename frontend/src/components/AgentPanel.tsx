import { AnimatePresence, motion } from 'framer-motion'
import type { AlertLevel, Resident, Shelter } from '../types'
import { getMood, ZONE_LABELS, ALERT_COLORS } from '../lib/geo'

const BRIDGE_NAMES: Record<string, string> = {
  gandy:            'Gandy Bridge',
  howard_frankland: 'Howard Frankland',
  sunshine_skyway:  'Sunshine Skyway',
}

interface Props {
  agent:      Resident | null
  shelters:   Record<string, Shelter>
  alertLevel: AlertLevel
  onClose:    () => void
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: '#4B5563', fontSize: 10, letterSpacing: '0.12em', fontFamily: 'Space Mono' }}>{label}</span>
      <span style={{ color: valueColor ?? '#E2E8F0', fontSize: 11, fontFamily: 'Space Mono', fontWeight: 700 }}>{value}</span>
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ marginTop: 4, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ height: '100%', background: 'linear-gradient(90deg, #22D3EE, #10B981)', borderRadius: 2 }}
      />
    </div>
  )
}

export function AgentPanel({ agent, shelters, alertLevel, onClose }: Props) {
  const mood = agent ? getMood(agent.status, alertLevel, agent.progress) : null
  const shelter = agent?.assigned_shelter ? shelters[agent.assigned_shelter] : null
  const eta = agent?.status === 'evacuating'
    ? Math.max(1, Math.ceil((1 - agent.progress) / (agent.mobility === 'normal' ? 0.15 : 0.08)))
    : null

  return (
    <AnimatePresence>
      {agent && mood && (
        <motion.aside
          key={agent.id}
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          style={{
            position: 'absolute',
            left: 16,
            top: 72,
            width: 264,
            zIndex: 200,
            background: 'rgba(8, 14, 22, 0.92)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            backdropFilter: 'blur(24px)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.18em', color: '#4B5563', marginBottom: 4 }}>RESIDENT</p>
              <p style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, color: '#F1F5F9', lineHeight: 1 }}>
                #{String(agent.id).padStart(4, '0')}
              </p>
            </div>
            {/* Mood pill */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: '#4B5563', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
              <span style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.1em', color: mood.color, background: `${mood.color}18`, border: `1px solid ${mood.color}40`, borderRadius: 4, padding: '3px 7px' }}>
                {mood.label}
              </span>
            </div>
          </div>

          {/* Data rows */}
          <div style={{ padding: '4px 16px 12px' }}>
            <Row label="ZONE"     value={`${agent.zone} — ${ZONE_LABELS[agent.zone]}`} valueColor={ALERT_COLORS[alertLevel]} />
            <Row label="STATUS"   value={agent.status.toUpperCase()} valueColor={
              agent.status === 'safe'       ? '#10B981'
              : agent.status === 'evacuating' ? '#22D3EE'
              : '#94A3B8'
            }/>
            <Row label="VEHICLE"  value={agent.has_car ? 'YES' : 'NO'} valueColor={agent.has_car ? '#A78BFA' : '#EF4444'} />
            <Row label="MOBILITY" value={agent.mobility.toUpperCase()} />
            <Row label="RISK TOL" value={agent.status !== 'safe' ? '——' : '——'} />

            {agent.status === 'evacuating' && (
              <>
                <div style={{ paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Space Mono', fontSize: 10, letterSpacing: '0.12em', color: '#4B5563' }}>PROGRESS</span>
                    <span style={{ fontFamily: 'Space Mono', fontSize: 10, color: '#22D3EE' }}>{Math.round(agent.progress * 100)}%</span>
                  </div>
                  <ProgressBar pct={agent.progress} />
                </div>
                {shelter && (
                  <Row label="SHELTER" value={shelter.name} valueColor="#10B981" />
                )}
                {agent.assigned_bridge && (
                  <Row label="BRIDGE" value={BRIDGE_NAMES[agent.assigned_bridge] ?? agent.assigned_bridge} />
                )}
                {eta !== null && (
                  <Row label="ETA" value={`~${eta} tick${eta !== 1 ? 's' : ''}`} valueColor="#60A5FA" />
                )}
              </>
            )}

            {agent.status === 'safe' && shelter && (
              <Row label="SHELTER" value={shelter.name} valueColor="#10B981" />
            )}
          </div>

          {/* Footer glow line */}
          <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${mood.color}60, transparent)` }} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
