"""
Physics-based hurricane exposure for Tampa Bay (Holland wind field, surge heuristic, bathymetry funnel).

References:
- Holland (1980), Monthly Weather Review — radial wind profile and B parameter.
- HURDAT2-style inputs: central pressure, RMAX (radius of maximum winds), Vmax.
"""

from __future__ import annotations

import math
import numpy as np
from pyproj import Geod
from scipy.interpolate import interp1d
from shapely.geometry import Point, Polygon

# Environmental surface pressure (mb) — typical MSL
P_ENV_MB = 1013.0

# Approximate Tampa Bay shallow-shelf / funnel polygon (lon, lat) — storm eye inside → surge multiplier
TAMPA_BAY_FUNNEL = Polygon(
    [
        (-82.92, 27.52),
        (-82.28, 27.52),
        (-82.28, 27.92),
        (-82.92, 27.92),
        (-82.92, 27.52),
    ]
)

# Sunshine Skyway closure when *local* sustained wind at bridge exceeds this (mph)
SKYWAY_WIND_CLOSE_MPH = 40.0

# Surge threshold trapping residents who have not reached shelter (ft)
SURGE_TRAP_FT = 3.0

_geod = Geod(ellps="WGS84")


def holland_B(delta_p_mb: float, r_max_nm: float) -> float:
    """
    Holland B shape parameter (dimensionless), common empirical fit (HURDAT2 / Holland 1980 family).
    delta_p_mb = p_env - p_c; r_max_nm = radius of maximum winds (nm).
    """
    r = max(5.0, min(60.0, r_max_nm))
    dp = max(0.0, min(120.0, delta_p_mb))
    B = 1.38 + 0.00184 * dp - 0.00309 * (r**2)
    return max(1.0, min(2.6, B))


def _axisymmetric_wind_ratio(r_nm: float, r_max_nm: float, B: float) -> float:
    """V / Vmax from Holland radial profile: V/Vmax = sqrt( x^B * exp(1 - x^B) ), x = r / Rmax."""
    R = max(r_max_nm, 1e-3)
    x = max(1e-6, r_nm / R)
    x = min(x, 80.0)
    inner = (x**B) * math.exp(1.0 - (x**B))
    return math.sqrt(max(0.0, min(1.0, inner)))


def _azimuth_deg_eye_to_point(eye_lon: float, eye_lat: float, lon: float, lat: float) -> float:
    """Azimuth (deg clockwise from north) from eye toward point."""
    fwd_az, _back_az, _d = _geod.inv(eye_lon, eye_lat, lon, lat)
    return (fwd_az + 360.0) % 360.0


def _asymmetric_wind_factor(azimuth_to_point_deg: float, track_heading_deg: float) -> float:
    """
    Northern Hemisphere: winds strongest in the right-front quadrant relative to motion.
    track_heading_deg: direction storm motion (0=N, 90=E).
    """
    rel = (azimuth_to_point_deg - track_heading_deg + 360.0) % 360.0
    # Peak enhancement near 90° (right of track)
    return 1.0 + 0.22 * math.cos(math.radians(rel - 90.0))


class HurricanePhysics:
    """
    Holland pressure/wind field + quadrant surge model + Tampa Bay funnel (bathymetry proxy).

    Not a full ADCIRC run — uses met + geometry constraints suitable for ADK/Mesa coupling.
    """

    def __init__(
        self,
        center_lat: float,
        center_lon: float,
        central_pressure_mb: float,
        max_wind_speed_mph: float,
        r_max_nm: float,
        track_heading_deg: float,
        p_env_mb: float = P_ENV_MB,
    ):
        self.center_lat = float(center_lat)
        self.center_lon = float(center_lon)
        self.p_c = float(central_pressure_mb)
        self.p_env = float(p_env_mb)
        self.v_max_mph = max(0.0, float(max_wind_speed_mph))
        self.r_max_nm = max(5.0, float(r_max_nm))
        self.track_heading = float(track_heading_deg) % 360.0
        self.delta_p = max(0.0, self.p_env - self.p_c)
        self.B = holland_B(self.delta_p, self.r_max_nm)

        # Smooth surge azimuth factor: right-front (relative ~90°) highest (scipy 1-D interpolant)
        ang = np.linspace(0.0, 360.0, 37)
        rel = (ang - 90.0) * (np.pi / 180.0)
        factors = 1.0 + 0.32 * np.cos(rel)
        self._surge_azimuth = interp1d(
            ang,
            factors,
            kind="cubic",
            bounds_error=False,
            fill_value=(float(factors[0]), float(factors[-1])),
        )

    def distance_nm(self, lat: float, lon: float) -> float:
        _fa, _ba, dist_m = _geod.inv(self.center_lon, self.center_lat, lon, lat)
        return dist_m / 1852.0

    def eye_in_tampa_bay_funnel(self) -> bool:
        return Point(self.center_lon, self.center_lat).within(TAMPA_BAY_FUNNEL)

    def wind_speed_mph_at(self, lat: float, lon: float) -> float:
        """Holland axisymmetric gradient wind (mph) × NH asymmetric enhancement."""
        r_nm = self.distance_nm(lat, lon)
        ratio = _axisymmetric_wind_ratio(r_nm, self.r_max_nm, self.B)
        v_sym = self.v_max_mph * ratio
        az = _azimuth_deg_eye_to_point(self.center_lon, self.center_lat, lon, lat)
        v = v_sym * _asymmetric_wind_factor(az, self.track_heading)
        return max(0.0, min(220.0, v))

    def surge_height_ft_at(self, lat: float, lon: float) -> float:
        """
        Heuristic surge (ft): pressure deficit + radial decay + quadrant (scipy) + optional funnel.
        """
        r_nm = self.distance_nm(lat, lon)
        az = _azimuth_deg_eye_to_point(self.center_lon, self.center_lat, lon, lat)
        rel = (az - self.track_heading + 360.0) % 360.0
        quad = float(self._surge_azimuth(rel))

        # Base pressure-driven surge (ft), decays with distance
        s0 = 0.028 * self.delta_p * math.exp(-r_nm / 120.0)

        # Bathymetry / shelf proxy: stronger in shallow eastern/northern bay (fixed gradient)
        shelf = 1.0 + 0.12 * max(0.0, (27.85 - lat)) + 0.08 * max(0.0, (-82.35 - lon))

        surge = s0 * quad * shelf

        if self.eye_in_tampa_bay_funnel():
            surge *= 1.5

        return max(0.0, surge)

    def wind_exposure_01(self, wind_mph: float) -> float:
        """Normalized 0–1 exposure metric for API / frontend."""
        return max(0.0, min(1.0, wind_mph / 130.0))

    def snapshot_metrics(self) -> dict:
        return {
            "holland_B": round(self.B, 4),
            "delta_p_mb": round(self.delta_p, 2),
            "p_env_mb": self.p_env,
            "r_max_nm": round(self.r_max_nm, 2),
            "eye_in_tampa_bay_funnel": self.eye_in_tampa_bay_funnel(),
            "skyway_wind_close_mph": SKYWAY_WIND_CLOSE_MPH,
        }


def wind_mph_at_bridge(
    physics: HurricanePhysics,
    bridge_lat: float,
    bridge_lon: float,
) -> float:
    return physics.wind_speed_mph_at(bridge_lat, bridge_lon)
