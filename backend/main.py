import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from simulation.model import TampaBayModel
from simulation.agents.resident import ResidentAgent
from simulation.geography import HURRICANE_PATHS, export_for_frontend
from services.trajectory_forecast import fetch_hurricane_trajectory

_BACKEND_DIR = Path(__file__).resolve().parent
# Always load backend/.env (cwd-independent — plain load_dotenv() misses it when uvicorn cwd ≠ backend)
load_dotenv(_BACKEND_DIR / ".env")
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

_origin = "south"
sim = TampaBayModel(n_residents=3, hurricane_origin=_origin)
_connected: set[WebSocket] = set()


def _is_done() -> bool:
    """Simulation is done when all residents are safe or tick exceeds limit."""
    residents = list(sim.agents_by_type[ResidentAgent])
    all_safe = all(r.status == "safe" for r in residents)
    return all_safe or sim.tick >= 25


async def _broadcast(payload: dict) -> None:
    dead: set[WebSocket] = set()
    for ws in _connected:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.add(ws)
    _connected.difference_update(dead)


async def _tick_loop() -> None:
    """Advance sim every 2 s; auto-reset when done so the loop runs continuously."""
    global sim
    while True:
        await asyncio.sleep(2)
        if _is_done():
            sim = TampaBayModel(n_residents=3, hurricane_origin=_origin)
        sim.step()
        await _broadcast(sim.get_state_snapshot())


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(_tick_loop())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"])


@app.get("/state")
def get_state():
    return sim.get_state_snapshot()


@app.post("/tick")
def advance_tick():
    sim.step()
    return sim.get_state_snapshot()


@app.post("/reset")
def reset():
    global sim
    sim = TampaBayModel(n_residents=3, hurricane_origin=_origin)
    return {"status": "reset", "origin": _origin}


@app.post("/hurricane/origin/{origin}")
def set_origin(origin: str):
    global sim, _origin
    if origin not in HURRICANE_PATHS:
        return {"error": f"Unknown origin. Valid: {list(HURRICANE_PATHS.keys())}"}
    _origin = origin
    sim = TampaBayModel(n_residents=3, hurricane_origin=_origin)
    return {"status": "ok", "origin": _origin}


@app.get("/hurricane/origins")
def list_origins():
    return {"origins": list(HURRICANE_PATHS.keys()), "current": _origin}


@app.get("/hurricane/trajectory")
async def get_hurricane_trajectory():
    """Latest forecast track for the Coordinator and UI (external API if HURRICANE_FORECAST_API_URL set)."""
    data = await fetch_hurricane_trajectory(sim)
    sim.forecast_snapshot = data
    return data


@app.get("/geography")
def get_geography():
    """Bridges, shelters, and hurricane approach paths from tampa_geography.json (single source of truth)."""
    return export_for_frontend()


def _mask_key(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 12:
        return "***"
    return f"{value[:7]}...{value[-4:]}"


@app.get("/debug/api-config")
def debug_api_config():
    """Safe diagnostics for API key setup (no full secrets)."""
    env_path = _BACKEND_DIR / ".env"
    key = os.getenv("GOOGLE_API_KEY")
    return {
        "cwd": os.getcwd(),
        "backend_env_path": str(env_path),
        "backend_env_file_exists": env_path.is_file(),
        "google_api_key_loaded": bool(key),
        "google_api_key_preview": _mask_key(key),
        "mapbox_note": (
            "Mapbox is read only in the browser: set VITE_MAPBOX_TOKEN in frontend/.env "
            "and restart Vite (Vite_ prefix required)."
        ),
    }


@app.post("/agents/run")
async def run_agents():
    from agents import run_all_agents
    return await run_all_agents(sim)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    _connected.add(websocket)
    try:
        await websocket.send_json(sim.get_state_snapshot())
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _connected.discard(websocket)
