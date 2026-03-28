import mesa
from simulation.agents.hurricane import HurricaneAgent
from simulation.agents.resident import ResidentAgent
from simulation.geography import BRIDGES, SHELTERS, HURRICANE_PATH, HURRICANE_PATHS, ZONES

class TampaBayModel(mesa.Model):
    def __init__(self, n_residents=30, hurricane_origin="south"):
        super().__init__()
        self.tick = 0
        self.alert_level = "monitor"
        self.hurricane_origin = hurricane_origin
        self.hurricane_path = HURRICANE_PATHS.get(hurricane_origin, HURRICANE_PATH)

        self.bridges = {
            k: {**v, "current_load": 0}
            for k, v in BRIDGES.items()
        }
        self.shelters = {
            k: {**v, "occupancy": 0}
            for k, v in SHELTERS.items()
        }
        self.decision_log: list[dict] = []

        # Mesa 3.x — just instantiate agents, no schedule needed
        self.hurricane = HurricaneAgent(self)

        zones = list(ZONES.keys())
        for i in range(n_residents):
            zone = zones[i % len(zones)]
            ResidentAgent(self, zone)

    def get_residents(self):
        # Mesa 3.x — filter agents by type
        return self.agents_by_type[ResidentAgent]

    def get_state_snapshot(self):
        residents = self.get_residents()
        return {
            "tick": self.tick,
            "alert_level": self.alert_level,
            "hurricane": {
                "lat": self.hurricane.lat,
                "lng": self.hurricane.lng,
                "distance_to_tampa": round(
                    self.hurricane.distance_to_tampa(), 2
                ),
                "wind_speed": self.hurricane.wind_speed,
                "category": self.hurricane.category
            },
            "bridges": self.bridges,
            "shelters": self.shelters,
            "residents": [
                {
                    "id": r.unique_id,
                    "zone": r.zone,
                    "has_car": r.has_car,
                    "mobility": r.mobility,
                    "status": r.status,
                    "lat": r.lat,
                    "lng": r.lng,
                    "progress": r.progress,
                    "assigned_shelter": r.assigned_shelter,
                    "assigned_bridge": r.assigned_bridge,
                }
                for r in residents
            ]
        }

    def step(self):
        self.tick += 1
        self.agents.do("step")

        dist = self.hurricane.distance_to_tampa()
        if dist > 250:
            self.alert_level = "monitor"
        elif dist > 150:
            self.alert_level = "advisory"
        elif dist > 75:
            self.alert_level = "warning"
        else:
            self.alert_level = "emergency"