"""
ADK agent layer for Sentinel-Net.

Usage:
    from agents import run_all_agents
    results = await run_all_agents(sim)

Evaluator runs only every EVALUATOR_INTERVAL ticks.
"""

import asyncio
import os

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from agents.warden import create_warden_agent
from agents.traffic import create_traffic_agent
from agents.shelter import create_shelter_agent
from agents.evaluator import create_evaluator_agent

EVALUATOR_INTERVAL = 5


async def _run(agent, message: str) -> str:
    """Run a single LlmAgent with a message and return its final text response."""
    session_service = InMemorySessionService()
    runner = Runner(
        app_name="sentinel-net",
        agent=agent,
        session_service=session_service,
    )
    session = await session_service.create_session(
        app_name="sentinel-net", user_id="system"
    )
    content = genai_types.Content(
        role="user", parts=[genai_types.Part(text=message)]
    )
    response_parts: list[str] = []
    async for event in runner.run_async(
        user_id="system",
        session_id=session.id,
        new_message=content,
    ):
        if event.is_final_response() and event.content:
            for part in event.content.parts:
                if hasattr(part, "text") and part.text:
                    response_parts.append(part.text)
    return "".join(response_parts)


async def run_all_agents(sim) -> dict:
    """Run Warden, Traffic, and Shelter agents in parallel. Evaluator runs every 5 ticks.

    Returns a dict with each agent's name → response text.
    """
    if not os.getenv("GOOGLE_API_KEY"):
        return {"error": "GOOGLE_API_KEY not set — add it to backend/.env"}

    tick_msg = (
        f"Tick {sim.tick} | Alert: {sim.alert_level} | "
        f"Hurricane {sim.hurricane.distance_to_tampa():.0f} mi out, "
        f"wind {sim.hurricane.wind_speed} mph. Analyse and act."
    )

    warden = create_warden_agent(sim)
    traffic = create_traffic_agent(sim)
    shelter = create_shelter_agent(sim)

    # Run the three operational agents concurrently
    warden_resp, traffic_resp, shelter_resp = await asyncio.gather(
        _run(warden, tick_msg),
        _run(traffic, tick_msg),
        _run(shelter, tick_msg),
    )

    results = {
        "tick": sim.tick,
        "warden": warden_resp,
        "traffic": traffic_resp,
        "shelter": shelter_resp,
    }

    # Evaluator runs every EVALUATOR_INTERVAL ticks
    if sim.tick > 0 and sim.tick % EVALUATOR_INTERVAL == 0:
        evaluator = create_evaluator_agent(sim)
        audit_msg = (
            f"Tick {sim.tick} audit. Hurricane {sim.hurricane.distance_to_tampa():.0f} mi out. "
            f"Review the last {EVALUATOR_INTERVAL} ticks and score all agents."
        )
        results["evaluator"] = await _run(evaluator, audit_msg)

    return results
