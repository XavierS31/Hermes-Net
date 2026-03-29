import { motion, AnimatePresence } from 'framer-motion'
import type { SimState, Resident, AlertLevel } from '../types'
import { ALERT_COLORS, ZONE_LABELS } from '../lib/geo'

interface Props {
  state: SimState | null
}

// ── Evacuation priority engine ────────────────────────────────────────────────

const ZONE_ORDER = ['A', 'B', 'C', 'D', 'E'] as const
type Zone = typeof ZONE_ORDER[number]

const ZONE_EVAC_THRESHOLD: Record<Zone, AlertLevel> = {
  A: 'advisory',
  B: 'advisory',
  C: 'warning',
  D: 'emergency',
  E: 'emergency',
}

const ALERT_ORDER: AlertLevel[] = ['monitor', 'advisory', 'warning', 'emergency']

function alertIndex(a: AlertLevel) { return ALERT_ORDER.indexOf(a) }

function shouldZoneEvacNow(zone: Zone, alert: AlertLevel): boolean {
  return alertIndex(alert) >= alertIndex(ZONE_EVAC_THRESHOLD[zone])
}

// ── Analysis ──────────────────────────────────────────────────────────────────

interface ZoneAnalysis {
  zone:     Zone
  label:    string
  active:   boolean    // should be evacuating at this alert level
  residents: Resident[]
  waiting:  number
  moving:   number
  safe:     number
  hasCar:   number
  noCar:    number
  limited:  number
  urgency:  'critical' | 'urgent' | 'advisory' | 'standby'
}

function analyzeZones(state: SimState): ZoneAnalysis[] {
  return ZONE_ORDER.map((zone) => {
    const residents = state.residents.filter((r) => r.zone === zone)
    const active    = shouldZoneEvacNow(zone, state.alert_level)
    const waiting   = residents.filter((r) => r.status === 'waiting').length
    const moving    = residents.filter((r) => r.status === 'evacuating').length
    const safe      = residents.filter((r) => r.status === 'safe').length
    const hasCar    = residents.filter((r) => r.has_car).length
    const noCar     = residents.filter((r) => !r.has_car).length
    const limited   = residents.filter((r) => r.mobility === 'limited').length

    const urgency: ZoneAnalysis['urgency'] =
      zone === 'A' && active                          ? 'critical' :
      active && state.alert_level === 'warning'       ? 'urgent'   :
      active && state.alert_level === 'advisory'      ? 'advisory' :
                                                         'standby'

    return { zone, label: ZONE_LABELS[zone] ?? zone, active, residents, waiting, moving, safe, hasCar, noCar, limited, urgency }
  }).filter((z) => z.residents.length > 0)
}

interface Recommendation {
  icon:  string
  text:  string
  color: string
}

function buildRecommendations(state: SimState, zones: ZoneAnalysis[]): Recommendation[] {
  const recs: Recommendation[] = []
  const { alert_level, hurricane, bridges, shelters } = state

  // ── Zone priority rec ──
  const toEvac = zones.filter((z) => z.active && z.waiting > 0)
  if (toEvac.length > 0) {
    const top = toEvac[0]
    recs.push({
      icon:  '▲',
      text:  `Zone ${top.zone} residents must move NOW — ${top.label.split('—')[0].trim()} at highest flood risk.`,
      color: '#EF4444',
    })
    if (top.noCar > 0 || top.limited > 0) {
      recs.push({
        icon:  '⚠',
        text:  `Zone ${top.zone} has ${top.limited} limited-mobility & ${top.noCar} car-less residents. Coordinate assisted transport on Howard Frankland.`,
        color: '#F97316',
      })
    }
  }

  // ── Traffic rec ──
  const bridgeEntries = Object.entries(bridges)
  const overloaded = bridgeEntries.filter(([, b]) => b.current_load / b.capacity > 0.6)
  if (overloaded.length > 0) {
    const names = overloaded.map(([, b]) => b.name).join(', ')
    recs.push({
      icon:  '⟳',
      text:  `High load on ${names}. Route Zone C–D via Gandy Bridge to distribute traffic.`,
      color: '#F59E0B',
    })
  } else if (bridgeEntries.length > 0) {
    recs.push({
      icon:  '✓',
      text:  'Bridge traffic nominal. Maintain current routing — distribute: Zone A→Skyway, Zone B→Howard Frankland, Zone C→Gandy.',
      color: '#10B981',
    })
  }

  // ── Shelter capacity ──
  const fullShelters = Object.entries(shelters).filter(([, s]) => s.occupancy / s.capacity > 0.8)
  if (fullShelters.length > 0) {
    recs.push({
      icon:  '!',
      text:  `Shelter ${fullShelters.map(([, s]) => s.name).join(', ')} near capacity. Redirect inbound residents to alternate sites.`,
      color: '#F97316',
    })
  }

  // ── Wind closure rec ──
  if (hurricane.wind_speed > 110) {
    recs.push({
      icon:  '⛔',
      text:  `Winds ${hurricane.wind_speed} MPH — Sunshine Skyway Bridge wind closure imminent. All remaining traffic via Howard Frankland.`,
      color: '#EF4444',
    })
  }

  // ── All clear ──
  const allSafe = state.residents.every((r) => r.status === 'safe')
  if (allSafe) {
    recs.push({
      icon:  '✓',
      text:  'All residents reached safe zones. Evacuation complete. Simulation will auto-reset.',
      color: '#10B981',
    })
  }

  if (recs.length === 0) {
    recs.push({
      icon: '·',
      text: 'Storm forming. Monitoring trajectory. No immediate action required — prepare Go-Bags and review evacuation routes.',
      color: '#64748B',
    })
  }

  return recs
}

