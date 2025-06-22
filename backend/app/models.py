from typing import List, Optional, Literal
from pydantic import BaseModel

class ObjectInfo(BaseModel):
    distance: str
    temp: str
    moons: Optional[int] = None
    atmosphere: Optional[str] = None
    magnitude: Optional[str] = None

class CelestialObject(BaseModel):
    id: str
    name: str
    type: Literal['planet', 'star', 'moon']
    position: List[float]  # [x, y, z]
    size: float
    color: str
    texture: Optional[str] = None
    info: ObjectInfo
    narrationPrompt: str

class ViewState(BaseModel):
    cameraPosition: List[float]
    lookAt: List[float]
    selectedObjectId: Optional[str] = None

class NarrationRequest(BaseModel):
    objectId: str
    language: Literal['en', 'es', 'fr', 'hi']

class NarrationResponse(BaseModel):
    objectId: str
    text: str
    language: str

class NavigationAction(BaseModel):
    type: Literal['navigate']
    targetId: str
    duration: int = 2000

class ChatMessage(BaseModel):
    message: str
    currentView: ViewState
    timestamp: int

class ChatResponse(BaseModel):
    text: str
    action: Optional[NavigationAction] = None

class UniverseData(BaseModel):
    objects: List[CelestialObject]
