import mesa
import random
from simulation.geography import SHELTERS, BRIDGES

ALERT_ORDER = ["monitor", "advisory", "warning", "emergency"]

# Minimum alert level before each zone starts evacuating
EVAC_THRESHOLD = {
    "A": "advisory",
    "B": "advisory",
    "C": "warning",
    "D": "warning",
    "E": "emergency",
}

class ResidentAgent(mesa.Agent):
    def __init__(self, model, zone):
        super().__init__(model)
        self.zone = zone
        self.has_car = random.random() > 0.3
        self.mobility = random.choice(["normal", "normal", "normal", "limited"])
        self.risk_tolerance = random.uniform(0, 1)
        self.lat = random.uniform(27.75, 28.05)
        self.lng = random.uniform(-82.75, -82.25)
        self.start_lat = self.lat
        self.start_lng = self.lng
        self.status = "waiting"
        self.assigned_shelter = None
        self.assigned_bridge = None
        self.progress = 0.0

    def _alert_index(self, level):
        return ALERT_ORDER.index(level) if level in ALERT_ORDER else 0

    def _should_evacuate(self):
        threshold = EVAC_THRESHOLD.get(self.zone, "warning")
        current_idx = self._alert_index(self.model.alert_level)
        threshold_idx = self._alert_index(threshold)
        if current_idx < threshold_idx:
            return False
        # Once alert exceeds threshold by 1+ levels, everyone goes.
        # At exactly the threshold, risk-averse residents (low risk_tolerance) go first.
        urgency = current_idx - threshold_idx
        if urgency >= 1 or self.risk_tolerance < 0.35:
            return True
        return random.random() > self.risk_tolerance

    def _assign_destinations(self):
        eligible = {k: v for k, v in SHELTERS.items() if not v["requires_car"] or self.has_car}
        if not eligible:
            eligible = SHELTERS
        self.assigned_shelter = min(
            eligible,
            key=lambda k: abs(eligible[k]["lat"] - self.lat) + abs(eligible[k]["lng"] - self.lng),
        )
        self.assigned_bridge = min(
            BRIDGES,
            key=lambda k: abs(BRIDGES[k]["lat"] - self.lat) + abs(BRIDGES[k]["lng"] - self.lng),
        )
        self.model.bridges[self.assigned_bridge]["current_load"] += 1

    def step(self):
        if self.status == "waiting":
            if self._should_evacuate():
                self.status = "evacuating"
                self._assign_destinations()
        elif self.status == "evacuating":
            speed = 0.15 if self.mobility == "normal" else 0.08
            self.progress = min(1.0, self.progress + speed)
            shelter = self.model.shelters[self.assigned_shelter]
            t = self.progress
            self.lat = self.start_lat + (shelter["lat"] - self.start_lat) * t
            self.lng = self.start_lng + (shelter["lng"] - self.start_lng) * t
            if self.progress >= 1.0:
                self.status = "safe"
                self.model.shelters[self.assigned_shelter]["occupancy"] += 1
                self.model.bridges[self.assigned_bridge]["current_load"] = max(
                    0, self.model.bridges[self.assigned_bridge]["current_load"] - 1
                )
