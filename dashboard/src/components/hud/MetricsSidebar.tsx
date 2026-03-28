import { useMemo } from 'react'
import { useC2 } from '../../context/C2Context'
import { SN } from '../../theme/tokens'

export function MetricsSidebar() {
  const {
    evacuationPct,
    storm,
    bridges,
    hoverBridgeId,
    tick,
  } = useC2()

  const bridgeRows = useMemo(
    () =>
      bridges.map((b) => ({
        ...b,
        windMph: Math.min(165, Math.round(b.windMph + tick * 1.8)),
      })),
    [bridges, tick],
  )

  const hover = useMemo(
    () => bridgeRows.find((b) => b.id === hoverBridgeId),
    [bridgeRows, hoverBridgeId],
  )

  const gaugeOffset = 100 - evacuationPct

  return (
    <aside
      className="pointer-events-auto absolute bottom-28 right-3 top-24 z-30 flex w-[280px] flex-col gap-4 overflow-hidden rounded-lg border p-4 text-[11px] font-mono"
      style={{
        borderColor: SN.border,
        background: 'rgba(11, 11, 12, 0.78)',
        backdropFilter: 'blur(22px)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">
          Evacuation
        </span>
        <span
          className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
          style={{
            borderColor: `${SN.crimson}55`,
            color: SN.crimson,
            background: `${SN.crimson}12`,
          }}
        >
          Critical
        </span>
      </div>

      <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={SN.cyan}
            strokeWidth="8"
            strokeDasharray={`${264 * (1 - gaugeOffset / 100)} 264`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tabular-nums text-white">
            {evacuationPct.toFixed(0)}%
          </span>
          <span className="text-[9px] uppercase text-zinc-500">Total evac</span>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="mb-2 text-[9px] uppercase tracking-widest text-zinc-500">
          Storm intensity
        </p>
        <div className="flex items-baseline gap-3">
          <span
            className="text-3xl font-bold tracking-tight"
            style={{ color: SN.cyan }}
          >
            {storm.label}
          </span>
          <span className="text-lg tabular-nums text-zinc-200">
            {storm.windMph} MPH
          </span>
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">Saffir-Simpson · sustained</p>
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="mb-2 text-[9px] uppercase tracking-widest text-zinc-500">
          Bridge throughput (vph)
        </p>
        <ul className="flex flex-col gap-3">
          {bridgeRows.map((b) => {
            const cap = b.id === 'howard' ? 9500 : 6500
            const pct = Math.min(100, (b.vph / cap) * 100)
            return (
              <li key={b.id}>
                <div className="mb-1 flex justify-between text-[10px]">
                  <span className="text-zinc-300">{b.name}</span>
                  <span className="tabular-nums text-zinc-400">{b.vph.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background:
                        b.windMph > 45
                          ? `linear-gradient(90deg, ${SN.crimson}, ${SN.amber})`
                          : `linear-gradient(90deg, ${SN.cyan}, #39FF14)`,
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {hover && (
        <div
          className="border-t pt-3 text-[10px]"
          style={{ borderColor: `${SN.cyan}33` }}
        >
          <p className="mb-1 text-[9px] uppercase tracking-widest" style={{ color: SN.cyan }}>
            Hover · {hover.name}
          </p>
          <p className="text-zinc-300">
            Wind {hover.windMph} mph · closure p.{' '}
            <span style={{ color: SN.amber }}>
              {(hover.closureRisk * 100).toFixed(0)}%
            </span>
          </p>
        </div>
      )}
    </aside>
  )
}
