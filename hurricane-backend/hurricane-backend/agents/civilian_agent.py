import json, re
import google.generativeai as genai
from simulation.hurricane import haversine_km

def get_agent_decision(agent, hurricane, assigned_zone):
    pos = agent["position"]
    eye_dist = haversine_km(pos["lat"], pos["lng"], hurricane.get("currentLat", hurricane.get("originLat")), hurricane.get("currentLng", hurricane.get("originLng")))
    zone_name = assigned_zone["name"] if assigned_zone else "No zone assigned"
    zone_dist = haversine_km(pos["lat"], pos["lng"], assigned_zone["lat"], assigned_zone["lng"]) if assigned_zone else None

    prompt = f"""You are simulating a civilian agent during a hurricane evacuation in Tampa Bay.

Agent: {agent['type']} ({agent['label']}) in {agent['neighborhood']}
Needs medical: {agent.get('needsMedical', False)}
Speed: {agent.get('speed', 0.7)}
Hurricane Category {hurricane['category']} eye is {round(eye_dist)}km away
Assigned zone: {zone_name} ({round(zone_dist, 1) if zone_dist else 'unknown'}km away)

Return ONLY valid JSON:
{{"action": "evacuate|shelter_in_place|request_help|redirect", "urgency": "low|medium|high|critical", "reasoning": "one sentence", "message": "short broadcast or null"}}"""

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = re.sub(r"```json\s*|```\s*", "", response.text.strip()).strip()
        data = json.loads(text)
        data["agent_id"] = agent["id"]
        return data
    except Exception:
        return {"agent_id": agent["id"], "action": "evacuate", "urgency": "high", "reasoning": "Following evacuation order.", "message": None}

def get_batch_decisions(agents, hurricane, safe_zones):
    zone_map = {z["id"]: z for z in safe_zones}
    decisions = []
    for agent in agents:
        if agent.get("type") in ("disabled", "elderly"):
            zone = zone_map.get(agent.get("assignedZoneId") or agent.get("assigned_zone_id"))
            decision = get_agent_decision(agent, hurricane, zone)
        else:
            decision = {"agent_id": agent["id"], "action": "evacuate", "urgency": "medium", "reasoning": "Following evacuation order.", "message": None}
        decisions.append(decision)
    return decisions