<<<<<<< HEAD
import json, os, re
from google import genai
=======
import json, re, uuid
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
>>>>>>> 40d8313db30ab9bd85728431ffdccc5835d59e5c
from simulation.hurricane import build_control_points, get_path_sample_points

_agent = LlmAgent(
    name="zone_agent",
    model="gemini-1.5-flash",
    description="Disaster management AI that selects hurricane evacuation safe zones for Tampa Bay",
    instruction="""You are a disaster management AI for Tampa Bay, Florida.
When given a hurricane track, pick exactly 5 optimal evacuation safe zones.
Rules:
- Must be real named locations (stadiums, fairgrounds, universities, community centers)
- Must be OUTSIDE the danger cone (at least 30km from storm path)
- Prioritize inland locations; spread across different directions
- Must be reachable by road from Tampa
Return ONLY valid JSON, no markdown:
{"safe_zones": [{"id": "sz1", "name": "Full venue name", "lat": 00.0000, "lng": -00.0000, "capacity": 000, "supplies": {"food": 000, "water": 000, "medical": 00}, "reasoning": "One sentence why this location is safe"}]}""",
)

_session_service = InMemorySessionService()
_runner = Runner(agent=_agent, app_name="hurricane_evac", session_service=_session_service)


async def generate_safe_zones(origin_lng, origin_lat, dest_lng, dest_lat, category, wind_speed):
    control_points = build_control_points(origin_lng, origin_lat, dest_lng, dest_lat)
    path_points    = get_path_sample_points(control_points, steps=10)
    path_str       = " → ".join([f"({p['lat']:.2f}°N, {p['lng']:.2f}°W)" for p in path_points])

    prompt = (
        f"A Category {category} hurricane with {wind_speed} mph winds is tracking along this path: {path_str}. "
        f"The storm passes directly through Tampa Bay (27.95°N, 82.46°W). "
        f"Pick exactly 5 optimal evacuation safe zones."
    )

    session_id = str(uuid.uuid4())
    await _session_service.create_session(app_name="hurricane_evac", user_id="system", session_id=session_id)
    content = types.Content(role="user", parts=[types.Part(text=prompt)])

    response_text = ""
    async for event in _runner.run_async(user_id="system", session_id=session_id, new_message=content):
        if event.is_final_response() and event.content and event.content.parts:
            response_text = event.content.parts[0].text

    try:
<<<<<<< HEAD
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content(model="gemini-1.5-flash", contents=prompt)
        text = re.sub(r"```json\s*|```\s*", "", response.text.strip()).strip()
        data = json.loads(text)
=======
        text  = re.sub(r"```json\s*|```\s*", "", response_text.strip()).strip()
        data  = json.loads(text)
>>>>>>> 40d8313db30ab9bd85728431ffdccc5835d59e5c
        zones = data.get("safe_zones", [])
        valid = [z for z in zones if 26.5 < z.get("lat", 0) < 29.5 and -84.5 < z.get("lng", 0) < -81.0]
        return valid if valid else _fallback_zones()
    except Exception:
        return _fallback_zones()


def _fallback_zones():
    return [
        {"id": "sz1", "name": "Raymond James Stadium",  "lat": 27.9759, "lng": -82.5033, "capacity": 500, "supplies": {"food": 1000, "water": 2000, "medical": 50}, "reasoning": "Large inland venue northwest of Tampa"},
        {"id": "sz2", "name": "USF Campus Recreation",  "lat": 28.0587, "lng": -82.4149, "capacity": 400, "supplies": {"food": 800,  "water": 1600, "medical": 40}, "reasoning": "University campus north of downtown"},
        {"id": "sz3", "name": "Brandon Town Center",    "lat": 27.9378, "lng": -82.2859, "capacity": 350, "supplies": {"food": 700,  "water": 1400, "medical": 35}, "reasoning": "East of Tampa away from storm surge"},
        {"id": "sz4", "name": "Wiregrass Mall Parking", "lat": 28.1780, "lng": -82.3460, "capacity": 450, "supplies": {"food": 900,  "water": 1800, "medical": 45}, "reasoning": "Far north outside projected cone"},
        {"id": "sz5", "name": "Plant City Fairgrounds", "lat": 28.0189, "lng": -82.1143, "capacity": 600, "supplies": {"food": 1200, "water": 2400, "medical": 60}, "reasoning": "Inland high-capacity fairground venue"},
    ]
