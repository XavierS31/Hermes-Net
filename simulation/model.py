"""
Mesa Tampa Bay model: resident trails, telemetry, and environment snapshots for WebSocket clients.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from mesa import Model
from mesa.time import SimultaneousActivation

from simulation.environment_data import (
    BRIDGE_BASES,
    HURRICANE_GHOST,
    HURRICANE_MAIN,
    SURGE_POLYGONS,
)
from simulation.residents import generate_resident_trips


def _parse_utc(iso: str) -> datetime:
    s = iso.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s).astimezone(timezone.utc)


class TampaBayModel(Model):
    """Tampa Bay ABM; `snapshot_positions` feeds deck.gl TripsLayer."""

    def __init__(self, seed: int | None = None) -> None:
        super().__init__(seed=seed)
        self.schedule = SimultaneousActivation(self)

        self.tick_hours = int(os.getenv("SIM_TICK_HOURS", "12"))
        self.tick_count = int(os.getenv("SIM_TICK_COUNT", "14"))
        self.mission_hours = int(os.getenv("MISSION_HOURS", str(7 * 24)))

        epoch_s = os.getenv("SIM_EPOCH_UTC", "2026-03-28T12:00:00Z")
        self.sim_epoch_utc: datetime = _parse_utc(epoch_s)
        self.mission_deadline_utc: datetime = self.sim_epoch_utc + timedelta(
            hours=self.mission_hours
        )

        n_res = int(os.getenv("RESIDENT_COUNT", "5200"))
        r_seed = int(os.getenv("RESIDENT_SEED", "1337"))
        self._residents_full: list[dict[str, Any]] = generate_resident_trips(
            n_res, self.tick_count, r_seed
        )

        self._tick_index = 0
        self.simulated_hours_elapsed = 0

    # —— Mesa ——
    def step(self) -> None:
        if self._tick_index >= self.tick_count - 1:
            return
        self.schedule.step()
        self._tick_index += 1
        self.simulated_hours_elapsed = self._tick_index * self.tick_hours

    def set_tick_index(self, idx: int) -> None:
        """Jump simulation clock (client scrub); does not invoke agent step()."""
        self._tick_index = max(0, min(self.tick_count - 1, idx))
        self.simulated_hours_elapsed = self._tick_index * self.tick_hours

    @property
    def tick_index(self) -> int:
        return self._tick_index

    # —— Telemetry (single source of truth for HUD) ——
    def get_telemetry(self) -> dict[str, Any]:
        t = self._tick_index
        wind_mph = min(175, round(95 + t * 3.8))
        if wind_mph >= 157:
            cat = 5
        elif wind_mph >= 130:
            cat = 4
        elif wind_mph >= 111:
            cat = 3
        elif wind_mph >= 96:
            cat = 2
        else:
            cat = 1
        evac = min(98.0, 38.0 + t * 2.1 + (8.0 if t > 8 else 0.0))
        return {
            "evacuation_percent": round(evac, 1),
            "wind_speed_mph": wind_mph,
            "category": cat,
            "category_label": f"CAT_0{cat}",
        }

    def get_environment_state(self) -> dict[str, Any]:
        return {
            "hurricane_main": [list(p) for p in HURRICANE_MAIN],
            "hurricane_ghost": [list(p) for p in HURRICANE_GHOST],
            "surge_polygons": SURGE_POLYGONS,
        }

    def get_bridges(self) -> list[dict[str, Any]]:
        """Live bridge metrics derived from tick + telemetry."""
        out: list[dict[str, Any]] = []
        for b in BRIDGE_BASES:
            ti = self._tick_index
            wind = min(165, round(b["base_wind_mph"] + ti * 1.8))
            vph = int(b["base_vph"] + ti * 120)
            risk = min(0.95, b["base_closure_risk"] + ti * 0.02)
            out.append(
                {
                    "id": b["id"],
                    "name": b["name"],
                    "position": list(b["position"]),
                    "vph": vph,
                    "wind_mph": wind,
                    "closure_risk": round(risk, 3),
                    "capacity_vph": b["capacity_vph"],
                    "closed": wind > 45,
                }
            )
        return out

    def snapshot_positions(self) -> list[dict[str, Any]]:
        """Truncated trips for current tick_index (deck.gl TripsLayer)."""
        ti = self._tick_index
        n = ti + 1
        snap: list[dict[str, Any]] = []
        for r in self._residents_full:
            path = r["path"][:n]
            ts = r["timestamps"][:n]
            snap.append(
                {
                    "id": r["id"],
                    "path": path,
                    "timestamps": ts,
                    "status": r["status"],
                    "zoneId": r["zoneId"],
                }
            )
        return snap

    def simulation_clock_iso(self) -> str:
        dt = self.sim_epoch_utc + timedelta(hours=float(self.simulated_hours_elapsed))
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
