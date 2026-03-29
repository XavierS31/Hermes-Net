"""
Warden Agent — manages shelter assignments for evacuating residents.

Responsibilities:
- Monitor shelter load distribution each tick
- Reassign residents when a shelter exceeds 80% capacity
- Prioritise Zone A/B residents for the closest available shelter
"""

from google.adk.agents import LlmAgent
from simulation.agents.resident import ResidentAgent


def create_warden_agent(sim) -> LlmAgent:

    def get_shelter_loads() -> dict:
        """Returns occupancy, capacity, and free slots for every shelter."""
        return {
            sid: {
                "name": data["name"],
                "occupancy": data["occupancy"],
                "capacity": data["capacity"],
                "pct_full": round(data["occupancy"] / data["capacity"] * 100, 1),
                "slots_free": data["capacity"] - data["occupancy"],
            }
            for sid, data in sim.shelters.items()
        }

    def get_evacuating_residents() -> list[dict]:
        """Returns all residents currently evacuating, with zone and shelter assignment."""
        return [
            {
                "id": r.unique_id,
                "zone": r.zone,
                "shelter": r.assigned_shelter,
                "progress": round(r.progress, 2),
                "mobility": r.mobility,
            }
            for r in sim.agents_by_type[ResidentAgent]
            if r.status == "evacuating"
        ]

    def reassign_resident(resident_id: int, new_shelter_id: str) -> dict:
        """Reassign an evacuating resident to a different shelter.

        Args:
            resident_id: The unique_id of the resident to move.
            new_shelter_id: Target shelter key — one of 'north', 'northeast', 'east'.

        Returns:
            Confirmation dict with old and new shelter, or an error.
        """
        if new_shelter_id not in sim.shelters:
            return {"error": f"Unknown shelter '{new_shelter_id}'. Valid: north, northeast, east"}

        for r in sim.agents_by_type[ResidentAgent]:
            if r.unique_id == resident_id:
                if r.status != "evacuating":
                    return {"error": f"Resident {resident_id} is not evacuating (status={r.status})"}
                old = r.assigned_shelter
                if old == new_shelter_id:
                    return {"error": f"Resident {resident_id} is already assigned to {new_shelter_id}"}
                r.assigned_shelter = new_shelter_id
                # Restart journey from current position toward new shelter
                r.start_lat = r.lat
                r.start_lng = r.lng
                r.progress = 0.0
                sim.decision_log.append({
                    "tick": sim.tick,
                    "agent": "warden",
                    "action": f"reassign resident {resident_id}: {old} → {new_shelter_id}",
                })
                return {"status": "ok", "resident_id": resident_id, "from": old, "to": new_shelter_id}

        return {"error": f"Resident {resident_id} not found"}

    return LlmAgent(
        name="warden",
        model="gemini-2.0-flash-lite",
        instruction="""You are the Warden Agent in Tampa Bay's autonomous hurricane evacuation system.
Your job: prevent shelter overcrowding and ensure fair distribution across the three shelters
(north, northeast, east).

Each tick you MUST:
1. Call get_shelter_loads() to see current capacity across all shelters.
2. Call get_evacuating_residents() to see who is assigned where.
3. If any shelter exceeds 80% full while another has at least 30% free capacity,
   call reassign_resident() to move residents. Pick residents with the lowest
   progress first (they haven't committed far yet). Keep Zone A residents at their
   closest shelter unless that shelter is critically full (>90%).
4. Summarise your decisions in 2-3 sentences: what you changed, why, and what
   risk remains.""",
        tools=[get_shelter_loads, get_evacuating_residents, reassign_resident],
    )
