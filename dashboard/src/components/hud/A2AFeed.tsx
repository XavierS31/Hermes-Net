import { useEffect, useRef } from 'react'
import { useC2 } from '../../context/C2Context'
import { SN } from '../../theme/tokens'

function formatTime(d: Date) {
  return d.toTimeString().slice(0, 8)
}

export function A2AFeed() {
  const { logs } = useC2()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div
      className="pointer-events-auto absolute bottom-28 left-3 z-30 flex h-[200px] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-lg border font-mono text-[10px]"
      style={{
        borderColor: SN.border,
        background: 'rgba(11, 11, 12, 0.82)',
        backdropFilter: 'blur(22px)',
      }}
    >
      <div
        className="border-b px-3 py-1.5 text-[9px] uppercase tracking-[0.25em]"
        style={{
          borderColor: `${SN.cyan}22`,
          color: SN.cyan,
        }}
      >
        A2A · JSON-RPC 2.0 live
      </div>
      <div className="custom-scroll flex-1 overflow-y-auto px-3 py-2 leading-relaxed text-zinc-400">
        {logs.length === 0 && (
          <span className="text-zinc-600">Awaiting telemetry…</span>
        )}
        {logs.map((line) => (
          <p key={line.id} className="mb-1 break-all">
            <span className="text-zinc-600">[{formatTime(line.ts)}]</span>{' '}
            <span
              style={{
                color:
                  line.level === 'alert'
                    ? SN.crimson
                    : line.level === 'rpc'
                      ? SN.cyan
                      : '#a1a1aa',
              }}
            >
              {line.level === 'alert' ? 'ALERT' : line.level === 'rpc' ? 'RPC' : 'SYS'}
            </span>
            : {line.text}
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
