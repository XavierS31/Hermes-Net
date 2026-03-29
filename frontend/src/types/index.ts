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
}

export interface Hurricane {
  lat: number
  lng: number
  distance_to_tampa: number
  wind_speed: number
  category: number
}

export interface Bridge {
  name: string
  lat: number
  lng: number
  capacity: number
  current_load: number
  route: string
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

export interface SimState {
  tick: number
  alert_level: AlertLevel
  hurricane: Hurricane
  bridges: Record<string, Bridge>
  shelters: Record<string, Shelter>
  residents: Resident[]
}
