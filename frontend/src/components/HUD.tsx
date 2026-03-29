import { motion, AnimatePresence } from 'framer-motion'
import type { SimState } from '../types'
import type { HurricaneOrigin } from '../lib/geo'
import { ALERT_COLORS, ALERT_LABELS } from '../lib/geo'

// 8-direction compass layout — [col, row] in a 3×3 grid (col 0–2, row 0–2)
const COMPASS_DIRS: { id: HurricaneOrigin; label: string; col: number; row: number }[] = [
  { id: 'northwest', label: 'NW', col: 0, row: 0 },
  { id: 'north',     label: 'N',  col: 1, row: 0 },
  { id: 'northeast', label: 'NE', col: 2, row: 0 },
  { id: 'west',      label: 'W',  col: 0, row: 1 },
  { id: 'east',      label: 'E',  col: 2, row: 1 },
  { id: 'southwest', label: 'SW', col: 0, row: 2 },
  { id: 'south',     label: 'S',  col: 1, row: 2 },
  { id: 'southeast', label: 'SE', col: 2, row: 2 },
]

interface Props {
  state:       SimState | null
  connected:   boolean
  origin:      HurricaneOrigin
  onOrigin:    (o: HurricaneOrigin) => void
  onReset:     () => void
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.16em', color: '#374151' }}>{label}</span>
      <span style={{ fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, color: color ?? '#CBD5E1' }}>{value}</span>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.06)' }} />
}

export function HUD({ state, connected, origin, onOrigin, onReset }: Props) {
  const alert = state?.alert_level ?? 'monitor'
  const color = ALERT_COLORS[alert]
  const label = ALERT_LABELS[alert]

  const waiting    = state?.residents.filter((r) => r.status === 'waiting').length    ?? 0
  const evacuating = state?.residents.filter((r) => r.status === 'evacuating').length ?? 0
  const safe       = state?.residents.filter((r) => r.status === 'safe').length       ?? 0
  const total      = state?.residents.length ?? 0
  const evacPct    = total ? Math.round(((evacuating + safe) / total) * 100) : 0

  return (
    <header
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 300,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 20,
        background: 'rgba(5, 9, 15, 0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: connected ? '#10B981' : '#EF4444',
          boxShadow: connected ? '0 0 8px #10B98180' : 'none',
        }} />
        <span style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', color: '#94A3B8' }}>
          SENTINEL<span style={{ color: '#1E293B' }}>·</span>NET
        </span>
      </div>

      <Divider />

      {/* Alert level */}
      <AnimatePresence mode="wait">
        <motion.div
          key={alert}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: 'Space Mono', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', color, background: `${color}14`,
            border: `1px solid ${color}35`, borderRadius: 5, padding: '4px 10px',
          }}
        >
          {label}
        </motion.div>
      </AnimatePresence>

      <Divider />

      {/* Hurricane data */}
      {state && (
        <>
          <Stat label="CATEGORY" value={`CAT ${state.hurricane.category}`} color="#F59E0B" />
          <Stat label="WIND"     value={`${state.hurricane.wind_speed} MPH`} color="#F59E0B" />
          <Stat label="DISTANCE" value={`${state.hurricane.distance_to_tampa.toFixed(0)} MI`} />
          <Divider />
        </>
      )}

      {/* Evacuation stats */}
      <Stat label="EVACUATING" value={String(evacuating)} color="#22D3EE" />
      <Stat label="SAFE"       value={String(safe)}       color="#10B981" />
      <Stat label="WAITING"    value={String(waiting)}    color="#94A3B8" />

      <Divider />

      {/* Evac % bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.16em', color: '#374151' }}>EVAC</span>
          <span style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#22D3EE' }}>{evacPct}%</span>
        </div>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${evacPct}%` }}
            transition={{ duration: 0.5 }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #22D3EE, #10B981)', borderRadius: 1 }}
          />
        </div>
      </div>

      {state && (
        <>
          <Divider />
          <Stat label="TICK" value={`T+${state.tick}`} />
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Origin compass */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
        <span style={{ fontFamily: 'Space Mono', fontSize: 8, letterSpacing: '0.14em', color: '#374151', marginBottom: 1 }}>
          STORM ORIGIN
        </span>
        <Compass current={origin} onChange={onOrigin} />
      </div>

      <Divider />

      {/* Reset */}
      <button onClick={onReset} style={btnStyle('#EF4444')}>
        RESET
      </button>
    </header>
  )
}

function Compass({ current, onChange }: { current: HurricaneOrigin; onChange: (o: HurricaneOrigin) => void }) {
  const cellPx = 16
  const gap    = 2

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(3, ${cellPx}px)`,
      gridTemplateRows:    `repeat(3, ${cellPx}px)`,
      gap,
    }}>
      {/* Centre dot */}
      <div style={{
        gridColumn: 2, gridRow: 2,
        width: cellPx, height: cellPx,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#1E293B' }} />
      </div>

      {COMPASS_DIRS.map((d) => {
        const active = d.id === current
        return (
          <button
            key={d.id}
            onClick={() => onChange(d.id)}
            title={d.id}
            style={{
              gridColumn: d.col + 1,
              gridRow:    d.row + 1,
              width: cellPx, height: cellPx,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Space Mono', fontSize: 6, letterSpacing: '0.05em',
              color:      active ? '#F59E0B' : '#374151',
              background: active ? '#F59E0B18' : 'transparent',
              border:     active ? '1px solid #F59E0B50' : '1px solid transparent',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'all 0.15s',
              padding: 0,
            }}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}

function btnStyle(accent: string): React.CSSProperties {
  return {
    fontFamily: 'Space Mono', fontSize: 10, letterSpacing: '0.12em',
    color: accent, background: `${accent}10`,
    border: `1px solid ${accent}35`, borderRadius: 5,
    padding: '6px 14px', cursor: 'pointer', transition: 'background 0.15s',
  }
}
