"""Static environment geometry served with each simulation state (hurricane, surge, bridge bases)."""

from __future__ import annotations

# Lon/lat pairs — WGS84
HURRICANE_MAIN: list[tuple[float, float]] = [
    (-87.5, 26.2),
    (-86.4, 26.5),
    (-85.2, 26.9),
    (-84.0, 27.2),
    (-83.0, 27.6),
    (-82.4, 27.85),
    (-82.0, 27.95),
]

HURRICANE_GHOST: list[tuple[float, float]] = [
    (-87.2, 26.0),
    (-86.0, 26.4),
    (-84.5, 26.8),
    (-83.2, 27.3),
    (-82.2, 27.7),
    (-81.6, 28.0),
]

# Closed rings, feet AMSL for extrusion height
SURGE_POLYGONS: list[dict] = [
    {
        "polygon": [
            [-82.78, 27.72],
            [-82.65, 27.72],
            [-82.6, 27.85],
            [-82.7, 27.92],
            [-82.82, 27.88],
            [-82.78, 27.72],
        ],
        "height_ft": 14.0,
    },
    {
        "polygon": [
            [-82.55, 27.68],
            [-82.42, 27.7],
            [-82.38, 27.8],
            [-82.48, 27.88],
            [-82.58, 27.82],
            [-82.55, 27.68],
        ],
        "height_ft": 9.0,
    },
    {
        "polygon": [
            [-82.9, 27.95],
            [-82.78, 27.93],
            [-82.75, 28.02],
            [-82.88, 28.05],
            [-82.9, 27.95],
        ],
        "height_ft": 6.0,
    },
]

BRIDGE_BASES: list[dict] = [
    {
        "id": "gandy",
        "name": "Gandy Br.",
        "position": [-82.64, 27.89],
        "base_vph": 4200,
        "base_wind_mph": 38.0,
        "base_closure_risk": 0.12,
        "capacity_vph": 6500,
    },
    {
        "id": "howard",
        "name": "Howard Frankland",
        "position": [-82.68, 27.91],
        "base_vph": 7800,
        "base_wind_mph": 41.0,
        "base_closure_risk": 0.18,
        "capacity_vph": 9500,
    },
    {
        "id": "skyway",
        "name": "Sunshine Skyway",
        "position": [-82.63, 27.62],
        "base_vph": 5100,
        "base_wind_mph": 52.0,
        "base_closure_risk": 0.44,
        "capacity_vph": 6500,
    },
]
