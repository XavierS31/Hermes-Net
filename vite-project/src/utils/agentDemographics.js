// ── Name pools ────────────────────────────────────────────────
const FIRST_NAMES = {
  elderly:  ['Dorothy', 'Harold', 'Beatrice', 'Norman', 'Evelyn', 'Walter', 'Mildred', 'Eugene', 'Agnes', 'Frank', 'Lorraine', 'Herbert'],
  family:   ['Jennifer', 'Carlos', 'Sarah', 'Marcus', 'Amy', 'David', 'Maria', 'Kevin', 'Jessica', 'Robert', 'Alicia', 'Darnell'],
  adult:    ['Tyler', 'Priya', 'Dylan', 'Sofia', 'Jake', 'Aisha', 'Connor', 'Destiny', 'Brandon', 'Naomi', 'Chase', 'Valentina'],
  disabled: ['Robert', 'Linda', 'Michael', 'Patricia', 'James', 'Barbara', 'William', 'Susan', 'Anthony', 'Donna'],
  child:    ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Isabella', 'Mason', 'Sophia', 'Logan', 'Mia', 'Jackson'],
}

const LAST_NAMES = [
  'Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Martinez', 'Davis',
  'Lopez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Nguyen', 'Jackson', 'White',
  'Harris', 'Martin', 'Thompson', 'Young', 'Hernandez', 'Lewis', 'Walker', 'Robinson',
]

// ── Age ranges by demographic ─────────────────────────────────
const AGE_RANGES = {
  elderly:  [68, 89],
  family:   [28, 52],
  adult:    [22, 45],
  disabled: [35, 72],
  child:    [8, 15],
}

// ── Realistic personal situations ────────────────────────────
const SITUATIONS = {
  elderly: [
    'Lives alone in a ground-floor apartment with her cat; no car and limited mobility',
    'Retired veteran who has lived in his home for 40 years and refuses to abandon it',
    'Lives with her adult daughter, but daughter is stranded at work across town',
    'Heart condition requiring daily medication; fears disruption to her care routine',
    'Cares for a bedridden spouse; evacuating together requires special transport',
    'Deaf and partially blind; missed early warning alerts on television',
    'No nearby family and relies on a neighbor who has already evacuated',
    'Fixed income, no savings for a hotel; shelter options feel overwhelming',
  ],
  family: [
    'Two young children ages 3 and 6; wife is 8 months pregnant with no hospital bag packed',
    'Three kids in school, spouse works nights, and they share one car',
    'Parent of a child with autism who becomes violent with sudden routine changes',
    'Multi-generational household with two elderly grandparents who cannot walk far',
    'Single mother with twin toddlers, no nearby family support, and no gas in the car',
    'Both parents are first responders on mandatory duty, leaving teenagers home alone',
    'Foster family with four children in their care; navigation and paperwork is complex',
  ],
  adult: [
    'Storm photographer who wants to document the hurricane from his balcony',
    'Recent Tampa transplant from Ohio with no hurricane experience, paralyzed with fear',
    'Nurse at Tampa General Hospital, torn between her safety and duty to her patients',
    'Owns a waterfront restaurant; convinced he can protect it and fears looting',
    'Has a large dog that shelters refuse to accept; will not leave the animal behind',
    'Stocked two weeks of bottled water and food; believes she can safely ride it out',
    'College student hosting a hurricane party, openly dismissing evacuation warnings',
    'Rideshare driver who cannot afford lost income; plans to work through the storm',
  ],
  disabled: [
    'Uses a power wheelchair; lives on the second floor of a building with no elevator',
    'Requires dialysis three times a week; the nearest center is in the evacuation zone',
    'Blind, relies on a guide dog and a caretaker who has not yet arrived',
    'Severe PTSD from a past disaster; loud sirens and chaos trigger panic attacks',
    'ALS patient on a ventilator; any power loss is an immediate life-threatening risk',
    'Paraplegic living alone; pre-registered special-needs transport was already overbooked',
    'Traumatic brain injury survivor; cannot process urgent situations without support',
  ],
  child: [
    'Home alone after school; parents are stuck in evacuation traffic and unreachable by phone',
    'At soccer practice when alerts came out; coach is managing twelve kids with too few cars',
    'Has severe asthma; stress and airborne debris have already triggered breathing problems',
    'Thirteen years old, caring for a younger sibling while parent works a mandatory double shift',
    'Trying to follow family evacuation plan alone after getting separated at the shelter intake',
  ],
}

