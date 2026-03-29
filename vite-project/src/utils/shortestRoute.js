// Road-aware routing via Mapbox Directions API.
// Falls back to straight line if the token is missing or the API fails.

function haversineKm(a, b) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function buildStraightRoute(from, to, steps = 12) {
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    coords.push([from.lng + (to.lng - from.lng) * t, from.lat + (to.lat - from.lat) * t])
  }
  return coords
}

// Fetch an actual road-following route from Mapbox Directions API.
// Returns { coords: [[lng,lat],…], distanceKm: number }
async function fetchRoadRoute(from, to) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token) {
    return { coords: buildStraightRoute(from, to), distanceKm: haversineKm(from, to) }
  }
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?geometries=geojson&overview=full&access_token=${token}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.routes?.[0]) {
      return {
        coords: data.routes[0].geometry.coordinates,
        distanceKm: data.routes[0].distance / 1000,
      }
    }
  } catch (e) {
    console.warn('Mapbox Directions fallback:', e.message)
  }
  return { coords: buildStraightRoute(from, to), distanceKm: haversineKm(from, to) }
}

// ── Demographic priority (lower = evacuated first) ────────────
const DEMO_PRIORITY = { disabled: 0, elderly: 1, child: 2, family: 3, adult: 4 }

// Zone score for an agent — balances travel time, medical access, capacity
function scoreZone(agent, zone, dist, remainingCap) {
  // Score in travel-time hours (dist / effective speed)
  let score = dist / (agent.speed * 80)

  // Medical bonus: disabled & elderly are penalised heavily if no medical
  if (agent.needsMedical) {
    score *= zone.supplies?.medical > 0 ? 0.5 : 1.8
  }

  // Capacity pressure: discourage nearly-full zones
  const fillRatio = 1 - remainingCap / zone.capacity
  score *= (1 + fillRatio * 0.5)

  return score
}

// ── Main export — async because road routing hits the network ──
export async function assignAgentsToZones(agents, safeZones) {
  const remaining = {}
  safeZones.forEach(z => { remaining[z.id] = z.capacity })

  // Phase 1: zone assignment using fast straight-line scoring (no API calls)
  const sorted = [...agents].sort((a, b) =>
    (DEMO_PRIORITY[a.type] ?? 3) - (DEMO_PRIORITY[b.type] ?? 3)
  )

  const preAssign = []
  for (const agent of sorted) {
    const candidates = safeZones
      .filter(z => remaining[z.id] > 0)
      .map(z => ({
        zone: z,
        score: scoreZone(agent, z, haversineKm(agent.position, { lat: z.lat, lng: z.lng }), remaining[z.id]),
      }))
      .sort((a, b) => a.score - b.score)

    if (!candidates.length) {
      preAssign.push({ agentId: agent.id, zoneId: null, route: null, distanceKm: null, etaHours: null })
      continue
    }

    const { zone } = candidates[0]
    remaining[zone.id]--
    preAssign.push({
      agentId:    agent.id,
      zoneId:     zone.id,
      agentPos:   agent.position,
      zonePos:    { lat: zone.lat, lng: zone.lng },
      agentSpeed: agent.speed,
    })
  }

  // Phase 2: fetch road routes for all assigned agents in parallel
  const results = await Promise.all(
    preAssign.map(async asgn => {
      if (!asgn.zoneId) return asgn

      const { coords, distanceKm } = await fetchRoadRoute(asgn.agentPos, asgn.zonePos)
      return {
        agentId:    asgn.agentId,
        zoneId:     asgn.zoneId,
        route:      coords,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        etaHours:   parseFloat((distanceKm / (asgn.agentSpeed * 80)).toFixed(2)),
      }
    })
  )

  return results
}

export function routesToGeoJSON(agents) {
  return {
    type: 'FeatureCollection',
    features: agents
      .filter(a => a.route && a.route.length > 1)
      .map(a => ({
        type: 'Feature',
        properties: { agentId: a.id, type: a.type, color: a.color, status: a.status },
        geometry: { type: 'LineString', coordinates: a.route },
      })),
  }
}
