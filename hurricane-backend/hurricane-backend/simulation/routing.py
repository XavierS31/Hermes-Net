import math

def haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def build_route(from_lng, from_lat, to_lng, to_lat, steps=12):
    coords = []
    for i in range(steps + 1):
        t = i / steps
        coords.append([from_lng + (to_lng - from_lng) * t, from_lat + (to_lat - from_lat) * t])
    return coords

def assign_agents_to_zones(agents, safe_zones):
    remaining_capacity = {z["id"]: z["capacity"] for z in safe_zones}
    assignments = []

    def priority(a):
        return 0 if a.get("type") in ("disabled", "elderly") else 1

    sorted_agents = sorted(agents, key=priority)

    for agent in sorted_agents:
        pos = agent["position"]
        a_lat = pos["lat"]
        a_lng = pos["lng"]
        best_zone = None
        best_score = float("inf")

        for zone in safe_zones:
            if remaining_capacity.get(zone["id"], 0) <= 0:
                continue
            dist = haversine_km(a_lat, a_lng, zone["lat"], zone["lng"])
            score = dist
            if agent.get("needsMedical") and zone.get("supplies", {}).get("medical", 0) > 0:
                score *= 0.6
            cap = zone["capacity"]
            used = cap - remaining_capacity[zone["id"]]
            fill_ratio = used / cap
            score *= (1 + fill_ratio * 0.5)
            if score < best_score:
                best_score = score
                best_zone = zone

        if best_zone is None:
            assignments.append({"agent_id": agent["id"], "zone_id": None, "route": None, "distance_km": None, "eta_hours": None, "status": "stranded"})
            continue

        remaining_capacity[best_zone["id"]] -= 1
        dist_km = haversine_km(a_lat, a_lng, best_zone["lat"], best_zone["lng"])
        eta_hours = dist_km / (agent.get("speed", 0.7) * 80)
        route = build_route(a_lng, a_lat, best_zone["lng"], best_zone["lat"])
        assignments.append({"agent_id": agent["id"], "zone_id": best_zone["id"], "route": route, "distance_km": round(dist_km, 2), "eta_hours": round(eta_hours, 2), "status": "evacuating"})

    return assignments