// ── Sub-components ────────────────────────────────────────────────────────────

const URGENCY_COLORS = {
  critical: '#EF4444',
  urgent:   '#F97316',
  advisory: '#F59E0B',
  standby:  '#374151',
}

const URGENCY_LABELS = {
  critical: 'CRITICAL',
  urgent:   'URGENT',
  advisory: 'ADVISED',
  standby:  'STANDBY',
}

function ZoneRow({ z, alert }: { z: ZoneAnalysis; alert: AlertLevel }) {
  const color  = URGENCY_COLORS[z.urgency]
  const label  = URGENCY_LABELS[z.urgency]
  const total  = z.residents.length
  const pct    = total > 0 ? ((z.moving + z.safe) / total) * 100 : 0

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'Space Mono', fontSize: 11, fontWeight: 700,
            color, background: `${color}14`, border: `1px solid ${color}30`,
            borderRadius: 3, padding: '1px 5px',
          }}>
            ZONE {z.zone}
          </span>
          <span style={{ fontFamily: 'Space Mono', fontSize: 8, letterSpacing: '0.1em', color: '#374151' }}>
            {label}
          </span>
        </div>
        <span style={{ fontFamily: 'Space Mono', fontSize: 8, color: '#374151' }}>
          {z.moving + z.safe}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden', marginBottom: 4 }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${color}, ${color}80)`, borderRadius: 1 }}
        />
      </div>

      {/* Demographic chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Chip label={`${z.label.split('—')[0].trim()}`} dim />
        {z.hasCar > 0 && <Chip label={`${z.hasCar} w/car`} color="#A78BFA" />}
        {z.noCar  > 0 && <Chip label={`${z.noCar} no car`} color="#EF4444" />}
        {z.limited > 0 && <Chip label={`${z.limited} limited mobility`} color="#F97316" />}
        {z.waiting > 0 && z.active && <Chip label={`${z.waiting} still waiting`} color="#F59E0B" />}
        {z.safe > 0    && <Chip label={`${z.safe} safe`} color="#10B981" />}
      </div>
    </div>
  )
}

function Chip({ label, color, dim }: { label: string; color?: string; dim?: boolean }) {
  return (
    <span style={{
      fontFamily: 'Space Mono', fontSize: 7, letterSpacing: '0.06em',
      color:      dim ? '#1E293B' : (color ?? '#475569'),
      background: dim ? 'transparent' : `${color ?? '#475569'}12`,
      border:     dim ? 'none' : `1px solid ${color ?? '#475569'}28`,
      borderRadius: 3, padding: '1px 4px',
    }}>
      {label}
    </span>
  )
}

function AgentCard({ r, alert }: { r: Resident; alert: AlertLevel }) {
  const priorityColor =
    r.zone === 'A' ? '#EF4444' :
    r.zone === 'B' ? '#F97316' :
    r.zone === 'C' ? '#F59E0B' :
                     '#475569'

  const statusColor =
    r.status === 'safe'       ? '#10B981' :
    r.status === 'evacuating' ? '#22D3EE' :
                                 '#475569'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 6, padding: '7px 10px', marginBottom: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>
          #{String(r.id).padStart(4, '0')}
        </span>
        <span style={{
          fontFamily: 'Space Mono', fontSize: 8, letterSpacing: '0.08em',
          color: statusColor, background: `${statusColor}14`,
          border: `1px solid ${statusColor}30`, borderRadius: 3, padding: '1px 5px',
        }}>
          {r.status.toUpperCase()}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 6px' }}>
        <MiniStat label="ZONE"     value={`${r.zone}`}                       color={priorityColor} />
        <MiniStat label="MOBILITY" value={r.mobility.toUpperCase()} />
        <MiniStat label="VEHICLE"  value={r.has_car ? 'YES' : 'NO'}         color={r.has_car ? '#A78BFA' : '#EF4444'} />
        <MiniStat label="PROGRESS" value={`${Math.round(r.progress * 100)}%`} color="#22D3EE" />
      </div>
      {/* Evacuation reason */}
      <p style={{ fontFamily: 'Space Mono', fontSize: 7, color: '#1E293B', marginTop: 5, lineHeight: 1.5, letterSpacing: '0.04em' }}>
        {agentNarrative(r, alert)}
      </p>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontFamily: 'Space Mono', fontSize: 6, letterSpacing: '0.12em', color: '#1E293B', marginBottom: 1 }}>{label}</p>
      <p style={{ fontFamily: 'Space Mono', fontSize: 9, fontWeight: 700, color: color ?? '#64748B' }}>{value}</p>
    </div>
  )
}

