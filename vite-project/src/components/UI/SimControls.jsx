import { useSimStore } from '../../store/simulationStore'
import { useSimulation } from '../../hooks/useSimulation'
import styles from './SimControls.module.css'

export default function SimControls() {
  const status = useSimStore(s => s.status)
  const speed = useSimStore(s => s.speed)
  const setStatus = useSimStore(s => s.setStatus)
  const setSpeed = useSimStore(s => s.setSpeed)
  const resetSim = useSimStore(s => s.resetSim)
  const { startSimulation } = useSimulation()

  const canStart = status === 'idle' || status === 'paused'
  const canPause = status === 'running'
  const canReset = status !== 'idle'

  return (
    <div className={styles.controls}>
      {/* Speed */}
      <div className={styles.speedGroup}>
        {[0.5, 1, 2, 5].map(s => (
          <button
            key={s}
            className={`${styles.speedBtn} ${speed === s ? styles.activeSpeed : ''}`}
            onClick={() => setSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Play / Pause */}
      {canStart && (
        <button
          className={`${styles.btn} ${styles.play}`}
          onClick={startSimulation}
        >
          <PlayIcon />
          {status === 'paused' ? 'RESUME' : 'START EVAC'}
        </button>
      )}

      {canPause && (
        <button
          className={`${styles.btn} ${styles.pause}`}
          onClick={() => setStatus('paused')}
        >
          <PauseIcon />
          PAUSE
        </button>
      )}

      {/* Reset */}
      {canReset && (
        <button
          className={`${styles.btn} ${styles.reset}`}
          onClick={resetSim}
        >
          <ResetIcon />
          RESET
        </button>
      )}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <polygon points="2,1 11,6 2,11" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="1" width="3" height="10" />
      <rect x="7" y="1" width="3" height="10" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 6A4 4 0 1 1 6 2" />
      <polyline points="6,0 8,2 6,4" />
    </svg>
  )
}