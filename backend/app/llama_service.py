import json
import httpx
from typing import Dict, Any
import os
from app.models import (
    NarrationRequest, NarrationResponse,
    ChatMessage, ChatResponse, NavigationAction
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
            # text = await self._generate_with_llama(request)
        
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
