"""
Static map infrastructure for Tampa Bay: bridges, shelter *locations*, zone spawn boxes, approach corridors.

Evacuation **strategy** (which shelters to prioritize) is **not** decided here — it comes from the
Meteorology Coordinator agent using `/hurricane/trajectory` (see services/trajectory_forecast.py).
"""

from __future__ import annotations

import json
from pathlib import Path

_DATA_FILE = Path(__file__).resolve().parent / "data" / "tampa_geography.json"


def _load() -> dict:
    if not _DATA_FILE.is_file():
        return _FALLBACK
    with open(_DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


_RAW = _load()

TAMPA_REF: dict[str, float] = dict(_RAW["reference"])
GEO_META: dict = _RAW.get("meta", {})

# Bridges / shelters / zones for Mesa (no extra string fields)
def _bridges() -> dict:
    b = {}
    for bid, data in _RAW["bridges"].items():
        b[bid] = {
            "name": data["name"],
            "lat": float(data["lat"]),
            "lng": float(data["lng"]),
            "capacity": int(data["capacity"]),
            "route": data["route"],
        }
    return b


def _shelters() -> dict:
    s = {}
    for sid, data in _RAW["shelters"].items():
        s[sid] = {
            "name": data["name"],
            "lat": float(data["lat"]),
            "lng": float(data["lng"]),
            "capacity": int(data["capacity"]),
            "requires_car": bool(data["requires_car"]),
            "distance_miles": float(data["distance_miles"]),
        }
    return s


def _zones() -> dict:
    z = {}
    for zid, data in _RAW["zones"].items():
        z[zid] = {"description": data["description"], "priority": int(data["priority"])}
    return z


def _paths() -> dict[str, list[dict[str, float | str]]]:
    return {k: list(v) for k, v in _RAW["hurricane_approach_paths"].items()}


BRIDGES = _bridges()
SHELTERS = _shelters()
ZONES = _zones()
HURRICANE_PATHS = _paths()
HURRICANE_PATH = HURRICANE_PATHS.get("south", next(iter(HURRICANE_PATHS.values())))

ZONE_SPAWN: dict[str, dict[str, float]] = {
    k: {x: float(v[x]) for x in ("min_lat", "max_lat", "min_lng", "max_lng")}
    for k, v in _RAW.get("zone_spawn", {}).items()
}


def export_for_frontend() -> dict:
    """Single JSON the UI can load so map data is not duplicated in TypeScript."""
    paths_lnglat: dict[str, list[list[float]]] = {}
    for name, waypoints in HURRICANE_PATHS.items():
        paths_lnglat[name] = [[float(p["lng"]), float(p["lat"])] for p in waypoints]
    bridge_points = [
        {"id": bid, "lng": v["lng"], "lat": v["lat"], "name": v["name"]}
        for bid, v in BRIDGES.items()
    ]
    shelter_points = [
        {"id": sid, "lng": v["lng"], "lat": v["lat"], "name": v["name"]}
        for sid, v in SHELTERS.items()
    ]
    return {
        "reference": TAMPA_REF,
        "meta": GEO_META,
        "bridges": BRIDGES,
        "shelters": SHELTERS,
        "zones": ZONES,
        "hurricane_paths": paths_lnglat,
        "bridge_points": bridge_points,
        "shelter_points": shelter_points,
    }


_FALLBACK = {
    "reference": {"lat": 27.9506, "lng": -82.4572},
    "bridges": {},
    "shelters": {},
    "zones": {},
    "hurricane_approach_paths": {"south": [{"lat": 24.5, "lng": -80.2}, {"lat": 27.92, "lng": -82.55}]},
}
