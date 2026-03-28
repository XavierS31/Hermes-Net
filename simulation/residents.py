"""Procedural resident micro-agents for Mesa snapshot / WebSocket streaming."""

from __future__ import annotations

import math
import random
from typing import Any, Literal

Status = Literal["moving", "stuck", "sheltered"]


def generate_resident_trips(
    count: int,
    tick_count: int,
    seed: int = 42,
) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    trips: list[dict[str, Any]] = []
    min_lon, max_lon = -82.85, -82.15
    min_lat, max_lat = 27.55, 28.15

    for i in range(count):
        ax = rng.uniform(min_lon, max_lon)
        ay = rng.uniform(min_lat, max_lat)
        bx = rng.uniform(min_lon, max_lon)
        by = rng.uniform(min_lat, max_lat)
        r = rng.random()
        if r < 0.72:
            status: Status = "moving"
        elif r < 0.82:
            status = "stuck"
        else:
            status = "sheltered"
        zone_id = int((ax - min_lon) / (max_lon - min_lon) * 8) * 10 + int(
            (ay - min_lat) / (max_lat - min_lat) * 8
        )

        path: list[list[float]] = []
        timestamps: list[float] = []
        t_max = max(1, tick_count - 1)
        for t in range(tick_count):
            f = t / t_max
            lon = ax + (bx - ax) * f + (
                math.sin(t * 0.9) * 0.002 if status == "stuck" else 0.0
            )
            lat = ay + (by - ay) * f + (t * 0.0004 if status == "moving" else 0.0)
            path.append([lon, lat])
            timestamps.append(float(t))

        trips.append(
            {
                "id": i,
                "path": path,
                "timestamps": timestamps,
                "status": status,
                "zoneId": zone_id,
            }
        )
    return trips
