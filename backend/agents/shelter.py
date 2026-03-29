"""
Shelter Agent — monitors shelter capacity and raises overflow alerts.

Responsibilities:
- Flag shelters at WARNING (>80%) and CRITICAL (>95%) thresholds
- Recommend overflow routing for the next wave of arrivals
- Track residents currently in transit toward each shelter
"""

from google.adk.agents import LlmAgent
from simulation.agents.resident import ResidentAgent


def create_shelter_agent(sim) -> LlmAgent:

    def get_shelter_status() -> dict:
        """Returns full capacity breakdown and status level for every shelter."""
        result = {}
        for sid, data in sim.shelters.items():
            pct = data["occupancy"] / data["capacity"] * 100
            if pct >= 95:
                level = "CRITICAL"
            elif pct >= 80:
                level = "WARNING"
            else:
                level = "OK"
            result[sid] = {
                "name": data["name"],
                "occupancy": data["occupancy"],
                "capacity": data["capacity"],
                "pct_full": round(pct, 1),
                "slots_free": data["capacity"] - data["occupancy"],
                "status": level,
                "requires_car": data["requires_car"],
                "distance_miles": data["distance_miles"],
            }
        return result

    def get_inbound_residents(shelter_id: str) -> dict:
        """Returns residents currently en route to a shelter plus arrival estimate.

        Args:
            shelter_id: Shelter key — one of 'north', 'northeast', 'east'.
        """
        if shelter_id not in sim.shelters:
            return {"error": f"Unknown shelter '{shelter_id}'"}

        inbound = [
            {
                "id": r.unique_id,
                "zone": r.zone,
                "progress": round(r.progress, 2),
                "ticks_to_arrive": max(1, round((1.0 - r.progress) / (0.15 if r.mobility == "normal" else 0.08))),
            }
            for r in sim.agents_by_type[ResidentAgent]
            if r.status == "evacuating" and r.assigned_shelter == shelter_id
        ]
        projected_occupancy = sim.shelters[shelter_id]["occupancy"] + len(inbound)
        return {
            "shelter_id": shelter_id,
            "inbound_count": len(inbound),
            "projected_occupancy": projected_occupancy,
            "capacity": sim.shelters[shelter_id]["capacity"],
            "will_overflow": projected_occupancy > sim.shelters[shelter_id]["capacity"],
            "residents": inbound,
        }

    def get_overflow_suggestions(shelter_id: str) -> list[dict]:
        """Returns alternative shelters ranked by available capacity for overflow from a full shelter.

        Args:
            shelter_id: The shelter that is at risk of overflowing.
        """
        if shelter_id not in sim.shelters:
            return [{"error": f"Unknown shelter '{shelter_id}'"}]

        alternatives = []
        for sid, data in sim.shelters.items():
            if sid == shelter_id:
                continue
            pct = data["occupancy"] / data["capacity"] * 100
            alternatives.append({
                "shelter_id": sid,
                "name": data["name"],
                "slots_free": data["capacity"] - data["occupancy"],
                "pct_full": round(pct, 1),
                "distance_miles": data["distance_miles"],
                "requires_car": data["requires_car"],
            })
        return sorted(alternatives, key=lambda x: x["slots_free"], reverse=True)

    return LlmAgent(
        name="shelter",
        model="gemini-2.0-flash-lite",
        instruction="""You are the Shelter Capacity Agent in Tampa Bay's autonomous hurricane evacuation system.
Your job: monitor all three shelters and prevent dangerous overcrowding before it happens.

Each tick you MUST:
1. Call get_shelter_status() for the current state of all shelters.
2. For any shelter at WARNING (>80%) or CRITICAL (>95%), call get_inbound_residents()
   to understand how many more people are on the way.
3. If projected occupancy (current + inbound) will exceed capacity, call
   get_overflow_suggestions() and specify which shelter should absorb overflow
   and how many people it can take.
4. Report: status for every shelter, any overflow risk, and your specific
   recommendation for the Warden agent to act on next tick.""",
        tools=[get_shelter_status, get_inbound_residents, get_overflow_suggestions],
    )
