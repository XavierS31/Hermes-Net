"""
Evaluator Agent — audits all agent decisions every 5 ticks.

Responsibilities:
- Review the decision log for contradictions and bad patterns
- Score Warden, Traffic, and Shelter agents on their recent performance
- Surface one concrete improvement recommendation per audit
"""

from google.adk.agents import LlmAgent
from simulation.agents.resident import ResidentAgent


def create_evaluator_agent(sim) -> LlmAgent:

    def get_decision_log(last_n: int = 20) -> list[dict]:
        """Returns the most recent agent decisions from all agents.

        Args:
            last_n: How many recent decisions to return (default 20).
        """
        return sim.decision_log[-last_n:]

    def get_simulation_summary() -> dict:
        """Returns overall evacuation statistics for the current tick."""
        residents = list(sim.agents_by_type[ResidentAgent])
        total = len(residents)
        by_status = {"waiting": 0, "evacuating": 0, "safe": 0}
        by_zone = {}
        for r in residents:
            by_status[r.status] = by_status.get(r.status, 0) + 1
            zone_key = r.zone
            if zone_key not in by_zone:
                by_zone[zone_key] = {"waiting": 0, "evacuating": 0, "safe": 0}
            by_zone[zone_key][r.status] = by_zone[zone_key].get(r.status, 0) + 1

        evac_pct = round((by_status["evacuating"] + by_status["safe"]) / total * 100, 1) if total else 0

        return {
            "tick": sim.tick,
            "alert_level": sim.alert_level,
            "hurricane_distance_miles": round(sim.hurricane.distance_to_tampa(), 1),
            "wind_speed_mph": sim.hurricane.wind_speed,
            "total_residents": total,
            "by_status": by_status,
            "by_zone": by_zone,
            "evacuation_pct": evac_pct,
            "bridge_loads": {
                bid: {
                    "pct_used": round(data["current_load"] / data["capacity"] * 100, 1)
                }
                for bid, data in sim.bridges.items()
            },
            "shelter_loads": {
                sid: {
                    "pct_full": round(data["occupancy"] / data["capacity"] * 100, 1)
                }
                for sid, data in sim.shelters.items()
            },
            "total_decisions_logged": len(sim.decision_log),
        }

    return LlmAgent(
        name="evaluator",
        model="gemini-2.0-flash-lite",
        instruction="""You are the Evaluator Agent in Tampa Bay's autonomous hurricane evacuation system.
You run every 5 ticks to audit the decisions made by the Warden, Traffic, and Shelter agents.
The shared message may include **forecast JSON** and **Coordinator shelter_ranking** — consider whether
actions matched that plan.

Your audit protocol:
1. Call get_simulation_summary() for the current state and overall progress.
2. Call get_decision_log() to review what agents have done recently.
3. Identify problems such as:
   - Residents reassigned repeatedly between shelters (wasted progress)
   - Residents rerouted to Sunshine Skyway when wind was high
   - Shelters that hit WARNING but no reassignments followed
   - Zone A residents stuck waiting while lower-priority zones evacuated
   - Bridge overloads that lasted multiple ticks without rerouting
4. Score each agent 1-10:
   - Warden: shelter load balance
   - Traffic: bridge utilisation and safety
   - Shelter: early warning accuracy
5. Give one specific, actionable recommendation for the next 5 ticks.

Format your response as:
AUDIT TICK {tick}
Warden: {score}/10 — {one sentence}
Traffic: {score}/10 — {one sentence}
Shelter: {score}/10 — {one sentence}
FINDING: {key issue}
RECOMMENDATION: {specific action}""",
        tools=[get_decision_log, get_simulation_summary],
    )
