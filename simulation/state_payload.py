"""Serialize Mesa model + runner flags for WebSocket clients."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from simulation.model import TampaBayModel


def build_simulation_state(model: TampaBayModel, playing: bool) -> dict[str, Any]:
    return {
        "type": "simulation_state",
        "tick_index": model.tick_index,
        "tick_count": model.tick_count,
        "tick_hours": model.tick_hours,
        "simulated_hours_elapsed": model.simulated_hours_elapsed,
        "server_time_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "simulation_clock_utc": model.simulation_clock_iso(),
        "telemetry": model.get_telemetry(),
        "positions": model.snapshot_positions(),
        "environment_state": model.get_environment_state(),
        "bridges": model.get_bridges(),
        "playing": playing,
    }


def build_handshake(model: TampaBayModel) -> dict[str, Any]:
    return {
        "type": "handshake",
        "config": {
            "tick_hours": model.tick_hours,
            "tick_count": model.tick_count,
            "mission_hours": model.mission_hours,
            "sim_epoch_utc": model.sim_epoch_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "mission_deadline_utc": model.mission_deadline_utc.strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            ),
        },
    }
