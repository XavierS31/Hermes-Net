"""
Skeleton Mesa model: each `step()` advances one 12-hour simulation heartbeat.

Agents register with `SimultaneousActivation` for decoupled, tick-synchronized updates.
"""

from __future__ import annotations

from mesa import Model
from mesa.time import SimultaneousActivation


class TampaBayModel(Model):
    """Tampa Bay domain model; Mesa state is owned by FastAPI `app.state` for WebSocket streaming."""

    def __init__(self, seed: int | None = None) -> None:
        # Mesa 2.x: `seed` is read in `Model.__new__` for RNG setup
        super().__init__(seed=seed)
        self.schedule = SimultaneousActivation(self)
        self.tick_hours: int = 12
        self.simulated_hours_elapsed: int = 0

    def step(self) -> None:
        self.schedule.step()
        self.simulated_hours_elapsed += self.tick_hours

    def snapshot_positions(self) -> list[dict[str, float | str]]:
        """Future: resident / unit coordinates for deck.gl TripsLayer streaming."""
        return []
