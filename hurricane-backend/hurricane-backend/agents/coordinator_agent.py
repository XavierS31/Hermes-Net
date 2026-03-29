import json, re
import google.generativeai as genai

def get_coordinator_assessment(agents, safe_zones, hurricane, elapsed_hours):
    total     = len(agents)
    arrived   = sum(1 for a in agents if a["status"] == "arrived")
    evacuating = sum(1 for a in agents if a["status"] == "evacuating")
    stranded  = sum(1 for a in agents if a["status"] == "stranded")

    zone_str = "\n".join([
        f"- {z['name']}: {sum(1 for a in agents if a.get('assignedZoneId') == z['id'] and a['status'] == 'arrived')} arrived, {round((sum(1 for a in agents if a.get('assignedZoneId') == z['id'] and a['status'] == 'arrived') / z['capacity']) * 100)}% full"
        for z in safe_zones
    ])

    prompt = f"""You are the Tampa Bay hurricane evacuation coordinator.

After {elapsed_hours:.1f} hours — {arrived}/{total} safe, {evacuating} evacuating, {stranded} stranded.
Hurricane Category {hurricane.get('category', '?')}, {hurricane.get('windSpeed', '?')} mph.

Zone status:
{zone_str}

Return ONLY valid JSON:
{{"overall_status": "on_track|at_risk|critical", "alerts": ["alert1"], "recommendations": ["action1"], "broadcast": "max 15 word message to all agents"}}"""

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = re.sub(r"```json\s*|```\s*", "", response.text.strip()).strip()
        return json.loads(text)
    except Exception:
        return {"overall_status": "on_track", "alerts": [], "recommendations": ["Continue evacuation"], "broadcast": "Evacuation proceeding. Follow assigned routes."}