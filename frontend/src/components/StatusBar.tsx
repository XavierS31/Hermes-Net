import { motion, AnimatePresence } from 'framer-motion'
import type { SimState } from '../types'

interface Props {
  state: SimState | null
  origin: string
}

export function StatusBar({ state, origin }: Props) {
  if (!state) return null

  const { hurricane, residents, alert_level, tick } = state

  const waiting    = residents.filter((r) => r.status === 'waiting').length
  const evacuating = residents.filter((r) => r.status === 'evacuating').length
  const safe       = residents.filter((r) => r.status === 'safe').length
  const total      = residents.length

  const narrative = buildNarrative(hurricane.category, origin, hurricane.distance_to_tampa, hurricane.wind_speed, evacuating, safe, waiting, total, alert_level, tick)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        zIndex: 300,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        background: 'rgba(5, 9, 15, 0.82)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
      }}
    >
      {/* Scrolling narrative */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tick}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.35 }}
          style={{
            fontFamily: 'Space Mono',
            fontSize: 10,
            letterSpacing: '0.08em',
            color: '#475569',
            whiteSpace: 'nowrap',
            display: 'flex',
            gap: 20,
            alignItems: 'center',
          }}
        >
          {narrative.map((seg, i) => (
            <span key={i} style={{ color: seg.color ?? '#475569' }}>
              {seg.text}
            </span>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Right: tick counter */}
      <div style={{ marginLeft: 'auto', fontFamily: 'Space Mono', fontSize: 10, letterSpacing: '0.1em', color: '#1E293B' }}>
        T+{tick}
      </div>
    </div>
  )
}

function buildNarrative(
  category: number,
  origin: string,
  dist: number,
  wind: number,
  evacuating: number,
  safe: number,
  waiting: number,
  total: number,
  alert: string,
  tick: number,
): { text: string; color?: string }[] {
  const catColor = category >= 4 ? '#EF4444' : category >= 3 ? '#F97316' : '#F59E0B'
  const alertColor: Record<string,string> = {
    emergency: '#EF4444', warning: '#F97316', advisory: '#F59E0B', monitor: '#475569',
  }

  const segments: { text: string; color?: string }[] = []

  segments.push({ text: `HURRICANE CAT ${category}`, color: catColor })
  segments.push({ text: '·', color: '#1E293B' })
  segments.push({ text: `APPROACHING FROM ${origin.toUpperCase()}`, color: '#94A3B8' })
  segments.push({ text: '·', color: '#1E293B' })
  segments.push({ text: `${dist.toFixed(0)} MI OUT`, color: '#CBD5E1' })
  segments.push({ text: '·', color: '#1E293B' })
  segments.push({ text: `${wind} MPH WINDS`, color: catColor })
  segments.push({ text: '·', color: '#1E293B' })
  segments.push({ text: alert.toUpperCase(), color: alertColor[alert] ?? '#475569' })
  segments.push({ text: '·', color: '#1E293B' })

  if (evacuating > 0) {
    segments.push({ text: `${evacuating} EVACUATING`, color: '#22D3EE' })
    segments.push({ text: '·', color: '#1E293B' })
  }
  if (safe > 0) {
    segments.push({ text: `${safe} SAFE`, color: '#10B981' })
    segments.push({ text: '·', color: '#1E293B' })
  }
  if (waiting > 0) {
    segments.push({ text: `${waiting} WAITING`, color: '#64748B' })
    segments.push({ text: '·', color: '#1E293B' })
  }

  const allSafe = safe === total
  const phaseLine =
    tick <= 2  ? 'STORM FORMING — MONITORING CONDITIONS' :
    allSafe    ? 'ALL RESIDENTS CLEAR — RESETTING SIMULATION' :
    alert === 'emergency' ? 'CRITICAL — MANDATORY EVACUATION IN EFFECT' :
    alert === 'warning'   ? 'EVACUATION ORDERS ISSUED FOR ZONES A–C' :
    alert === 'advisory'  ? 'VOLUNTARY EVACUATION ADVISED FOR ZONE A' :
                            'MONITORING STORM TRAJECTORY'

  segments.push({ text: phaseLine, color: '#374151' })

  return segments
}
