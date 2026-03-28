export type ResidentStatus = 'moving' | 'stuck' | 'sheltered'

export type TripDatum = {
  id: number
  path: [number, number][]
  timestamps: number[]
  status: ResidentStatus
  zoneId: number
}

export type BridgeDatum = {
  id: string
  name: string
  position: [number, number]
  vph: number
  windMph: number
  closureRisk: number
}

/** 7 days × 2 heartbeats/day = 14 ticks (0..13) */
export const TICK_COUNT = 14

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** ~5k micro-agents with paths keyed to 14 heartbeat timestamps (unit: tick index). */
export function generateResidentTrips(count = 5200, seed = 42): TripDatum[] {
  const rand = mulberry32(seed)
  const trips: TripDatum[] = []
  const minLon = -82.85
  const maxLon = -82.15
  const minLat = 27.55
  const maxLat = 28.15

  for (let i = 0; i < count; i++) {
    const ax = lerp(minLon, maxLon, rand())
    const ay = lerp(minLat, maxLat, rand())
    const bx = lerp(minLon, maxLon, rand())
    const by = lerp(minLat, maxLat, rand())
    const r = rand()
    const status: ResidentStatus =
      r < 0.72 ? 'moving' : r < 0.82 ? 'stuck' : 'sheltered'
    const zoneId = Math.floor((ax - minLon) / (maxLon - minLon) * 8) * 10 +
      Math.floor((ay - minLat) / (maxLat - minLat) * 8)

    const path: [number, number][] = []
    const timestamps: number[] = []
    for (let t = 0; t < TICK_COUNT; t++) {
      const f = t / (TICK_COUNT - 1)
      const lon = lerp(ax, bx, f) + (status === 'stuck' ? Math.sin(t * 0.9) * 0.002 : 0)
      const lat = lerp(ay, by, f) + (status === 'moving' ? t * 0.0004 : 0)
      path.push([lon, lat])
      timestamps.push(t)
    }

    trips.push({ id: i, path, timestamps, status, zoneId })
  }
  return trips
}

export function tripColor(status: ResidentStatus): [number, number, number, number] {
  switch (status) {
    case 'moving':
      return [57, 255, 20, 220]
    case 'stuck':
      return [255, 0, 51, 240]
    case 'sheltered':
      return [118, 117, 118, 200]
    default:
      return [200, 200, 200, 200]
  }
}

/** Main + ghost hurricane tracks (lon/lat). */
export function hurricaneTracks() {
  const main: [number, number][] = [
    [-87.5, 26.2],
    [-86.4, 26.5],
    [-85.2, 26.9],
    [-84.0, 27.2],
    [-83.0, 27.6],
    [-82.4, 27.85],
    [-82.0, 27.95],
  ]
  const ghost: [number, number][] = [
    [-87.2, 26.0],
    [-86.0, 26.4],
    [-84.5, 26.8],
    [-83.2, 27.3],
    [-82.2, 27.7],
    [-81.6, 28.0],
  ]
  return { main, ghost }
}

/** Storm surge polygons (rings) + depth in feet for extrusion. */
export function surgePolygons(): {
  polygon: [number, number][]
  heightFt: number
}[] {
  return [
    {
      polygon: [
        [-82.78, 27.72],
        [-82.65, 27.72],
        [-82.6, 27.85],
        [-82.7, 27.92],
        [-82.82, 27.88],
        [-82.78, 27.72],
      ],
      heightFt: 14,
    },
    {
      polygon: [
        [-82.55, 27.68],
        [-82.42, 27.7],
        [-82.38, 27.8],
        [-82.48, 27.88],
        [-82.58, 27.82],
        [-82.55, 27.68],
      ],
      heightFt: 9,
    },
    {
      polygon: [
        [-82.9, 27.95],
        [-82.78, 27.93],
        [-82.75, 28.02],
        [-82.88, 28.05],
        [-82.9, 27.95],
      ],
      heightFt: 6,
    },
  ]
}

export function bridgeLocations(): BridgeDatum[] {
  return [
    {
      id: 'gandy',
      name: 'Gandy Br.',
      position: [-82.64, 27.89],
      vph: 4200,
      windMph: 38,
      closureRisk: 0.12,
    },
    {
      id: 'howard',
      name: 'Howard Frankland',
      position: [-82.68, 27.91],
      vph: 7800,
      windMph: 41,
      closureRisk: 0.18,
    },
    {
      id: 'skyway',
      name: 'Sunshine Skyway',
      position: [-82.63, 27.62],
      vph: 5100,
      windMph: 52,
      closureRisk: 0.44,
    },
  ]
}

/** Category + wind follow tick index for demo (escalates toward landfall). */
export function stormAtTick(tick: number) {
  const windMph = Math.min(175, Math.round(95 + tick * 3.8))
  const cat =
    windMph >= 157 ? 5 : windMph >= 130 ? 4 : windMph >= 111 ? 3 : windMph >= 96 ? 2 : 1
  return { cat, windMph, label: `CAT_0${cat}` }
}
