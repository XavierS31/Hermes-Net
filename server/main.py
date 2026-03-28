"""
Sentinel-Net: Tampa Bay — FastAPI + Mesa with bidirectional WebSocket simulation control.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from simulation.model import TampaBayModel
from simulation.state_payload import build_handshake, build_simulation_state

load_dotenv()

SIM_HEARTBEAT_SECONDS = float(os.getenv("SIM_HEARTBEAT_SECONDS", "2"))


class WebSocketHub:
    """Broadcast JSON to all simulation subscribers."""

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


async def simulation_runner(app: FastAPI) -> None:
    """Advance Mesa when `app.state.playing` is true; stream full state."""
    while True:
        await asyncio.sleep(SIM_HEARTBEAT_SECONDS)
        if not getattr(app.state, "playing", False):
            continue
        model: TampaBayModel = app.state.model
        hub: WebSocketHub = app.state.ws_hub
        model.step()
        await hub.broadcast_json(
            build_simulation_state(model, app.state.playing),
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = TampaBayModel()
    app.state.ws_hub = WebSocketHub()
    app.state.playing = False
    tick_task = asyncio.create_task(simulation_runner(app))
    app.state._tick_task = tick_task
    yield
    tick_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await tick_task


app = FastAPI(title="Sentinel-Net: Tampa Bay", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "sentinel-net-tampa-bay"}


async def _handle_control(app: FastAPI, raw: str) -> None:
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        return
    if msg.get("type") != "control":
        return
    action = msg.get("action")
    model: TampaBayModel = app.state.model
    hub: WebSocketHub = app.state.ws_hub

    if action == "play":
        app.state.playing = True
    elif action == "pause":
        app.state.playing = False
    elif action == "set_tick":
        tick = int(msg.get("tick", 0))
        app.state.playing = False
        model.set_tick_index(tick)
    else:
        return

    await hub.broadcast_json(build_simulation_state(model, app.state.playing))


@app.websocket("/ws/simulation")
async def simulation_socket(websocket: WebSocket) -> None:
    hub: WebSocketHub = websocket.app.state.ws_hub
    model: TampaBayModel = websocket.app.state.model
    await hub.connect(websocket)
    try:
        await websocket.send_json(build_handshake(model))
        await websocket.send_json(
            build_simulation_state(model, websocket.app.state.playing),
        )
        while True:
            raw = await websocket.receive_text()
            await _handle_control(websocket.app, raw)
    except WebSocketDisconnect:
        hub.disconnect(websocket)
