from typing import List, Optional, Literal, Dict, Any, Union
from pydantic import BaseModel

class ObjectInfo(BaseModel):
    distance: str
    temp: str
    moons: Optional[int] = None
    atmosphere: Optional[str] = None
    magnitude: Optional[str] = None
    interesting_fact: Optional[str] = None

class RingSystem(BaseModel):
    innerRadius: float
    outerRadius: float
    texture: Optional[str] = None
    color: str
    opacity: float

class CelestialObject(BaseModel):
    id: str
    name: str
    type: Literal['planet', 'star', 'moon', 'asteroid', 'comet', 'black_hole', 'nebula']
    position: List[float]  # [x, y, z]
    size: float
    color: str
    texture: Optional[str] = None
    textureMap: Optional[str] = None
    normalMap: Optional[str] = None
    bumpMap: Optional[str] = None
    specularMap: Optional[str] = None
    emissiveMap: Optional[str] = None
    emissiveIntensity: Optional[float] = None
    atmosphereColor: Optional[str] = None
    atmosphereDensity: Optional[float] = None
    ringSystem: Optional[RingSystem] = None
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

# Universe context for chat
class UniverseContextObject(BaseModel):
    id: str
    name: str
    type: str

class UniverseContext(BaseModel):
    universeName: str
    universeType: str
    objects: List[UniverseContextObject]

class ChatMessage(BaseModel):
    message: str
    currentView: ViewState
    timestamp: int
    universeContext: Optional[UniverseContext] = None

class ChatResponse(BaseModel):
    text: str
    action: Optional[Union[NavigationAction, GenerateUniverseAction]] = None

# Speech-related models
class SpeechInputRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    language: Optional[str] = 'en'
    sample_rate: int = 16000
    sample_width: int = 2

class SpeechInputResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    language: Optional[str] = None
    confidence: Optional[float] = None
    error: Optional[str] = None

class SpeechOutputRequest(BaseModel):
    text: str
    language: str = 'en'
    voice_type: str = 'neural'  # 'neural' or 'standard'

class SpeechOutputResponse(BaseModel):
    success: bool
    audio_url: Optional[str] = None
    error: Optional[str] = None

class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str

class AvailableLanguagesResponse(BaseModel):
    languages: List[LanguageInfo]

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
    theme: Optional[str] = None
    num_objects: Optional[int] = None

class GeneratedUniverse(BaseModel):
    id: str
    type: str
    name: str
    description: str
    objects: List[CelestialObject]
    generated_at: int
    parameters_used: Dict[str, Any]