function agentNarrative(r: Resident, alert: AlertLevel): string {
  if (r.status === 'safe') return 'Reached safe zone. Sheltering in place.'
  if (r.status === 'evacuating') {
    const via = r.assigned_bridge ? `via ${r.assigned_bridge.replace('_', ' ')}` : ''
    return `Evacuating ${via} · ${Math.round(r.progress * 100)}% complete.`
  }
  // waiting
  if (r.zone === 'A' && alertIndex(alert) >= 1) return 'PRIORITY — Zone A resident must evacuate immediately. Highest storm surge risk.'
  if (r.zone === 'B' && alertIndex(alert) >= 1) return 'Zone B — near-coastal exposure. Should leave when Zone A clears.'
  if (!r.has_car) return 'No vehicle. Awaiting assisted transport coordination.'
  if (r.mobility === 'limited') return 'Limited mobility. Requires additional lead time — should begin early.'
  return 'Monitoring conditions. Preparing to evacuate on order.'
}

function BridgeBar({ name, load, capacity }: { name: string; load: number; capacity: number }) {
  const pct   = capacity > 0 ? Math.min((load / capacity) * 100, 100) : 0
  const color = pct > 80 ? '#EF4444' : pct > 50 ? '#F59E0B' : '#10B981'
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: 'Space Mono', fontSize: 8, color: '#475569' }}>{name}</span>
        <span style={{ fontFamily: 'Space Mono', fontSize: 8, color }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
          style={{ height: '100%', background: color, borderRadius: 1 }}
        />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{
        fontFamily: 'Space Mono', fontSize: 8, letterSpacing: '0.2em',
        color: '#1E293B', marginBottom: 8, paddingBottom: 5,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        {title}
      </p>
      {children}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function SituationPanel({ state }: Props) {
  if (!state) return null

  const alert   = state.alert_level
  const zones   = analyzeZones(state)
  const recs    = buildRecommendations(state, zones)
  const alertColor = ALERT_COLORS[alert]

  return (
    <div
      style={{
        position: 'absolute',
        top: 56, right: 0, bottom: 36,
        width: 270,
        zIndex: 300,
        background: 'rgba(4, 8, 14, 0.92)',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '14px 14px 20px',
        scrollbarWidth: 'none',
      }}
    >
      {/* Panel header */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontFamily: 'Space Mono', fontSize: 8, letterSpacing: '0.2em', color: '#1E293B', marginBottom: 4 }}>
          AUTONOMOUS EVAC SYSTEM
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: 700, color: '#E2E8F0' }}>
            Situation Report
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={alert}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                fontFamily: 'Space Mono', fontSize: 8, letterSpacing: '0.1em',
                color: alertColor, background: `${alertColor}14`,
                border: `1px solid ${alertColor}35`, borderRadius: 4, padding: '2px 6px',
              }}
            >
              {alert.toUpperCase()}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* AI Recommendations */}
      <Section title="AI ASSESSMENT">
        {recs.map((rec, i) => (
          <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7, alignItems: 'flex-start' }}>
            <span style={{ fontFamily: 'Space Mono', fontSize: 9, color: rec.color, flexShrink: 0, marginTop: 1 }}>
              {rec.icon}
            </span>
            <p style={{
              fontFamily: 'Space Mono', fontSize: 8, lineHeight: 1.6,
              letterSpacing: '0.04em', color: '#475569',
            }}>
              {rec.text}
            </p>
          </div>
        ))}
      </Section>

      {/* Zone evacuation priority */}
      <Section title="ZONE PRIORITY ORDER">
        {zones.map((z) => (
          <ZoneRow key={z.zone} z={z} alert={alert} />
        ))}
      </Section>

      {/* Individual agents */}
      <Section title={`AGENT ROSTER — ${state.residents.length} RESIDENTS`}>
        {state.residents.map((r) => (
          <AgentCard key={r.id} r={r} alert={alert} />
        ))}
      </Section>

      {/* Bridge traffic */}
      {Object.keys(state.bridges).length > 0 && (
        <Section title="BRIDGE TRAFFIC">
          {Object.entries(state.bridges).map(([id, b]) => (
            <BridgeBar key={id} name={b.name} load={b.current_load} capacity={b.capacity} />
          ))}
        </Section>
      )}

      {/* Optimal routing logic */}
      <Section title="OPTIMAL ROUTING LOGIC">
        <p style={{ fontFamily: 'Space Mono', fontSize: 7.5, lineHeight: 1.7, color: '#374151', letterSpacing: '0.04em' }}>
          Zones are evacuated in order of coastal proximity. Zone A (highest storm surge) goes first regardless of vehicle status.
          Car-less residents get priority shelter assignments near Howard Frankland for bus access.
          Limited-mobility residents receive extra lead time.
          Bridge load is balanced: Zones A–B → Skyway + Howard Frankland, Zones C–D → Gandy.
          Sunshine Skyway closes at wind &gt; 110 MPH.
        </p>
      </Section>
    </div>
  )
}
