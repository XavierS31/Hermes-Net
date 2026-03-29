import type { AlertLevel, ResidentStatus } from '../types'

export function circlePolygon(
  lng: number,
  lat: number,
  radiusDeg: number,
  points = 48,
): [number, number][] {
  const coords: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * 2 * Math.PI
    coords.push([lng + radiusDeg * Math.cos(a), lat + radiusDeg * Math.sin(a)])
  }
  return coords
}

// RGBA tuples for Deck.gl
export function agentFill(
  status: ResidentStatus,
  alert: AlertLevel,
  selected: boolean,
): [number, number, number, number] {
  if (selected) return [255, 255, 255, 255]
  if (status === 'safe') return [16, 185, 129, 230]
  if (status === 'evacuating') return [34, 211, 238, 240]
  switch (alert) {
    case 'emergency': return [239, 68, 68, 220]
    case 'warning':   return [249, 115, 22, 210]
    case 'advisory':  return [245, 158, 11, 200]
    default:          return [100, 116, 139, 170]
  }
}

export function agentStroke(selected: boolean): [number, number, number, number] {
  return selected ? [255, 255, 255, 255] : [0, 0, 0, 0]
}

export const ALERT_COLORS: Record<AlertLevel, string> = {
  monitor:   '#64748B',
  advisory:  '#F59E0B',
  warning:   '#F97316',
  emergency: '#EF4444',
}

export const ALERT_LABELS: Record<AlertLevel, string> = {
  monitor:   'MONITOR',
  advisory:  'ADVISORY',
  warning:   'WARNING',
  emergency: 'EMERGENCY',
}

export interface Mood {
  label: string
  color: string
}

export function getMood(status: ResidentStatus, alert: AlertLevel, progress: number): Mood {
  if (status === 'safe') return { label: 'RELIEVED', color: '#10B981' }
  if (status === 'evacuating') {
    if (progress > 0.75) return { label: 'FOCUSED',  color: '#22D3EE' }
    if (progress > 0.35) return { label: 'MOVING',   color: '#60A5FA' }
    return                      { label: 'ANXIOUS',  color: '#F59E0B' }
  }
  switch (alert) {
    case 'emergency': return { label: 'PANICKED',   color: '#EF4444' }
    case 'warning':   return { label: 'ALARMED',    color: '#F97316' }
    case 'advisory':  return { label: 'CONCERNED',  color: '#F59E0B' }
    default:          return { label: 'UNAWARE',    color: '#64748B' }
  }
}

export const ZONE_LABELS: Record<string, string> = {
  A: 'Coastal — highest risk',
  B: 'Near coastal',
  C: 'Moderate risk',
  D: 'Lower risk',
  E: 'Inland — lowest risk',
}

export type HurricaneOrigin =
  | 'south' | 'southeast' | 'east' | 'northeast'
  | 'north' | 'northwest' | 'west' | 'southwest'

// All hurricane paths [lng, lat] — mirror of backend geography.py
export const HURRICANE_PATHS: Record<HurricaneOrigin, [number, number][]> = {
  south:     [[-80.2,24.5],[-81.0,25.4],[-81.8,26.2],[-82.3,26.9],[-82.5,27.4],[-82.6,27.9]],
  southeast: [[-79.5,25.0],[-80.4,25.8],[-81.1,26.5],[-81.7,27.0],[-82.1,27.5],[-82.5,27.9]],
  east:      [[-79.8,27.9],[-80.6,27.9],[-81.2,27.9],[-81.7,27.9],[-82.1,27.9],[-82.5,27.9]],
  northeast: [[-79.8,30.0],[-80.5,29.4],[-81.2,28.9],[-81.8,28.5],[-82.2,28.1],[-82.5,27.9]],
  north:     [[-82.5,30.8],[-82.5,30.2],[-82.5,29.5],[-82.5,28.8],[-82.5,28.2],[-82.5,27.9]],
  northwest: [[-85.5,30.5],[-84.5,30.0],[-83.7,29.4],[-83.1,28.8],[-82.7,28.2],[-82.5,27.9]],
  west:      [[-87.5,27.9],[-86.0,27.9],[-84.5,27.9],[-83.5,27.9],[-82.9,27.9],[-82.5,27.9]],
  southwest: [[-85.5,24.8],[-84.5,25.5],[-83.8,26.3],[-83.2,26.9],[-82.8,27.4],[-82.5,27.9]],
}

// Default / backward compat
export const HURRICANE_PATH = HURRICANE_PATHS.south

// Tampa storm surge polygons
export const SURGE_POLYGONS: { polygon: [number, number][]; heightFt: number }[] = [
  {
    polygon: [
      [-82.78, 27.72], [-82.65, 27.72], [-82.6, 27.85],
      [-82.7, 27.92],  [-82.82, 27.88], [-82.78, 27.72],
    ],
    heightFt: 14,
  },
  {
    polygon: [
      [-82.55, 27.68], [-82.42, 27.7], [-82.38, 27.8],
      [-82.48, 27.88], [-82.58, 27.82], [-82.55, 27.68],
    ],
    heightFt: 9,
  },
  {
    polygon: [
      [-82.9, 27.95], [-82.78, 27.93], [-82.75, 28.02],
      [-82.88, 28.05], [-82.9, 27.95],
    ],
    heightFt: 6,
  },
]
