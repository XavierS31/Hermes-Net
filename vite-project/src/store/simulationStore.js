import { create } from 'zustand'
import { generateAgents } from '../utils/agentDemographics'

const HURRICANE_PRESETS = [
  {
    id: 'irma',
    name: 'Irma (2017)',
    originLng: -80.8,
    originLat: 24.2,
    destLng: -84.2,
    destLat: 30.8,
    category: 4,
    windSpeed: 150,
    color: '#ff4d4d',
  },
  {
    id: 'ian',
    name: 'Ian (2022)',
    originLng: -82.0,
    originLat: 23.8,
    destLng: -83.5,
    destLat: 30.2,
    category: 4,
    windSpeed: 155,
    color: '#ff6b35',
  },
  {
    id: 'custom',
    name: 'Custom Path',
    originLng: -80.5,
    originLat: 24.0,
    destLng: -84.0,
    destLat: 31.0,
    category: 3,
    windSpeed: 120,
    color: '#ffd166',
  },
]

export const useSimStore = create((set, get) => ({
  // ── Simulation ──────────────────────────────────────────────
  status: 'idle', // idle | generating | running | paused | complete
  tick: 0,
  speed: 1,
  elapsedHours: 0,

  // ── Hurricane ───────────────────────────────────────────────
  hurricane: HURRICANE_PRESETS[0],
  hurricanePresets: HURRICANE_PRESETS,
  hurricanePosition: { lng: HURRICANE_PRESETS[0].originLng, lat: HURRICANE_PRESETS[0].originLat },
  hurricaneRotation: 0,
  hurricaneProgress: 0, // 0 → 1

  // ── Safe Zones (AI generated) ────────────────────────────────
  safeZones: [],
  safeZonesLoading: false,
  safeZonesError: null,

  // ── Agents ──────────────────────────────────────────────────
  agents: [],
  selectedAgentId: null,

  // ── Logs ────────────────────────────────────────────────────
  logs: [],

  // ── Map picking mode ────────────────────────────────────────
  pickingMode: null, // null | 'origin' | 'dest'

  // ── Getters ─────────────────────────────────────────────────
  getSelectedAgent: () => {
    const { agents, selectedAgentId } = get()
    return agents.find(a => a.id === selectedAgentId) || null
  },

  // ── Actions ─────────────────────────────────────────────────
  setStatus: (status) => set({ status }),
  setSpeed: (speed) => set({ speed }),

  setHurricanePreset: (id) => {
    const preset = get().hurricanePresets.find(p => p.id === id)
    if (!preset) return
    set({
      hurricane: preset,
      hurricanePosition: { lng: preset.originLng, lat: preset.originLat },
      hurricaneProgress: 0,
      safeZones: [],
      agents: [],
      status: 'idle',
      tick: 0,
      elapsedHours: 0,
      logs: [],
    })
  },

  updateHurricaneCustom: (field, value) => {
    set(state => ({
      hurricane: { ...state.hurricane, [field]: parseFloat(value) || value }
    }))
  },

  setHurricanePosition: (pos) => set({ hurricanePosition: pos }),
  setHurricaneRotation: (r) => set({ hurricaneRotation: r }),
  setHurricaneProgress: (p) => set({ hurricaneProgress: p }),

  setSafeZones: (zones) => set({ safeZones: zones }),
  setSafeZonesLoading: (b) => set({ safeZonesLoading: b }),
  setSafeZonesError: (e) => set({ safeZonesError: e }),

  setAgents: (agents) => set({ agents }),

  updateAgent: (id, patch) =>
    set(state => ({
      agents: state.agents.map(a => a.id === id ? { ...a, ...patch } : a)
    })),

  updateSafeZone: (id, patch) =>
    set(state => ({
      safeZones: state.safeZones.map(z => z.id === id ? { ...z, ...patch } : z)
    })),

  selectAgent: (id) => set({ selectedAgentId: id }),
  setPickingMode: (mode) => set({ pickingMode: mode }),

  addLog: (message, type = 'info') =>
    set(state => ({
      logs: [
        { id: Date.now(), message, type, time: state.elapsedHours },
        ...state.logs.slice(0, 199),
      ]
    })),

  advanceTick: () =>
    set(state => ({
      tick: state.tick + 1,
      elapsedHours: parseFloat((state.elapsedHours + 0.1 * state.speed).toFixed(2)),
    })),

  resetSim: () =>
    set(state => ({
      status: 'idle',
      tick: 0,
      elapsedHours: 0,
      hurricanePosition: { lng: state.hurricane.originLng, lat: state.hurricane.originLat },
      hurricaneProgress: 0,
      hurricaneRotation: 0,
      agents: [],
      safeZones: [],
      logs: [],
      selectedAgentId: null,
    })),

  spawnAgents: (count = 80) => {
    const agents = generateAgents(count)
    set({ agents })
  },
}))