export type AlertLevel = 'monitor' | 'advisory' | 'warning' | 'emergency'
export type ResidentStatus = 'waiting' | 'evacuating' | 'safe'
export type Mobility = 'normal' | 'limited'
export type Zone = 'A' | 'B' | 'C' | 'D' | 'E'

export interface Resident {
  id: number
  zone: Zone
  has_car: boolean
  mobility: Mobility
  status: ResidentStatus
  lat: number
  lng: number
  progress: number
  assigned_shelter: string | null
  assigned_bridge: string | null
  /** Holland wind field at agent position (mph) */
  local_wind_speed_mph?: number
  /** Surge heuristic incl. quadrant + Tampa funnel (ft) */
  local_surge_height_ft?: number
  /** 0–1 normalized exposure */
  wind_exposure?: number
  /** Surge > threshold while not yet safe */
  is_trapped?: boolean
}

export interface Hurricane {
  lat: number
  lng: number
  distance_to_tampa: number
  wind_speed: number
  category: number
  bearing_deg?: number
  forward_speed_mph?: number
  rmw_nm?: number
  r34_nm?: number
  position_uncertainty_nm?: number
  central_pressure_mb?: number
  /** [lng, lat][] from backend */
  track_history?: number[][]
  /** Holland B, funnel flag, etc. */
  physics?: Record<string, unknown>
}

export interface Bridge {
  name: string
  lat: number
  lng: number
  capacity: number
  current_load: number
  route: string
  closed?: boolean
  local_wind_mph?: number
}

export interface Shelter {
  name: string
  lat: number
  lng: number
  capacity: number
  occupancy: number
  requires_car: boolean
  distance_miles: number
}

export interface AiPlan {
  shelter_ranking?: string[]
  notes?: string
  updated_tick?: number
}

export interface SimState {
  tick: number
  alert_level: AlertLevel
  hurricane: Hurricane
  bridges: Record<string, Bridge>
  shelters: Record<string, Shelter>
  residents: Resident[]
  /** Set by Meteorology Coordinator from trajectory + LLM (not hardcoded geography rules). */
  ai_plan?: AiPlan
  forecast_snapshot?: Record<string, unknown> | null
}
