import json
import httpx
from typing import Dict, Any, List
import os
import uuid
import time
from app.models import (
    NarrationRequest, NarrationResponse,
    ChatMessage, ChatResponse, NavigationAction,
    UniverseGenerationRequest, GeneratedUniverse, CelestialObject
)

class LlamaService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.llama.ai/v4"
        self.universe_context = self._load_universe_context()
        self.client = httpx.AsyncClient(timeout=30.0)
        
    def _load_universe_context(self) -> str:
        """Load universe data as context"""
        with open("data/solar_system.json", "r") as f:
            data = json.load(f)
        return json.dumps(data, indent=2)
    
    async def generate_universe(self, request: UniverseGenerationRequest) -> GeneratedUniverse:
        """Generate a complete universe using Llama API"""
        
        # Build the prompt based on universe type
        prompt = self._build_universe_generation_prompt(request)
        
        # For MVP/testing, return a pre-generated universe based on type
        # Replace this with actual Llama API call when ready
        if request.universe_type == "solar-system":
            # Return our static solar system for now
            with open("data/solar_system.json", "r") as f:
                data = json.load(f)
                return GeneratedUniverse(
                    id=str(uuid.uuid4()),
                    type=request.universe_type,
                    name="Sol System",
                    description="Our home solar system with 8 planets",
                    objects=[CelestialObject(**obj) for obj in data["objects"]],
                    generated_at=int(time.time()),
                    parameters_used=request.parameters or {}
                )
        
        # TODO: Implement actual Llama API call
        # response = await self._call_llama_api(prompt)
        # return self._parse_universe_response(response)
        
        # For now, generate a simple exoplanet system as example
        if request.universe_type == "exoplanet-system":
            return self._generate_example_exoplanet_system(request)
        
        # Default fallback
        return self._generate_default_universe(request)
    
    def _build_universe_generation_prompt(self, request: UniverseGenerationRequest) -> str:
        """Build detailed prompt for universe generation"""
        
        base_prompt = f"""
        Generate a detailed JSON structure for a {request.universe_type} universe.
        
        Requirements:
        1. Create scientifically plausible but visually interesting celestial objects
        2. Include varied object types (planets, moons, stars, etc.)
        3. Position objects in 3D space with proper spacing
        4. Add interesting facts and details for each object
        5. Make it educational and engaging
        
        Parameters:
        {json.dumps(request.parameters or {}, indent=2)}
        
        Return ONLY valid JSON in this exact format:
        {{
            "objects": [
                {{
                    "id": "unique_lowercase_id",
                    "name": "Object Name",
                    "type": "planet|star|moon|asteroid|comet",
                    "position": [x, y, z],
                    "size": 0.1 to 5.0,
                    "color": "#hexcolor",
                    "info": {{
                        "distance": "X AU",
                        "temp": "X K",
                        "atmosphere": "composition if applicable",
                        "moons": number if applicable,
                        "interesting_fact": "An engaging fact about this object"
                    }},
                    "narrationPrompt": "Key points for AI narrator to discuss"
                }}
            ]
        }}
        
        Guidelines:
        - Position coordinates should spread objects across x: -100 to 100, y: -20 to 20, z: -100 to 100
        - Star should typically be at or near [0, 0, 0]
        - Planets should be spaced appropriately (not too close)
        - Colors should be realistic for the object type
        - Include at least 5-10 objects depending on complexity
        """
        
        return base_prompt
    
    def _generate_example_exoplanet_system(self, request: UniverseGenerationRequest) -> GeneratedUniverse:
        """Generate an example exoplanet system"""
        objects = [
            {
                "id": "kepler22",
                "name": "Kepler-22",
                "type": "star",
                "position": [0, 0, 0],
                "size": 2.8,
                "color": "#FFD700",
                "info": {
                    "distance": "0 AU",
                    "temp": "5518 K",
                    "magnitude": "11.7",
                    "interesting_fact": "Slightly smaller and cooler than our Sun, located 620 light-years away"
                },
                "narrationPrompt": "Describe this sun-like star in the constellation Cygnus"
            },
            {
                "id": "kepler22b",
                "name": "Kepler-22b",
                "type": "planet",
                "position": [15, 0, 0],
                "size": 1.3,
                "color": "#4682B4",
                "info": {
                    "distance": "0.85 AU",
                    "temp": "295 K",
                    "atmosphere": "Unknown, possibly water vapor",
                    "moons": 0,
                    "interesting_fact": "First confirmed exoplanet in the habitable zone of a sun-like star"
                },
                "narrationPrompt": "Explain why this super-Earth might harbor life"
            },
            {
                "id": "kepler22c",
                "name": "Kepler-22c",
                "type": "planet",
                "position": [25, 3, -5],
                "size": 0.8,
                "color": "#CD853F",
                "info": {
                    "distance": "1.2 AU",
                    "temp": "250 K",
                    "atmosphere": "Thin, mostly CO2",
                    "moons": 0,
                    "interesting_fact": "A hypothetical rocky world at the edge of the habitable zone"
                },
                "narrationPrompt": "Describe this Mars-like world"
            }
        ]
        
        return GeneratedUniverse(
            id=str(uuid.uuid4()),
            type=request.universe_type,
            name="Kepler-22 System",
            description="A distant exoplanet system with potentially habitable worlds",
            objects=[CelestialObject(**obj) for obj in objects],
            generated_at=int(time.time()),
            parameters_used=request.parameters or {}
        )
    
    def _generate_default_universe(self, request: UniverseGenerationRequest) -> GeneratedUniverse:
        """Generate a default universe when type is not recognized"""
        # Minimal universe with just a star and planet
        objects = [
            {
                "id": "star1",
                "name": "Unknown Star",
                "type": "star",
                "position": [0, 0, 0],
                "size": 3,
                "color": "#FFFF00",
                "info": {
                    "distance": "0 AU",
                    "temp": "5778 K",
                    "magnitude": "-26.74",
                    "interesting_fact": "A mysterious star in an unknown system"
                },
                "narrationPrompt": "A mysterious star in an unknown system"
            },
            {
                "id": "planet1",
                "name": "Unknown Planet",
                "type": "planet",
                "position": [20, 0, 0],
                "size": 1,
                "color": "#4169E1",
                "info": {
                    "distance": "1 AU",
                    "temp": "288 K",
                    "atmosphere": "Unknown",
                    "moons": 0,
                    "interesting_fact": "A mysterious world orbiting a distant star"
                },
                "narrationPrompt": "A mysterious world orbiting a distant star"
            }
        ]
        
        return GeneratedUniverse(
            id=str(uuid.uuid4()),
            type=request.universe_type,
            name="Unknown System",
            description="A procedurally generated star system",
            objects=[CelestialObject(**obj) for obj in objects],
            generated_at=int(time.time()),
            parameters_used=request.parameters or {}
        )
    
    async def _call_llama_api(self, prompt: str) -> Dict[str, Any]:
        """Call the actual Llama API - implement when API key is available"""
        # TODO: Implement actual API call
        # headers = {"Authorization": f"Bearer {self.api_key}"}
        # response = await self.client.post(
        #     f"{self.base_url}/completions",
        #     json={
        #         "prompt": prompt,
        #         "max_tokens": 2000,
        #         "temperature": 0.7
        #     },
        #     headers=headers
        # )
        # return response.json()
        pass
    
    # Keep existing methods unchanged
    async def generate_narration(self, request: NarrationRequest) -> NarrationResponse:
        """Generate narration for a celestial object"""
        # For MVP, use pre-written narrations to save API costs
        narrations = {
            'earth': {
                'en': "Welcome to Earth, our pale blue dot. The third planet from the Sun, Earth is the only known world to harbor life. With swirling clouds, deep oceans, and diverse continents, it's truly a cosmic oasis.",
                'es': "Bienvenidos a la Tierra, nuestro punto azul pálido. El tercer planeta desde el Sol, la Tierra es el único mundo conocido que alberga vida.",
                'fr': "Bienvenue sur Terre, notre point bleu pâle. Troisième planète du Soleil, la Terre est le seul monde connu abritant la vie.",
                'hi': "पृथ्वी में आपका स्वागत है, हमारा नीला ग्रह। सूर्य से तीसरा ग्रह, पृथ्वी एकमात्र ज्ञात दुनिया है जहां जीवन है।"
            },
            'mars': {
                'en': "Behold Mars, the Red Planet. Its rusty hue comes from iron oxide on its surface. Once warm and wet, Mars now stands as a frozen desert with the largest volcano in our solar system.",
                'es': "Contempla Marte, el Planeta Rojo. Su tono oxidado proviene del óxido de hierro en su superficie.",
                'fr': "Voici Mars, la planète rouge. Sa teinte rouille provient de l'oxyde de fer à sa surface.",
                'hi': "मंगल ग्रह, लाल ग्रह। इसका जंग जैसा रंग इसकी सतह पर लौह ऑक्साइड से आता है।"
            }
        }
        
        # Get pre-written narration or generate with Llama
        object_id = request.objectId.lower()
        if object_id in narrations and request.language in narrations[object_id]:
            text = narrations[object_id][request.language]
        else:
            # Fallback to English or generate with Llama API
            text = f"This is {request.objectId}, a magnificent celestial body in our solar system."
            
            # Uncomment to use real Llama API
            text = await self._generate_with_llama(request)
        
        return NarrationResponse(
            objectId=request.objectId,
            text=text,
            language=request.language
        )
    
    async def handle_chat(self, message: ChatMessage) -> ChatResponse:
        """Handle chat messages with navigation commands"""
        msg_lower = message.message.lower()
        
        # Simple keyword-based navigation for MVP
        navigation_keywords = {
            'mars': 'mars',
            'earth': 'earth',
            'jupiter': 'jupiter',
            'saturn': 'saturn',
            'sun': 'sun',
            'mercury': 'mercury',
            'venus': 'venus',
            'neptune': 'neptune',
            'uranus': 'uranus'
        }
        
        # Check for navigation intent
        for keyword, target in navigation_keywords.items():
            if keyword in msg_lower and ('go' in msg_lower or 'take' in msg_lower or 'show' in msg_lower or 'navigate' in msg_lower):
                return ChatResponse(
                    text=f"Let's journey to {keyword.title()}! Prepare for an amazing view.",
                    action=NavigationAction(
                        type="navigate",
                        targetId=target,
                        duration=2000
                    )
                )
        
        # Simple Q&A responses
        if 'largest' in msg_lower and 'planet' in msg_lower:
            return ChatResponse(
                text="Jupiter is the largest planet in our solar system, with a diameter of about 142,984 km!",
                action=NavigationAction(type="navigate", targetId="jupiter", duration=2000)
            )
        
        if 'smallest' in msg_lower and 'planet' in msg_lower:
            return ChatResponse(
                text="Mercury is the smallest planet in our solar system, only slightly larger than Earth's Moon.",
                action=NavigationAction(type="navigate", targetId="mercury", duration=2000)
            )
        
        if 'life' in msg_lower:
            return ChatResponse(
                text="Earth is the only known planet with life. It has the perfect conditions: liquid water, suitable temperature, and a protective atmosphere."
            )
        
        # Default response
        return ChatResponse(
            text="That's a great question about space! Try asking me to navigate to a specific planet, or ask about the largest or smallest planets."
        )
    
    async def _generate_with_llama(self, request: Any) -> str:
        """Call real Llama API - implement when you have API key"""
        # headers = {"Authorization": f"Bearer {self.api_key}"}
        # response = await self.client.post(...)
        pass
    
    async def close(self):
        """Clean up resources"""
        await self.client.aclose()