import mesa
from services.trajectory_forecast import build_forecast_sync
from simulation.agents.hurricane import HurricaneAgent
from simulation.agents.resident import ResidentAgent
from simulation.geography import BRIDGES, SHELTERS, HURRICANE_PATH, HURRICANE_PATHS, ZONES
from simulation.physics_engine import SKYWAY_WIND_CLOSE_MPH, HurricanePhysics, SURGE_TRAP_FT

class TampaBayModel(mesa.Model):
    def __init__(self, n_residents=30, hurricane_origin="south"):
        super().__init__()
        self.tick = 0
        self.alert_level = "monitor"
        self.hurricane_origin = hurricane_origin
        self.hurricane_path = HURRICANE_PATHS.get(hurricane_origin, HURRICANE_PATH)

        self.bridges = {}
        for k, v in BRIDGES.items():
            self.bridges[k] = {**v, "current_load": 0, "closed": False}
            if k == "sunshine_skyway":
                self.bridges[k]["local_wind_mph"] = 0.0

        self._last_physics_metrics: dict = {}
        self.shelters = {
            k: {**v, "occupancy": 0}
            for k, v in SHELTERS.items()
        }
        self.decision_log: list[dict] = []
        # Set by Meteorology Coordinator agent (trajectory API → shelter strategy); not hardcoded rules.
        self.ai_plan: dict = {}
        # Latest forecast payload from fetch_hurricane_trajectory (for API + other agents).
        self.forecast_snapshot: dict | None = None

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
        self.forecast_snapshot = build_forecast_sync(self)
        return {
            "tick": self.tick,
            "alert_level": self.alert_level,
            "hurricane": {
                "lat": self.hurricane.lat,
                "lng": self.hurricane.lng,
                "distance_to_tampa": round(
                    self.hurricane.distance_to_tampa(), 2
                ),
                "wind_speed": round(self.hurricane.wind_speed, 1),
                "category": self.hurricane.category,
                "bearing_deg": round(self.hurricane.bearing_deg, 2),
                "forward_speed_mph": round(self.hurricane.forward_speed_mph, 2),
                "rmw_nm": round(self.hurricane.rmw_nm, 1),
                "r34_nm": round(self.hurricane.r34_nm, 1),
                "position_uncertainty_nm": round(self.hurricane.position_uncertainty_nm, 1),
                "central_pressure_mb": self.hurricane.central_pressure_mb,
                "track_history": list(self.hurricane.track_history),
                "physics": dict(self._last_physics_metrics),
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
                    "local_wind_speed_mph": round(r.local_wind_speed_mph, 1),
                    "local_surge_height_ft": round(r.local_surge_height_ft, 2),
                    "wind_exposure": round(r.wind_exposure, 3),
                    "is_trapped": r.is_trapped,
                }
                for r in residents
            ],
            "ai_plan": dict(self.ai_plan),
            "forecast_snapshot": self.forecast_snapshot,
        }

    def step(self):
        self.tick += 1
        self.agents.do("step")
        self._apply_hurricane_physics()

        dist = self.hurricane.distance_to_tampa()
        if dist > 250:
            self.alert_level = "monitor"
        elif dist > 150:
            self.alert_level = "advisory"
        elif dist > 75:
            self.alert_level = "warning"
        else:
            self.alert_level = "emergency"

    def _apply_hurricane_physics(self) -> None:
        """Holland wind field + surge; per-resident exposure; Sunshine Skyway closure from local wind."""
        h = self.hurricane
        phys = HurricanePhysics(
            center_lat=h.lat,
            center_lon=h.lng,
            central_pressure_mb=h.central_pressure_mb,
            max_wind_speed_mph=h.wind_speed,
            r_max_nm=h.rmw_nm,
            track_heading_deg=h.bearing_deg,
        )
        self._last_physics_metrics = phys.snapshot_metrics()

        for r in self.get_residents():
            w = phys.wind_speed_mph_at(r.lat, r.lng)
            s = phys.surge_height_ft_at(r.lat, r.lng)
            r.local_wind_speed_mph = round(w, 1)
            r.local_surge_height_ft = round(s, 2)
            r.wind_exposure = round(phys.wind_exposure_01(w), 3)
            r.is_trapped = s >= SURGE_TRAP_FT and r.status != "safe"

        sky = BRIDGES["sunshine_skyway"]
        w_sky = phys.wind_speed_mph_at(sky["lat"], sky["lng"])
        self.bridges["sunshine_skyway"]["local_wind_mph"] = round(w_sky, 1)
        self.bridges["sunshine_skyway"]["closed"] = w_sky >= SKYWAY_WIND_CLOSE_MPH