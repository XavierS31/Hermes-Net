// Assign agents to safe zones and compute simple straight-line routes
// In production, replace with Mapbox Directions API or your FastAPI routing

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

// Assign each agent to the best safe zone considering:
// 1. Distance to zone
// 2. Remaining capacity
// 3. Medical availability for those who need it
export function assignAgentsToZones(agents, safeZones) {
  // Track remaining capacity
  const remaining = {}
  safeZones.forEach(z => { remaining[z.id] = z.capacity })

  const assignments = []

  // Sort agents: disabled & elderly first (priority evacuation)
  const sorted = [...agents].sort((a, b) => {
    const priority = (ag) => ag.type === 'disabled' || ag.type === 'elderly' ? 0 : 1
    return priority(a) - priority(b)
  })

  for (const agent of sorted) {
    // Score each zone
    const scored = safeZones
      .filter(z => remaining[z.id] > 0)
      .map(z => {
        const dist = haversineKm(agent.position, { lat: z.lat, lng: z.lng })
        let score = dist

        // Prefer zones with medical supplies for those who need it
        if (agent.needsMedical && z.supplies?.medical > 0) score *= 0.6

        // Penalize nearly-full zones
        const fillRatio = 1 - remaining[z.id] / z.capacity
        score *= (1 + fillRatio * 0.5)

        return { zone: z, score, dist }
      })
      .sort((a, b) => a.score - b.score)

    if (scored.length === 0) {
      assignments.push({ agentId: agent.id, zoneId: null, route: null, distanceKm: null, etaHours: null })
      continue
    }

    const best = scored[0]
    remaining[best.zone.id]--

    // Build a simple 2-point route (straight line)
    // In production: fetch from Mapbox Directions or FastAPI
    const route = buildStraightRoute(agent.position, { lat: best.zone.lat, lng: best.zone.lng })
    const etaHours = best.dist / (agent.speed * 80) // speed factor, max ~80 km/h

    assignments.push({
      agentId: agent.id,
      zoneId: best.zone.id,
      route,
      distanceKm: parseFloat(best.dist.toFixed(2)),
      etaHours: parseFloat(etaHours.toFixed(2)),
    })
  }

  return assignments
}

function buildStraightRoute(from, to) {
  // Simple straight line with a few waypoints
  const steps = 10
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    coords.push([
      from.lng + (to.lng - from.lng) * t,
      from.lat + (to.lat - from.lat) * t,
    ])
  }
  return coords // array of [lng, lat]
}

export function routesToGeoJSON(agents) {
  return {
    type: 'FeatureCollection',
    features: agents
      .filter(a => a.route && a.route.length > 1)
      .map(a => ({
        type: 'Feature',
        properties: {
          agentId: a.id,
          type: a.type,
          color: a.color,
          status: a.status,
        },
        geometry: {
          type: 'LineString',
          coordinates: a.route,
        },
      })),
  }
}