// ── Personality traits ────────────────────────────────────────
const PERSONALITIES = [
  'cautious and follows official instructions to the letter',
  'stubborn and deeply resistant to leaving familiar surroundings',
  'panicked and unable to make clear decisions under pressure',
  'calm and methodical, assesses risk before acting',
  'selfless, focused on helping neighbors before helping themselves',
  'in denial about the storm severity, convinced forecasters are overstating it',
  'fiercely protective of family, will do anything to keep them together',
  'resourceful but slow to act without a concrete plan',
  'anxious but compliant, needs clear direction to move',
  'overconfident, has survived storms before and underestimates this one',
]

// ── Core demographic profiles ─────────────────────────────────
const DEMOGRAPHICS = [
  { type: 'elderly',  label: 'Elderly',  color: '#ffd166', speed: 0.3, needsMedical: true,  icon: '👴' },
  { type: 'family',   label: 'Family',   color: '#39d0d8', speed: 0.6, needsMedical: false, icon: '👨‍👩‍👧' },
  { type: 'adult',    label: 'Adult',    color: '#388bfd', speed: 0.9, needsMedical: false, icon: '🧑' },
  { type: 'disabled', label: 'Disabled', color: '#ff8c42', speed: 0.2, needsMedical: true,  icon: '♿' },
  { type: 'child',    label: 'Child',    color: '#3ddc84', speed: 0.5, needsMedical: false, icon: '👦' },
]

// ── Spawn zones — Tampa Bay (in danger zone) + inland/east (outside) ──
const TAMPA_ZONES = [
  // In hurricane danger zone
  { name: 'Downtown Tampa',   lngMin: -82.48, lngMax: -82.42, latMin: 27.93, latMax: 27.97, weight: 3 },
  { name: 'Ybor City',        lngMin: -82.44, lngMax: -82.40, latMin: 27.95, latMax: 27.98, weight: 2 },
  { name: 'Hyde Park',        lngMin: -82.50, lngMax: -82.46, latMin: 27.92, latMax: 27.95, weight: 2 },
  { name: 'South Tampa',      lngMin: -82.52, lngMax: -82.44, latMin: 27.88, latMax: 27.93, weight: 2 },
  { name: 'Seminole Heights', lngMin: -82.47, lngMax: -82.42, latMin: 27.98, latMax: 28.02, weight: 1 },
  { name: 'Westchase',        lngMin: -82.62, lngMax: -82.54, latMin: 28.04, latMax: 28.09, weight: 1 },
  { name: 'Brandon',          lngMin: -82.32, lngMax: -82.24, latMin: 27.92, latMax: 27.96, weight: 2 },
  { name: 'St. Pete Beach',   lngMin: -82.76, lngMax: -82.70, latMin: 27.72, latMax: 27.78, weight: 1 },
  // Outside hurricane path (~140-180 km from track) — agents here won't evacuate
  { name: 'Orlando',          lngMin: -81.45, lngMax: -81.32, latMin: 28.48, latMax: 28.60, weight: 2 },
  { name: 'Daytona Beach',    lngMin: -81.08, lngMax: -80.98, latMin: 29.16, latMax: 29.26, weight: 1 },
]

// ── Helpers ───────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function weightedRandom(zones) {
  const total = zones.reduce((s, z) => s + z.weight, 0)
  let r = Math.random() * total
  for (const z of zones) { r -= z.weight; if (r <= 0) return z }
  return zones[zones.length - 1]
}

function randomInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)) }

// ── Main export ───────────────────────────────────────────────
export function generateAgents(count = 80) {
  return Array.from({ length: count }, (_, i) => {
    const demo    = pick(DEMOGRAPHICS)
    const zone    = weightedRandom(TAMPA_ZONES)
    const [ageMin, ageMax] = AGE_RANGES[demo.type]
    const firstName = pick(FIRST_NAMES[demo.type])
    const lastName  = pick(LAST_NAMES)

    return {
      id:             `agent-${i}`,
      ...demo,
      name:           `${firstName} ${lastName}`,
      age:            randomInt(ageMin, ageMax),
      situation:      pick(SITUATIONS[demo.type]),
      personality:    pick(PERSONALITIES),
      neighborhood:   zone.name,
      position:       {
        lng: zone.lngMin + Math.random() * (zone.lngMax - zone.lngMin),
        lat: zone.latMin + Math.random() * (zone.latMax - zone.latMin),
      },
      originPosition: null,   // filled after position is set below
      assignedZoneId: null,
      status:         'waiting',
      progress:       0,
      route:          null,
      distanceKm:     null,
      etaHours:       null,
      aiDecision:     null,
    }
  }).map(a => ({ ...a, originPosition: { ...a.position } }))
}

export { DEMOGRAPHICS }
