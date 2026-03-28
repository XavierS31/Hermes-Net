import { Pause, Play } from 'lucide-react'
import { TICK_COUNT } from '../../data/mockSimulation'
import { useC2 } from '../../context/C2Context'
import { SN } from '../../theme/tokens'

function tickLabel(i: number) {
  const day = Math.floor(i / 2)
  const half = i % 2
  return `D${day}·${half === 0 ? '00' : '12'}h`
}

export function TemporalController() {
  const { tick, setTick, playing, togglePlay } = useC2()

  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex w-[min(720px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-2 rounded-lg border px-4 py-3 font-mono text-[10px]"
      style={{
        borderColor: SN.border,
        background: 'rgba(11, 11, 12, 0.85)',
        backdropFilter: 'blur(22px)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">
          Temporal · 7d / 12h heartbeat
        </span>
        <button
          type="button"
          onClick={togglePlay}
          className={`flex items-center gap-2 rounded border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
            playing
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              : 'border-white/15 bg-white/5 text-zinc-200 hover:border-cyan-400/40'
          }`}
        >
          {playing ? (
            <>
              <Pause className="h-3.5 w-3.5" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Play
            </>
          )}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={TICK_COUNT - 1}
          step={1}
          value={tick}
          onChange={(e) => setTick(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full accent-cyan-400"
          style={{
            background: `linear-gradient(90deg, ${SN.cyan} 0%, ${SN.cyan} ${(tick / (TICK_COUNT - 1)) * 100}%, rgba(255,255,255,0.08) ${(tick / (TICK_COUNT - 1)) * 100}%, rgba(255,255,255,0.08) 100%)`,
          }}
          aria-label="Simulation heartbeat"
        />
        <span className="w-24 shrink-0 text-right tabular-nums text-zinc-300">
          HB {tick + 1}/{TICK_COUNT} · {tickLabel(tick)}
        </span>
      </div>
      <div className="flex justify-between text-[9px] text-zinc-600">
        {Array.from({ length: TICK_COUNT }, (_, i) => (
          <span
            key={i}
            className={i === tick ? 'text-cyan-400' : ''}
            style={{ width: `${100 / TICK_COUNT}%`, textAlign: 'center' }}
          >
            {i % 2 === 0 ? `D${i / 2}` : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
