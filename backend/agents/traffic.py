"""
Traffic Agent — manages bridge load and triggers rerouting.

Responsibilities:
- Monitor bridge utilisation each tick
- Reroute residents off overloaded bridges (>75% capacity)
- Prohibit Sunshine Skyway routing when wind speed exceeds 120 mph
"""

from google.adk.agents import LlmAgent
from simulation.agents.resident import ResidentAgent
from simulation.geography import BRIDGES


def create_traffic_agent(sim) -> LlmAgent:

    def get_bridge_loads() -> dict:
        """Returns load, capacity, utilisation %, and wind closure risk for each bridge."""
        wind = sim.hurricane.wind_speed
        return {
            bid: {
                "name": data["name"],
                "current_load": data["current_load"],
                "capacity": data["capacity"],
                "pct_used": round(data["current_load"] / data["capacity"] * 100, 1),
                "slots_free": data["capacity"] - data["current_load"],
                "route": data["route"],
                "wind_unsafe": bid == "sunshine_skyway" and wind > 120,
            }
            for bid, data in sim.bridges.items()
        }

    def get_residents_on_bridge(bridge_id: str) -> list[dict]:
        """Returns evacuating residents currently routed through a specific bridge.

        Args:
            bridge_id: Bridge key — one of 'gandy', 'howard_frankland', 'sunshine_skyway'.
        """
        if bridge_id not in sim.bridges:
            return [{"error": f"Unknown bridge '{bridge_id}'"}]
        return [
            {
                "id": r.unique_id,
                "zone": r.zone,
                "progress": round(r.progress, 2),
                "mobility": r.mobility,
            }
            for r in sim.agents_by_type[ResidentAgent]
            if r.status == "evacuating" and r.assigned_bridge == bridge_id
        ]

    def reroute_resident(resident_id: int, new_bridge_id: str) -> dict:
        """Reroute an evacuating resident to a different bridge.

        Args:
            resident_id: The unique_id of the resident to reroute.
            new_bridge_id: Target bridge key — one of 'gandy', 'howard_frankland', 'sunshine_skyway'.

        Returns:
            Confirmation dict or error.
        """
        if new_bridge_id not in sim.bridges:
            return {"error": f"Unknown bridge '{new_bridge_id}'"}

        wind = sim.hurricane.wind_speed
        if new_bridge_id == "sunshine_skyway" and wind > 120:
            return {"error": "Sunshine Skyway is unsafe — wind speed exceeds 120 mph"}

        for r in sim.agents_by_type[ResidentAgent]:
            if r.unique_id == resident_id:
                if r.status != "evacuating":
                    return {"error": f"Resident {resident_id} is not evacuating (status={r.status})"}
                old = r.assigned_bridge
                if old == new_bridge_id:
                    return {"error": f"Resident {resident_id} already uses {new_bridge_id}"}

                # Update bridge load counters
                sim.bridges[old]["current_load"] = max(0, sim.bridges[old]["current_load"] - 1)
                sim.bridges[new_bridge_id]["current_load"] += 1
                r.assigned_bridge = new_bridge_id

                sim.decision_log.append({
                    "tick": sim.tick,
                    "agent": "traffic",
                    "action": f"reroute resident {resident_id}: {old} → {new_bridge_id}",
                })
                return {"status": "ok", "resident_id": resident_id, "from": old, "to": new_bridge_id}

        return {"error": f"Resident {resident_id} not found"}

    return LlmAgent(
        name="traffic",
        model="gemini-2.0-flash-lite",
        instruction="""You are the Traffic Agent in Tampa Bay's autonomous hurricane evacuation system.
Your job: prevent bridge congestion and protect residents from unsafe crossings.

Bridge facts:
- gandy: capacity 100, I-275 North route
- howard_frankland: capacity 100, SR-60 East route — most inland and wind-safe
- sunshine_skyway: capacity 80, US-19 North — highest wind exposure, close if wind > 120 mph

Each tick you MUST:
1. Call get_bridge_loads() to see utilisation across all bridges.
2. For any bridge above 75% capacity, call get_residents_on_bridge() to see who is on it.
3. Reroute residents (lowest progress first) to a bridge with free capacity using
   reroute_resident(). Never send anyone to Sunshine Skyway if wind > 120 mph.
4. Summarise: which bridges were congested, who was rerouted, and the resulting load.""",
        tools=[get_bridge_loads, get_residents_on_bridge, reroute_resident],
    )
