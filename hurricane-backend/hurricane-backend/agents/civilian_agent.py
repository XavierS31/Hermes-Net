import asyncio, json, re, uuid
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from simulation.hurricane import haversine_km

_agent = LlmAgent(
    name="civilian_agent",
    model="gemini-1.5-flash",
    description="Simulates individual civilian decision-making during a Tampa Bay hurricane evacuation",
    instruction="""You are simulating a civilian agent during a hurricane evacuation in Tampa Bay.
Given the agent's profile and hurricane status, decide the best immediate action.
Return ONLY valid JSON, no markdown:
{"action": "evacuate|shelter_in_place|request_help|redirect", "urgency": "low|medium|high|critical", "reasoning": "one sentence", "message": "short broadcast or null"}""",
)

_session_service = InMemorySessionService()
_runner = Runner(agent=_agent, app_name="hurricane_evac", session_service=_session_service)


async def get_agent_decision(agent, hurricane, assigned_zone):
    pos      = agent["position"]
    eye_dist = haversine_km(
        pos["lat"], pos["lng"],
        hurricane.get("currentLat", hurricane.get("originLat")),
        hurricane.get("currentLng", hurricane.get("originLng")),
    )
    zone_name = assigned_zone["name"] if assigned_zone else "No zone assigned"
    zone_dist = (
        haversine_km(pos["lat"], pos["lng"], assigned_zone["lat"], assigned_zone["lng"])
        if assigned_zone else None
    )

    prompt = (
        f"Agent: {agent['type']} ({agent['label']}) in {agent['neighborhood']}. "
        f"Needs medical: {agent.get('needsMedical', False)}. Speed: {agent.get('speed', 0.7)}. "
        f"Hurricane Category {hurricane['category']} eye is {round(eye_dist)}km away. "
        f"Assigned zone: {zone_name} ({round(zone_dist, 1) if zone_dist else 'unknown'}km away)."
    )

    session_id = str(uuid.uuid4())
    await _session_service.create_session(app_name="hurricane_evac", user_id="system", session_id=session_id)
    content = types.Content(role="user", parts=[types.Part(text=prompt)])

    response_text = ""
    async for event in _runner.run_async(user_id="system", session_id=session_id, new_message=content):
        if event.is_final_response() and event.content and event.content.parts:
            response_text = event.content.parts[0].text

    try:
        text = re.sub(r"```json\s*|```\s*", "", response_text.strip()).strip()
        data = json.loads(text)
        data["agent_id"] = agent["id"]
        return data
    except Exception:
        return {"agent_id": agent["id"], "action": "evacuate", "urgency": "high", "reasoning": "Following evacuation order.", "message": None}


async def get_batch_decisions(agents, hurricane, safe_zones):
    zone_map = {z["id"]: z for z in safe_zones}

    async def decide(agent):
        if agent.get("type") in ("disabled", "elderly"):
            zone = zone_map.get(agent.get("assignedZoneId") or agent.get("assigned_zone_id"))
            return await get_agent_decision(agent, hurricane, zone)
        return {"agent_id": agent["id"], "action": "evacuate", "urgency": "medium", "reasoning": "Following evacuation order.", "message": None}

    return list(await asyncio.gather(*[decide(a) for a in agents]))
