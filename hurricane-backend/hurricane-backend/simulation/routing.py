import math, os, asyncio
import httpx

def haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def build_straight_route(from_lng, from_lat, to_lng, to_lat, steps=12):
    return [
        [from_lng + (to_lng - from_lng) * (i / steps),
         from_lat + (to_lat - from_lat) * (i / steps)]
        for i in range(steps + 1)
    ]

async def fetch_road_route(from_lng, from_lat, to_lng, to_lat):
    """Return (coords, distance_km) from Mapbox Directions API.
    Falls back to (None, None) so the caller can use a straight line."""
    token = os.getenv("MAPBOX_TOKEN")
    if not token:
        return None, None
    url = (
        f"https://api.mapbox.com/directions/v5/mapbox/driving/"
        f"{from_lng},{from_lat};{to_lng},{to_lat}"
        f"?geometries=geojson&overview=full&access_token={token}"
    )
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(url)
            data = res.json()
            if data.get("routes"):
                route = data["routes"][0]
                return route["geometry"]["coordinates"], route["distance"] / 1000
    except Exception:
        pass
    return None, None

# ── Demographic priority (lower = assigned first) ─────────────
DEMO_PRIORITY = {"disabled": 0, "elderly": 1, "child": 2, "family": 3, "adult": 4}

def score_zone(agent, zone, dist, remaining_cap):
    """Travel-time score with medical and capacity weights."""
    score = dist / (agent.get("speed", 0.7) * 80)
    if agent.get("needsMedical") or agent.get("needs_medical"):
        has_medical = zone.get("supplies", {}).get("medical", 0) > 0
        score *= 0.5 if has_medical else 1.8
    fill_ratio = 1 - remaining_cap / zone["capacity"]
    score *= (1 + fill_ratio * 0.5)
    return score

async def assign_agents_to_zones(agents, safe_zones):
    remaining = {z["id"]: z["capacity"] for z in safe_zones}

    # Sort by demographic priority
    sorted_agents = sorted(agents, key=lambda a: DEMO_PRIORITY.get(a.get("type", "adult"), 3))

    # Phase 1: zone assignment using fast straight-line scoring
    pre_assign = []
    for agent in sorted_agents:
        pos = agent["position"]
        a_lat, a_lng = pos["lat"], pos["lng"]

        candidates = []
        for zone in safe_zones:
            if remaining.get(zone["id"], 0) <= 0:
                continue
            dist = haversine_km(a_lat, a_lng, zone["lat"], zone["lng"])
            candidates.append((score_zone(agent, zone, dist, remaining[zone["id"]]), dist, zone))
        candidates.sort(key=lambda x: x[0])

        if not candidates:
            pre_assign.append({"agent_id": agent["id"], "zone_id": None,
                                "route": None, "distance_km": None,
                                "eta_hours": None, "status": "stranded"})
            continue

        _, dist_straight, best_zone = candidates[0]
        remaining[best_zone["id"]] -= 1
        pre_assign.append({
            "agent_id":      agent["id"],
            "zone_id":       best_zone["id"],
            "_from":         (a_lng, a_lat),
            "_to":           (best_zone["lng"], best_zone["lat"]),
            "_speed":        agent.get("speed", 0.7),
            "_dist_straight": dist_straight,
        })

    # Phase 2: fetch road routes in parallel
    async def resolve(asgn):
        if not asgn.get("zone_id"):
            return asgn
        coords, dist_km = await fetch_road_route(*asgn["_from"], *asgn["_to"])
        if coords is None:
            coords = build_straight_route(*asgn["_from"], *asgn["_to"])
            dist_km = asgn["_dist_straight"]
        eta = dist_km / (asgn["_speed"] * 80)
        return {
            "agent_id":    asgn["agent_id"],
            "zone_id":     asgn["zone_id"],
            "route":       coords,
            "distance_km": round(dist_km, 2),
            "eta_hours":   round(eta, 2),
            "status":      "evacuating",
        }

    results = await asyncio.gather(*[resolve(a) for a in pre_assign])
    return list(results)
