const DEMOGRAPHICS = [
  { type: 'elderly', label: 'Elderly', color: '#ffd166', speed: 0.3, needsMedical: true, icon: '👴' },
  { type: 'family',  label: 'Family',  color: '#39d0d8', speed: 0.6, needsMedical: false, icon: '👨‍👩‍👧' },
  { type: 'adult',   label: 'Adult',   color: '#388bfd', speed: 0.9, needsMedical: false, icon: '🧑' },
  { type: 'disabled',label: 'Disabled',color: '#ff8c42', speed: 0.2, needsMedical: true,  icon: '♿' },
  { type: 'child',   label: 'Child',   color: '#3ddc84', speed: 0.5, needsMedical: false, icon: '👦' },
]

// Tampa Bay bounding box — agents spawn inside city areas
const TAMPA_ZONES = [
  { name: 'Downtown Tampa',   lngMin: -82.48, lngMax: -82.42, latMin: 27.93, latMax: 27.97, weight: 3 },
  { name: 'Ybor City',        lngMin: -82.44, lngMax: -82.40, latMin: 27.95, latMax: 27.98, weight: 2 },
  { name: 'Hyde Park',        lngMin: -82.50, lngMax: -82.46, latMin: 27.92, latMax: 27.95, weight: 2 },
  { name: 'South Tampa',      lngMin: -82.52, lngMax: -82.44, latMin: 27.88, latMax: 27.93, weight: 2 },
  { name: 'Seminole Heights', lngMin: -82.47, lngMax: -82.42, latMin: 27.98, latMax: 28.02, weight: 1 },
  { name: 'Westchase',        lngMin: -82.62, lngMax: -82.54, latMin: 28.04, latMax: 28.09, weight: 1 },
  { name: 'Brandon',          lngMin: -82.32, lngMax: -82.24, latMin: 27.92, latMax: 27.96, weight: 2 },
  { name: 'St. Pete Beach',   lngMin: -82.76, lngMax: -82.70, latMin: 27.72, latMax: 27.78, weight: 1 },
]

function weightedRandom(zones) {
  const totalWeight = zones.reduce((s, z) => s + z.weight, 0)
  let r = Math.random() * totalWeight
  for (const z of zones) {
    r -= z.weight
    if (r <= 0) return z
  }
  return zones[zones.length - 1]
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

export function generateAgents(count = 80) {
  const agents = []

  for (let i = 0; i < count; i++) {
    const demo = DEMOGRAPHICS[Math.floor(Math.random() * DEMOGRAPHICS.length)]
    const zone = weightedRandom(TAMPA_ZONES)

    const lng = randomBetween(zone.lngMin, zone.lngMax)
    const lat = randomBetween(zone.latMin, zone.latMax)

    agents.push({
      id: `agent-${i}`,
      ...demo,
      neighborhood: zone.name,
      position: { lng, lat },
      originPosition: { lng, lat },
      assignedZoneId: null,
      status: 'waiting', // waiting | evacuating | arrived | stranded
      progress: 0,       // 0-1 along route
      route: null,       // array of [lng, lat] waypoints
      distanceToZone: null,
      eta: null,
    })
  }

  return agents
}

export { DEMOGRAPHICS }