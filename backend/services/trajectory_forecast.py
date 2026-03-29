"""
Hurricane trajectory / forecast for AI agents.

- If HURRICANE_FORECAST_API_URL is set, GET that URL (JSON) and normalize it.
- Otherwise build a structured forecast from the live simulation + approach corridor.

Set HURRICANE_FORECAST_API_URL in backend/.env to your own service that returns JSON.
Expected shape (flexible):

{
  "forecast_track": [{"lat": 27.9, "lng": -82.5, "hour": 0}, ...],
  "cone_radius_nm": 45,
  "max_wind_mph": 120,
  "advisory": "optional text"
}

Or: "track": [[lng, lat], ...]  (will be converted)
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

import httpx


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_external(data: dict[str, Any], sim) -> dict[str, Any]:
    """Map various provider shapes into one agent-friendly payload."""
    out: dict[str, Any] = {
        "source": data.get("source", "external_api"),
        "fetched_at": data.get("fetched_at", _utc_now()),
        "raw_provider": data,
    }
    track: list[dict[str, Any]] = []

    if "forecast_track" in data and isinstance(data["forecast_track"], list):
        for i, p in enumerate(data["forecast_track"]):
            if isinstance(p, dict):
                track.append(
                    {
                        "lat": float(p["lat"]),
                        "lng": float(p.get("lng", p.get("lon", 0))),
                        "hour": float(p.get("hour", i * 12)),
                    }
                )
            elif isinstance(p, (list, tuple)) and len(p) >= 2:
                track.append({"lat": float(p[1]), "lng": float(p[0]), "hour": float(i * 12)})
    elif "track" in data and isinstance(data["track"], list):
        for i, p in enumerate(data["track"]):
            if isinstance(p, (list, tuple)) and len(p) >= 2:
                track.append({"lat": float(p[1]), "lng": float(p[0]), "hour": float(i * 12)})

    out["forecast_track"] = track
    out["cone_radius_nm"] = float(data.get("cone_radius_nm", data.get("cone_nm", 40)))
    out["advisory"] = data.get("advisory", data.get("discussion", ""))
    h = sim.hurricane
    out["storm"] = {
        "lat": h.lat,
        "lng": h.lng,
        "max_wind_mph": h.wind_speed,
        "category": h.category,
        "bearing_deg": h.bearing_deg,
        "forward_speed_mph": h.forward_speed_mph,
        "rmw_nm": h.rmw_nm,
        "r34_nm": h.r34_nm,
        "position_uncertainty_nm": h.position_uncertainty_nm,
    }
    return out


def _build_from_simulation(sim) -> dict[str, Any]:
    path = sim.hurricane_path
    track = [
        {"lat": float(p["lat"]), "lng": float(p["lng"]), "hour": float(i * 12)}
        for i, p in enumerate(path)
    ]
    h = sim.hurricane
    observed: list[dict[str, float]] = []
    for p in getattr(h, "track_history", []) or []:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            observed.append({"lng": float(p[0]), "lat": float(p[1])})
    return {
        "source": "simulation_baseline",
        "fetched_at": _utc_now(),
        "notes": (
            "Live sim + approach corridor (bearing reflects selected origin). "
            "Coordinator AI updates shelter strategy via POST /agents/run. "
            "Optional: HURRICANE_FORECAST_API_URL for external track JSON."
        ),
        "forecast_track": track,
        "observed_track": observed,
        "cone_radius_nm": float(h.position_uncertainty_nm),
        "advisory": (
            f"Sim tick {sim.tick}; alert {sim.alert_level}; "
            f"distance to Tampa ~{h.distance_to_tampa():.0f} mi; max wind ~{h.wind_speed:.0f} mph."
        ),
        "storm": {
            "lat": h.lat,
            "lng": h.lng,
            "max_wind_mph": h.wind_speed,
            "category": h.category,
            "bearing_deg": h.bearing_deg,
            "forward_speed_mph": h.forward_speed_mph,
            "rmw_nm": h.rmw_nm,
            "r34_nm": h.r34_nm,
            "position_uncertainty_nm": h.position_uncertainty_nm,
        },
    }


def build_forecast_sync(sim) -> dict[str, Any]:
    """Synchronous forecast for WebSocket /state (matches async fetch when no external URL)."""
    return _build_from_simulation(sim)


async def fetch_hurricane_trajectory(sim) -> dict[str, Any]:
    """
    Async fetch: external URL if configured, else simulation-derived forecast.
    Safe to call every agent run.
    """
    url = (os.getenv("HURRICANE_FORECAST_API_URL") or "").strip()
    if url:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            if not isinstance(data, dict):
                raise ValueError("Forecast API must return a JSON object")
            return _normalize_external(data, sim)
    return _build_from_simulation(sim)


def forecast_to_json_text(forecast: dict[str, Any]) -> str:
    return json.dumps(forecast, indent=2, default=str)
