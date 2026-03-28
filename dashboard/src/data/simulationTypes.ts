/** Types for WebSocket `simulation_state` / deck.gl — no procedural generators here. */

export type ResidentStatus = 'moving' | 'stuck' | 'sheltered'

export type TripDatum = {
  id: number
  path: [number, number][]
  timestamps: number[]
  status: ResidentStatus
  zoneId: number
}

export type BridgeState = {
  id: string
  name: string
  position: [number, number]
  vph: number
  wind_mph: number
  closure_risk: number
  capacity_vph: number
  closed: boolean
}

export type EnvironmentState = {
  hurricane_main: [number, number][]
  hurricane_ghost: [number, number][]
  surge_polygons: { polygon: [number, number][]; height_ft: number }[]
}

export type Telemetry = {
  evacuation_percent: number
  wind_speed_mph: number
  category: number
  category_label: string
}

export type HandshakeConfig = {
  tick_hours: number
  tick_count: number
  mission_hours: number
  sim_epoch_utc: string
  mission_deadline_utc: string
}

export type SimulationStatePayload = {
  type: 'simulation_state'
  tick_index: number
  tick_count: number
  tick_hours: number
  simulated_hours_elapsed: number
  server_time_utc: string
  simulation_clock_utc: string
  telemetry: Telemetry
  positions: TripDatum[]
  environment_state: EnvironmentState
  bridges: BridgeState[]
  playing: boolean
}

export function tripColor(
  status: ResidentStatus,
): [number, number, number, number] {
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
