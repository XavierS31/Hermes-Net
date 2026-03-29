import { useMemo } from 'react'
import { useSimStore } from '../store/simulationStore'
import { buildHurricanePath, pathToGeoJSON } from '../utils/hurricanePath'

export function useHurricane() {
  const hurricane = useSimStore(s => s.hurricane)
  const hurricanePosition = useSimStore(s => s.hurricanePosition)
  const hurricaneRotation = useSimStore(s => s.hurricaneRotation)
  const hurricaneProgress = useSimStore(s => s.hurricaneProgress)

  const controlPoints = useMemo(() => buildHurricanePath(hurricane), [hurricane])
  const pathGeoJSON   = useMemo(() => pathToGeoJSON(controlPoints), [controlPoints])

  const categoryColor = {
    1: '#3ddc84',
    2: '#ffd166',
    3: '#ff8c42',
    4: '#ff4d4d',
    5: '#cc00ff',
  }[hurricane.category] || '#ff4d4d'

  return {
    hurricane,
    hurricanePosition,
    hurricaneRotation,
    hurricaneProgress,
    controlPoints,
    pathGeoJSON,
    categoryColor,
  }
}