"""
Meteorology Coordinator — consumes trajectory / forecast API output and sets evacuation strategy.

Infrastructure coordinates (shelters, bridges) remain in geography data; *which* shelters to
prioritize is decided here and stored on the simulation model for Warden, Traffic, and Shelter agents.
"""

from __future__ import annotations

import json

from google.adk.agents import LlmAgent


def create_coordinator_agent(sim) -> LlmAgent:

    def get_valid_shelter_ids() -> list[str]:
        """Return shelter keys the simulation knows (same as evacuation destinations)."""
        return list(sim.shelters.keys())

    def get_current_ai_plan() -> dict:
        """Return the coordinator plan already on the model (may be empty)."""
        return dict(getattr(sim, "ai_plan", {}) or {})

    def set_evacuation_plan(shelter_ranking_json: str) -> dict:
        """Set shelter priority order from a JSON array of shelter ids, best first.

        Example: '["east", "north", "northeast"]'
        Only known ids are kept; at least one id should be present when possible.
        """
        try:
            ids = json.loads(shelter_ranking_json)
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON: {e}"}
        if not isinstance(ids, list):
            return {"error": "Expected a JSON array of shelter id strings"}
        valid = [str(x) for x in ids if str(x) in sim.shelters]
        if not valid:
            return {"error": f"No valid shelter ids. Valid: {list(sim.shelters.keys())}"}
        if not hasattr(sim, "ai_plan") or sim.ai_plan is None:
            sim.ai_plan = {}
        sim.ai_plan["shelter_ranking"] = valid
        sim.ai_plan["updated_tick"] = sim.tick
        sim.decision_log.append({
            "tick": sim.tick,
            "agent": "coordinator",
            "action": f"shelter_ranking → {valid}",
        })
        return {"status": "ok", "shelter_ranking": valid}

    def set_coordinator_notes(notes: str) -> dict:
        """Short summary for Warden, Traffic, and Shelter agents (plain text)."""
        if not hasattr(sim, "ai_plan") or sim.ai_plan is None:
            sim.ai_plan = {}
        sim.ai_plan["notes"] = notes[:4000]
        return {"status": "ok", "length": len(notes)}

    return LlmAgent(
        name="coordinator",
        model="gemini-2.0-flash-lite",
        instruction="""You are the Meteorology Coordinator for Tampa Bay hurricane evacuation.

You receive a hurricane **forecast payload** (from an API or simulation) in the user message as JSON.
Static map infrastructure (shelter and bridge coordinates) is fixed; **your job is strategy**:
interpret the track, cone, winds, and motion, then decide **which shelters should be prioritized**
for incoming evacuees (order matters: first = highest priority).

Rules:
1. Call get_valid_shelter_ids() if you need the exact shelter keys.
2. You MUST call set_evacuation_plan() with a JSON **string** that parses to an array, e.g.
   '["east","north","northeast"]' — rank ALL viable shelters given the forecast (landfall direction,
   surge risk on the west vs east side of the bay, wind radii, uncertainty).
3. Call set_coordinator_notes() with 2–4 sentences the other agents will read: key risks and why
   this ranking makes sense.
4. Prefer inland / less surge-exposed shelters if the track threatens coastal surge on one side;
   rotate priority if the forecast shifts.

After tools succeed, reply with one short confirmation sentence.""",
        tools=[
            get_valid_shelter_ids,
            get_current_ai_plan,
            set_evacuation_plan,
            set_coordinator_notes,
        ],
    )
