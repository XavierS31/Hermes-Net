from pydantic import BaseModel
from typing import Optional, List

class Position(BaseModel):
    lng: float
    lat: float

class AgentInput(BaseModel):
    id: str
    type: str
    label: str
    neighborhood: str
    position: Position
    assigned_zone_id: Optional[str] = None
    needs_medical: bool = False
    speed: float = 0.7

class AgentDecision(BaseModel):
    agent_id: str
    action: str
    reasoning: str
    urgency: str
    message: Optional[str] = None

class SimulationStartInput(BaseModel):
    hurricane: dict
    agents: List[AgentInput]
    safe_zones: List[dict]

class AgentDecisionsInput(BaseModel):
    hurricane: dict
    agents: List[dict]   # full agent objects with name/age/situation/personality
    safe_zones: List[dict]