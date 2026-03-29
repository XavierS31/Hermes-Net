"""
ADK agent layer for Sentinel-Net.

Flow each /agents/run:
  1. Fetch hurricane trajectory (external API if configured, else simulation-based forecast).
  2. Meteorology Coordinator interprets forecast and sets shelter_ranking + notes on sim.ai_plan.
  3. Warden, Traffic, Shelter run in parallel with shared context (forecast + coordinator output).
  4. Evaluator on interval ticks.
"""

from __future__ import annotations

import asyncio
import os

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from agents.coordinator import create_coordinator_agent
from agents.evaluator import create_evaluator_agent
from agents.shelter import create_shelter_agent
from agents.traffic import create_traffic_agent
from agents.warden import create_warden_agent
from services.trajectory_forecast import fetch_hurricane_trajectory, forecast_to_json_text

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
    """Coordinator first (trajectory → plan), then operational agents with shared context."""
    if not os.getenv("GOOGLE_API_KEY"):
        return {
            "error": "GOOGLE_API_KEY not set",
            "hint": "Add GOOGLE_API_KEY or GEMINI_API_KEY to backend/.env (same folder as main.py). "
            "GET /debug/api-config to verify loading. Restart uvicorn after editing .env.",
        }

    forecast = await fetch_hurricane_trajectory(sim)
    sim.forecast_snapshot = forecast

    forecast_text = forecast_to_json_text(forecast)
    coord_message = (
        "Latest hurricane trajectory / forecast payload (JSON):\n\n"
        f"{forecast_text}\n\n"
        "Use your tools to set_evacuation_plan and set_coordinator_notes."
    )

    coordinator = create_coordinator_agent(sim)
    try:
        coordinator_response = await _run(coordinator, coord_message)
    except Exception as e:
        return {
            "error": "coordinator_failed",
            "exception_type": type(e).__name__,
            "detail": str(e),
            "forecast": forecast,
        }

    ranking = (sim.ai_plan or {}).get("shelter_ranking", [])
    notes = (sim.ai_plan or {}).get("notes", "")
    tick_msg = (
        f"Tick {sim.tick} | Alert: {sim.alert_level} | "
        f"Hurricane {sim.hurricane.distance_to_tampa():.0f} mi out, "
        f"wind {sim.hurricane.wind_speed:.0f} mph.\n"
        f"Coordinator shelter priority (best first): {ranking}\n"
        f"Coordinator notes: {notes}"
    )

    shared_context = (
        "=== SHARED FORECAST (all agents) ===\n"
        f"{forecast_text}\n\n"
        "=== COORDINATOR PLAN ===\n"
        f"shelter_ranking: {ranking}\n"
        f"notes: {notes}\n"
        "=== END ===\n\n"
        f"{tick_msg}"
    )

    warden = create_warden_agent(sim)
    traffic = create_traffic_agent(sim)
    shelter = create_shelter_agent(sim)

    try:
        warden_resp, traffic_resp, shelter_resp = await asyncio.gather(
            _run(warden, shared_context),
            _run(traffic, shared_context),
            _run(shelter, shared_context),
        )
    except Exception as e:
        return {
            "error": "agent_run_failed",
            "exception_type": type(e).__name__,
            "detail": str(e),
            "forecast": forecast,
            "coordinator": coordinator_response,
            "ai_plan": dict(sim.ai_plan or {}),
        }

    results: dict = {
        "tick": sim.tick,
        "forecast": forecast,
        "coordinator": coordinator_response,
        "ai_plan": dict(sim.ai_plan or {}),
        "warden": warden_resp,
        "traffic": traffic_resp,
        "shelter": shelter_resp,
    }

    if sim.tick > 0 and sim.tick % EVALUATOR_INTERVAL == 0:
        try:
            evaluator = create_evaluator_agent(sim)
            audit_msg = (
                f"{shared_context}\n\n"
                f"Tick {sim.tick} audit. Review the last {EVALUATOR_INTERVAL} ticks and score all agents."
            )
            results["evaluator"] = await _run(evaluator, audit_msg)
        except Exception as e:
            results["evaluator_error"] = {"type": type(e).__name__, "detail": str(e)}

    return results
