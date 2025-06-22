from typing import List, Optional, Literal, Dict, Any, Union
from pydantic import BaseModel

class ObjectInfo(BaseModel):
    distance: str
    temp: str
    moons: Optional[int] = None
    atmosphere: Optional[str] = None
    magnitude: Optional[str] = None
    interesting_fact: Optional[str] = None  # New field for AI-generated facts

class CelestialObject(BaseModel):
    id: str
    name: str
    type: Literal['planet', 'star', 'moon', 'asteroid', 'comet', 'black_hole', 'nebula']  # Extended types
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

class GenerateUniverseAction(BaseModel):
    type: Literal['generate_universe']
    universe_type: str
    parameters: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    message: str
    currentView: ViewState
    timestamp: int

class ChatResponse(BaseModel):
    text: str
    action: Optional[Union[NavigationAction, GenerateUniverseAction]] = None

class UniverseData(BaseModel):
    objects: List[CelestialObject]

# Universe generation models
class UniverseGenerationRequest(BaseModel):
    universe_type: str  # Allow any string for dynamic universe types
    parameters: Optional[Dict[str, Any]] = None
    
class UniverseGenerationParameters(BaseModel):
    size: Literal['small', 'medium', 'large'] = 'medium'
    complexity: Literal['simple', 'moderate', 'complex'] = 'moderate'
    style: Literal['realistic', 'educational', 'fantastical'] = 'realistic'
    theme: Optional[str] = None  # e.g., "ice worlds", "desert planets"
    num_objects: Optional[int] = None  # Override default count

class GeneratedUniverse(BaseModel):
    id: str
    type: str
    name: str
    description: str
    objects: List[CelestialObject]
    generated_at: int  # Timestamp
    parameters_used: Dict[str, Any]