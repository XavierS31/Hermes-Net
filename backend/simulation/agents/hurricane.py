"""
Stochastic hurricane agent: forward motion with bearing uncertainty, intensity changes,
Saffir–Simpson category, wind radii (R34 / RMW), and growing track uncertainty (NHC-style cone).
"""

from __future__ import annotations

import math
import random

import mesa

from simulation.geography import TAMPA_REF

# Narrative hours advanced per Mesa step (tune arrival vs. reset at tick ~25)
SIM_HOURS_PER_TICK = 1.25

MILES_PER_DEG_LAT = 69.0
MAX_TRACK_HISTORY = 48


def _miles_per_deg_lng(lat: float) -> float:
    return MILES_PER_DEG_LAT * math.cos(math.radians(lat))


def _bearing_deg(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    φ1 = math.radians(lat1)
    φ2 = math.radians(lat2)
    Δλ = math.radians(lng2 - lng1)
    y = math.sin(Δλ) * math.cos(φ2)
    x = math.cos(φ1) * math.sin(φ2) - math.sin(φ1) * math.cos(φ2) * math.cos(Δλ)
    θ = math.degrees(math.atan2(y, x))
    return (θ + 360) % 360


def _move_miles(lat: float, lng: float, distance_miles: float, bearing_deg: float) -> tuple[float, float]:
    """Move from (lat,lng) along bearing (0=N, 90=E)."""
    br = math.radians(bearing_deg)
    dlat = (distance_miles * math.cos(br)) / MILES_PER_DEG_LAT
    lat2 = lat + dlat
    dlng = (distance_miles * math.sin(br)) / _miles_per_deg_lng((lat + lat2) / 2)
    return lat2, lng + dlng


def _saffir_simpson(wind_mph: float) -> int:
    w = max(0.0, wind_mph)
    if w < 74:
        return 0
    if w < 96:
        return 1
    if w < 111:
        return 2
    if w < 130:
        return 3
    if w < 157:
        return 4
    return 5


class HurricaneAgent(mesa.Agent):
    def __init__(self, model):
        super().__init__(model)
        self.path = model.hurricane_path
        p0 = self.path[0]
        self.lat = float(p0["lat"]) + random.uniform(-0.12, 0.12)
        self.lng = float(p0["lng"]) + random.uniform(-0.12, 0.12)

        t_lat, t_lng = float(TAMPA_REF["lat"]), float(TAMPA_REF["lng"])
        self._bearing = _bearing_deg(self.lat, self.lng, t_lat, t_lng)
        self._bearing_inertia = random.uniform(0.82, 0.92)

        # Forward motion (mph) — typical tropical cyclone translation 5–25 mph
        self.forward_speed_mph = random.uniform(9.0, 19.0)

        # Intensity (max sustained wind, mph)
        self._max_wind_potential = random.uniform(105.0, 165.0)
        self.wind_speed = float(random.uniform(72.0, min(98.0, self._max_wind_potential * 0.65)))

        # Size (nautical miles) — simplified isotropic radii
        self.rmw_nm = random.uniform(12.0, 32.0)
        self.r34_nm = max(45.0, min(200.0, self.rmw_nm * random.uniform(3.5, 6.5)))

        self.central_pressure_mb = self._pressure_from_wind(self.wind_speed)

        # Track forecast uncertainty (nm), grows like sqrt(time) — cone width proxy
        self.position_uncertainty_nm = random.uniform(18.0, 35.0)
        self._uncertainty_growth_nm = random.uniform(4.5, 9.0)

        self.track_history: list[list[float]] = [[float(self.lng), float(self.lat)]]
        self.category = _saffir_simpson(self.wind_speed)

    @property
    def bearing_deg(self) -> float:
        return float(self._bearing)

    @staticmethod
    def _pressure_from_wind(wind_mph: float) -> float:
        # Very rough empirical: lower pressure = stronger wind
        w = max(25.0, min(185.0, wind_mph))
        return round(1013.0 - (w / 185.0) * 78.0, 1)

    def distance_to_tampa(self) -> float:
        tampa_lat, tampa_lng = float(TAMPA_REF["lat"]), float(TAMPA_REF["lng"])
        return math.sqrt(
            (self.lat - tampa_lat) ** 2 + (self.lng - tampa_lng) ** 2
        ) * MILES_PER_DEG_LAT

    def step(self):
        t_lat, t_lng = float(TAMPA_REF["lat"]), float(TAMPA_REF["lng"])
        d_tampa = self.distance_to_tampa()

        target_br = _bearing_deg(self.lat, self.lng, t_lat, t_lng)
        # Bearing wanders (AR-like) + bias toward Tampa
        noise = random.gauss(0.0, 5.5)
        cross = random.gauss(0.0, 3.2)
        self._bearing = (
            self._bearing_inertia * self._bearing
            + (1.0 - self._bearing_inertia) * target_br
            + noise
            + cross
        )
        self._bearing %= 360.0

        # Speed varies (eyewall cycles / environmental shear proxy)
        self.forward_speed_mph = max(4.5, min(28.0, self.forward_speed_mph + random.gauss(0.0, 1.1)))

        step_miles = (
            self.forward_speed_mph
            * SIM_HOURS_PER_TICK
            * max(0.45, random.gauss(1.0, 0.06))
        )

        self.lat, self.lng = _move_miles(self.lat, self.lng, step_miles, self._bearing)

        # Intensity: strengthen over warm water, weaken near/over land
        if d_tampa > 120:
            target_wind = min(self._max_wind_potential, 65.0 + 95.0 * math.exp(-d_tampa / 420.0))
        elif d_tampa > 45:
            target_wind = min(self._max_wind_potential, self.wind_speed + random.gauss(1.2, 2.8))
        else:
            target_wind = max(35.0, self.wind_speed - random.uniform(2.0, 9.0))

        self.wind_speed = max(25.0, min(185.0, self.wind_speed + 0.35 * (target_wind - self.wind_speed) + random.gauss(0.0, 2.4)))
        self.category = _saffir_simpson(self.wind_speed)
        self.central_pressure_mb = self._pressure_from_wind(self.wind_speed)

        # Eye / wind field size responds to intensity a bit
        self.rmw_nm = max(8.0, min(45.0, self.rmw_nm + random.gauss(0.15, 0.9)))
        self.r34_nm = max(self.rmw_nm * 2.8, min(220.0, self.r34_nm + random.gauss(0.8, 3.5)))

        # Uncertainty cone widens with time (forecast hour proxy = tick)
        self.position_uncertainty_nm = math.sqrt(
            self.position_uncertainty_nm ** 2 + self._uncertainty_growth_nm ** 2
        )

        self.track_history.append([float(self.lng), float(self.lat)])
        if len(self.track_history) > MAX_TRACK_HISTORY:
            self.track_history = self.track_history[-MAX_TRACK_HISTORY:]
