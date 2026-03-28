import { LayoutDashboard, Radar, Timer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import hermesLogo from '../../assets/HermesNET.png'
import { useC2 } from '../../context/C2Context'
import { SN } from '../../theme/tokens'

function formatDisplayUtc(iso: string | null) {
  if (!iso) return '—'
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T')
  const d = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

export function TopBar() {
  const { missionDeadline, simulationClockUtc } = useC2()
  const [nowTick, setNowTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const tMinus = useMemo(() => {
    if (!missionDeadline) return '—:—:—'
    void nowTick
    const s = Math.max(
      0,
      Math.floor((missionDeadline.getTime() - Date.now()) / 1000),
    )
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }, [missionDeadline, nowTick])

  const simClock = useMemo(() => {
    return formatDisplayUtc(simulationClockUtc)
  }, [simulationClockUtc])

  return (
    <header
      className="pointer-events-auto absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-4 border-b px-5 py-3 font-mono text-[11px] tracking-wide"
      style={{
        borderColor: SN.border,
        background: SN.bg,
        color: '#e4e4e7',
      }}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <img
          src={hermesLogo}
          alt="HermesNET"
          className="h-9 w-auto max-w-[min(300px,60w)] object-contain object-left sm:h-10 md:h-11"
          draggable={false}
        />
        <span className="text-[9px] uppercase text-zinc-500">
          Tactical C2 · Evacuation sim
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-[9px] uppercase tracking-widest text-zinc-500">
            Mission_time
          </span>
          <span
            className="text-lg font-semibold tabular-nums"
            style={{ color: SN.amber }}
          >
            {missionDeadline ? `T-${tMinus}` : 'T-—'}
          </span>
        </div>
        <div className="h-8 w-px bg-white/10" aria-hidden />
        <div className="flex flex-col items-end">
          <span className="text-[9px] uppercase tracking-widest text-zinc-500">
            Sim_clock (UTC)
          </span>
          <span className="text-sm tabular-nums text-zinc-200">{simClock}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          title="Sensors"
        >
          <Radar className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="rounded border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          title="Timer"
        >
          <Timer className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="rounded border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          title="Developer board"
        >
          <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
