// Interpolate hurricane position along path A → Tampa → B
// Returns { lng, lat } for a given progress t (0 to 1)

const TAMPA_CENTER = { lng: -82.4572, lat: 27.9506 }

function lerp(a, b, t) {
  return a + (b - a) * t
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )
  )
}

export function buildHurricanePath(hurricane) {
  const origin = { lng: hurricane.originLng, lat: hurricane.originLat }
  const dest   = { lng: hurricane.destLng,   lat: hurricane.destLat }

  // Control points: before origin and after dest for smooth curve
  const p0 = {
    lng: origin.lng + (origin.lng - TAMPA_CENTER.lng) * 0.5,
    lat: origin.lat + (origin.lat - TAMPA_CENTER.lat) * 0.5,
  }
  const p3 = {
    lng: dest.lng + (dest.lng - TAMPA_CENTER.lng) * 0.5,
    lat: dest.lat + (dest.lat - TAMPA_CENTER.lat) * 0.5,
  }

  // Waypoints: origin → Tampa → dest (Catmull-Rom spline)
  const controlPoints = [p0, origin, TAMPA_CENTER, dest, p3]

  return controlPoints
}

export function interpolatePosition(controlPoints, t) {
  // t goes from 0 to 1 across the middle 3 segments
  const segments = controlPoints.length - 3
  const scaled = t * segments
  const segIdx = Math.min(Math.floor(scaled), segments - 1)
  const segT   = scaled - segIdx

  const p0 = controlPoints[segIdx]
  const p1 = controlPoints[segIdx + 1]
  const p2 = controlPoints[segIdx + 2]
  const p3 = controlPoints[segIdx + 3]

  return {
    lng: catmullRom(p0.lng, p1.lng, p2.lng, p3.lng, segT),
    lat: catmullRom(p0.lat, p1.lat, p2.lat, p3.lat, segT),
  }
}

export function getHurricaneBearing(controlPoints, t) {
  const dt = 0.001
  const t1 = Math.max(0, t - dt)
  const t2 = Math.min(1, t + dt)
  const a = interpolatePosition(controlPoints, t1)
  const b = interpolatePosition(controlPoints, t2)

  const dLng = b.lng - a.lng
  const dLat = b.lat - a.lat
  return Math.atan2(dLat, dLng) * (180 / Math.PI)
}

// Generate GeoJSON LineString for the full path
export function pathToGeoJSON(controlPoints, steps = 100) {
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const pos = interpolatePosition(controlPoints, i / steps)
    coords.push([pos.lng, pos.lat])
  }
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  }
}

// Distance in km from hurricane eye to a point
export function distanceFromEye(eyePos, point) {
  const R = 6371
  const dLat = (point.lat - eyePos.lat) * Math.PI / 180
  const dLng = (point.lng - eyePos.lng) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(eyePos.lat * Math.PI / 180) *
    Math.cos(point.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}