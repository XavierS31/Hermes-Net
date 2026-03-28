"""
Sentinel-Net: Tampa Bay — FastAPI entry.

The Mesa `TampaBayModel` lives on `app.state.model` so WebSocket clients can peek at
simulation state (e.g. coordinates for deck.gl TripsLayer). Each loop iteration runs
one Mesa `step()`, representing **12 simulated hours** (the disaster-response heartbeat).
Wall-clock pacing is controlled by `SIM_HEARTBEAT_SECONDS`.
"""

from __future__ import annotations

import asyncio
import contextlib
import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from simulation.model import TampaBayModel

load_dotenv()

SIM_HEARTBEAT_SECONDS = float(os.getenv("SIM_HEARTBEAT_SECONDS", "2"))


class WebSocketHub:
    """Broadcast JSON messages to all connected simulation subscribers (decoupled fan-out)."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast_json(self, payload: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.discard(ws)


async def simulation_tick_loop(app: FastAPI) -> None:
    """Advance Mesa by one 12-hour step on each heartbeat; stream state to WebSockets."""
    model: TampaBayModel = app.state.model
    hub: WebSocketHub = app.state.ws_hub
    while True:
        await asyncio.sleep(SIM_HEARTBEAT_SECONDS)
        model.step()
        await hub.broadcast_json(
            {
                "type": "simulation_tick",
                "tick_hours": model.tick_hours,
                "simulated_hours_elapsed": model.simulated_hours_elapsed,
                "positions": model.snapshot_positions(),
            }
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = TampaBayModel()
    app.state.ws_hub = WebSocketHub()
    tick_task = asyncio.create_task(simulation_tick_loop(app))
    app.state._tick_task = tick_task
    yield
    tick_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await tick_task


app = FastAPI(title="Sentinel-Net: Tampa Bay", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "sentinel-net-tampa-bay"}


@app.websocket("/ws/simulation")
async def simulation_socket(websocket: WebSocket) -> None:
    hub: WebSocketHub = websocket.app.state.ws_hub
    model: TampaBayModel = websocket.app.state.model
    await hub.connect(websocket)
    try:
        await websocket.send_json(
            {
                "type": "connected",
                "tick_hours": model.tick_hours,
                "simulated_hours_elapsed": model.simulated_hours_elapsed,
                "message": "Streaming simulation heartbeats (12h per Mesa step).",
            }
        )
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(websocket)
