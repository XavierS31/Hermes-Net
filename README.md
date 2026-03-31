<p align="center">
  <img src="vite-project/src/assets/Hermes.png" alt="Hermes" width="420" />
</p>

# Hermes

**Hermes** is a hurricane evacuation command-center experience for the Tampa Bay region. It combines a Mapbox-powered 3D map, a configurable storm track, AI-assisted safe-zone placement, and a civilian evacuation simulation with demographic-aware routing.

The project name references the messenger of the gods: the app aims to turn storm uncertainty into a clearer, coordinated picture for planning and visualization.

---

## What it does

- **Landing page** (`/`) — Hero video, branding, and navigation into the simulator.
- **Simulation** (`/simulate`) — Full-screen dashboard:
  - **Storm configuration** — Preset storms (e.g. Irma 2017, Ian 2022) or a custom origin/destination path picked on the map.
  - **Safe zones** — Request AI-generated evacuation sites (via the Python API) or use built-in fallbacks when the API is unavailable.
  - **Agents** — Spawn weighted demographic “civilians” (elderly, families, children, disabled, adults) across Tampa Bay neighborhoods; assign them to zones and animate evacuation along **road routes** from the Mapbox Directions API (with straight-line fallback).
  - **Map** — Dark Mapbox style, extruded buildings, sky/atmosphere, hurricane track and cone, 2D/3D hurricane visuals, safe-zone markers, agent markers, and evacuation polylines.
  - **Command center** — Tabs for agents, zones (capacity, supplies), and event logs.

---

## Tech stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | [Vite](https://vitejs.dev/), [React](https://react.dev/), [React Router](https://reactrouter.com/), [react-map-gl](https://visgl.github.io/react-map-gl/) + [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) 3, [Three.js](https://threejs.org/) (3D overlays), [Zustand](https://github.com/pmndrs/zustand) (state), [Framer Motion](https://www.framer.com/motion/) (animations), [Axios](https://axios-http.com/), [Turf.js](https://turfjs.org/), [Lucide React](https://lucide.dev/) |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), [WebSockets](https://websockets.readthedocs.io/), [Pydantic](https://docs.pydantic.dev/) |
| **AI (backend)** | [Google ADK](https://google.github.io/adk-docs/) (`google-adk`) with **Gemini** models (`gemini-1.5-flash`) for safe-zone generation and batch civilian “decisions”; requires `GOOGLE_API_KEY` (or `GEMINI_API_KEY` as fallback) |

---

## Repository structure

```
Hermes/
├── README.md                          ← this file
└── Hermes-Net/
    ├── vite-project/                  ← React frontend (main app)
    │   ├── src/
    │   │   ├── main.jsx               ← Routes: / → HomePage, /simulate → App
    │   │   ├── homepage.tsx           ← Landing page
    │   │   ├── App.jsx                ← Simulation layout (map + sidebars + controls)
    │   │   ├── store/
    │   │   │   └── simulationStore.js ← Zustand: hurricane, agents, zones, sim status
    │   │   ├── hooks/
    │   │   │   ├── useSimulation.js   ← Client-side tick loop, Mapbox routing
    │   │   │   ├── useHurricane.js    ← Path + GeoJSON for the storm
    │   │   │   └── useWebSocket.js    ← Optional backend WS (connection disabled by default)
    │   │   ├── utils/
    │   │   │   ├── hurricanePath.js   ← Track / interpolation
    │   │   │   ├── shortestRoute.js   ← Zone assignment + Mapbox Directions
    │   │   │   └── agentDemographics.js
    │   │   └── components/
    │   │       ├── Map/               ← MapView, layers (hurricane, agents, zones, routes)
    │   │       ├── Sidebar/           ← LeftPanel (storm), RightPanel (agents/zones/logs)
    │   │       └── UI/                ← StatusBar, SimControls, SafeZonePanel
    │   ├── vite.config.js             ← Dev server port 5173; proxies /api → :8000
    │   └── package.json
    └── hurricane-backend/
        └── hurricane-backend/         ← Python API
            ├── main.py                ← FastAPI app, REST + /ws/simulation
            ├── agents/                ← LLM agents: zone, civilian, coordinator
            ├── models/                ← Pydantic models
            ├── simulation/            ← Engine, hurricane math, routing
            └── requirements.txt
```

---

## Frontend ↔ backend integration

- **Development proxy** — `vite-project/vite.config.js` proxies `/api` to `http://localhost:8000`. The UI calls `POST /api/generate-safe-zones` with storm parameters; the backend uses Gemini (via Google ADK) to propose named safe zones in the Tampa Bay region.
- **Client-side simulation** — The primary `/simulate` experience runs the evacuation loop in the browser (`useSimulation.js`): hurricane motion along a spline path, agent movement along fetched routes, pause/reset, and speed multipliers.
- **Optional server-side simulation** — The backend exposes `POST /api/start-simulation`, pause/resume/reset, `GET /api/state`, and `WebSocket /ws/simulation` for a Python `SimulationEngine` that can broadcast ticks and logs. The React hook `useWebSocket.js` is wired for this but **does not connect by default** (`connect()` is commented out), so the app works without the backend for map-only or mock flows.

---

## Prerequisites

- **Node.js** (current LTS recommended) for the frontend.
- **Python 3.11+** recommended for the backend (per `requirements.txt` notes).
- **Mapbox** account — a public **access token** for maps and Directions API calls.
- **Google AI** — `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) for backend LLM features.

---

## Environment variables

### Frontend (`Hermes-Net/vite-project/`)

Create `.env` in `vite-project` (not committed):

| Variable | Purpose |
|----------|---------|
| `VITE_MAPBOX_TOKEN` | Mapbox `pk.` token — required for the map and road routing. Without it, the map shows a configuration message. |

### Backend (`Hermes-Net/hurricane-backend/hurricane-backend/`)

Create `.env` in `hurricane-backend`:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_API_KEY` | Primary key for Gemini / Google ADK |
| `GEMINI_API_KEY` | Used only if `GOOGLE_API_KEY` is unset |

---

## Running locally

### 1. Frontend

```bash
cd Hermes-Net/vite-project
npm install
npm run dev
```

Open **http://localhost:5173** — the landing page is `/`, the simulator is **http://localhost:5173/simulate**.

### 2. Backend (optional, for AI safe zones and server-driven simulation)

```bash
cd Hermes-Net/hurricane-backend/hurricane-backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check: **GET http://localhost:8000/health**

With both services running, the Vite dev proxy forwards `/api/*` to the backend automatically.

---

## Scripts (frontend)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build (ES2022 target for Mapbox workers) |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Features in detail

- **Hurricane presets** — Irma, Ian, and a custom path with map picking for origin/destination.
- **Safe zones** — LLM suggests five venues with capacity and supply metadata; invalid or empty responses fall back to a static list in `zone_agent.py`.
- **Agents** — Randomized demographics and Tampa neighborhoods; priority-based zone scoring then per-agent Mapbox driving routes.
- **Visualization** — 2D hurricane spiral/track/cone, Three.js particle-style hurricane layer, 3D cylinders for agents and zones, evacuation routes on the map.

---

## License


---

## Contributing / development notes

- Mapbox GL v3 expects modern JS; the Vite build targets **ES2022** to avoid worker issues.
- CORS on the FastAPI app allows `http://localhost:5173` and `http://localhost:5174`.
- Do not commit `.env` files or API keys; use the patterns above locally.
