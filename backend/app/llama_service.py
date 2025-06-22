import json
import httpx
from typing import Dict, Any, List, Optional
import os
import uuid
import time
import hashlib
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
        
        # Simple in-memory cache
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour cache
        
    def _load_universe_context(self) -> str:
        """Load universe data as context"""
        with open("data/solar_system.json", "r") as f:
            data = json.load(f)
        return json.dumps(data, indent=2)
    
    def _get_cache_key(self, prompt: str, params: Dict[str, Any]) -> str:
        """Generate cache key from prompt and parameters"""
        cache_str = f"{prompt}:{json.dumps(params, sort_keys=True)}"
        return hashlib.md5(cache_str.encode()).hexdigest()
    
    def _get_from_cache(self, cache_key: str) -> Optional[str]:
        """Get response from cache if not expired"""
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if time.time() - cached_data['timestamp'] < self.cache_ttl:
                print(f"🎯 Cache hit for key: {cache_key[:8]}...")
                return cached_data['response']
        return None
    
    def _save_to_cache(self, cache_key: str, response: str):
        """Save response to cache"""
        self.cache[cache_key] = {
            'response': response,
            'timestamp': time.time()
        }
        print(f"💾 Cached response for key: {cache_key[:8]}...")
    
    async def _call_llama_api(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.7, system_prompt: str = None) -> str:
        """Call the actual Llama API using chat completions endpoint"""
        cache_key = self._get_cache_key(prompt, {'max_tokens': max_tokens, 'temperature': temperature})
        
        # Check cache first
        cached_response = self._get_from_cache(cache_key)
        if cached_response:
            return cached_response
        
        try:
            print(f"🦙 Calling Llama API...")
            print(f"📍 API Key (first 10 chars): {self.api_key[:10]}..." if self.api_key else "❌ No API key!")
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Build messages array
            messages = []
            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            messages.append({
                "role": "user",
                "content": prompt
            })
            
            payload = {
                "model": "Llama-4-Maverick-17B-128E-Instruct-FP8",
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": 0.9
            }
            
            print(f"📤 Sending request to: https://api.llama.com/v1/chat/completions")
            
            response = await self.client.post(
                "https://api.llama.com/v1/chat/completions",
                json=payload,
                headers=headers
            )
            
            print(f"📥 Response status: {response.status_code}")
            
            if response.status_code == 401:
                print(f"❌ Authentication failed. Check your LLAMA_API_KEY in .env file")
                print(f"Response: {response.text}")
            
            if response.status_code != 200:
                print(f"❌ Llama API error: {response.status_code} - {response.text}")
                raise Exception(f"Llama API error: {response.status_code} - {response.text}")
            
            result = response.json()
            print(f"📋 Full API response: {json.dumps(result, indent=2)}")
            
            # Try different paths to get the content
            content = None
            
            # Llama API format
            if 'completion_message' in result:
                completion = result['completion_message']
                if 'content' in completion and isinstance(completion['content'], dict):
                    if 'text' in completion['content']:
                        content = completion['content']['text']
                elif 'content' in completion and isinstance(completion['content'], str):
                    content = completion['content']
            
            # Standard OpenAI format (fallback)
            elif 'choices' in result and len(result['choices']) > 0:
                choice = result['choices'][0]
                if 'message' in choice and 'content' in choice['message']:
                    content = choice['message']['content']
                elif 'text' in choice:
                    content = choice['text']
            
            # Alternative formats
            elif 'content' in result:
                content = result['content']
            elif 'response' in result:
                content = result['response']
            elif 'text' in result:
                content = result['text']
            
            if not content:
                print(f"⚠️ Could not extract content from response")
                content = ""
            
            text = content.strip() if content else ""
            
            print(f"✅ Extracted text: {text}")
            
            # Cache the response
            if text:
                self._save_to_cache(cache_key, text)
            
            return text
            
        except Exception as e:
            print(f"❌ Error calling Llama API: {e}")
            raise
    
    async def generate_universe(self, request: UniverseGenerationRequest) -> GeneratedUniverse:
        """Generate a complete universe using Llama API"""
        
        # Build the prompt based on universe type
        prompt = self._build_universe_generation_prompt(request)
        
        try:
            # Call Llama API with system prompt
            system_prompt = "You are an expert astronomer and universe designer. Generate scientifically accurate but engaging celestial systems. Always respond with valid JSON only, no other text."
            response_text = await self._call_llama_api(prompt, max_tokens=2000, temperature=0.8, system_prompt=system_prompt)
            
            # Try to parse JSON from response
            # Llama might include text before/after JSON, so we need to extract it
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                universe_data = json.loads(json_str)
                
                # Validate and create CelestialObjects
                objects = []
                for obj_data in universe_data.get('objects', []):
                    try:
                        obj = CelestialObject(**obj_data)
                        objects.append(obj)
                    except Exception as e:
                        print(f"⚠️ Skipping invalid object: {e}")
                        continue
                
                if objects:
                    return GeneratedUniverse(
                        id=str(uuid.uuid4()),
                        type=request.universe_type,
                        name=universe_data.get('name', f"Generated {request.universe_type}"),
                        description=universe_data.get('description', "A procedurally generated universe"),
                        objects=objects,
                        generated_at=int(time.time()),
                        parameters_used=request.parameters or {}
                    )
            
            # If parsing fails, fall back to example
            print("⚠️ Failed to parse Llama response, using fallback")
            
        except Exception as e:
            print(f"❌ Error generating universe with Llama: {e}")
        
        # Fallback to pre-defined examples
        if request.universe_type == "exoplanet-system":
            return self._generate_example_exoplanet_system(request)
        else:
            return self._generate_default_universe(request)
    
    def _build_universe_generation_prompt(self, request: UniverseGenerationRequest) -> str:
        """Build detailed prompt for universe generation"""
        
        base_prompt = f"""Generate a detailed JSON structure for a {request.universe_type} universe.

Create a scientifically plausible but visually interesting collection of celestial objects.

Return ONLY valid JSON (no other text) in this exact format:
{{
    "name": "System Name",
    "description": "Brief description of the system",
    "objects": [
        {{
            "id": "unique_lowercase_id",
            "name": "Object Name",
            "type": "star|planet|moon|asteroid|comet",
            "position": [x, y, z],
            "size": 0.1 to 5.0,
            "color": "#hexcolor",
            "info": {{
                "distance": "X AU from star",
                "temp": "X K",
                "atmosphere": "composition if applicable",
                "moons": number if applicable,
                "interesting_fact": "An engaging fact about this object"
            }},
            "narrationPrompt": "Key points for AI narrator to discuss"
        }}
    ]
}}

Guidelines for {request.universe_type}:
"""
        
        if request.universe_type == "solar-system":
            base_prompt += """
- Include our Sun and all 8 planets in correct order
- Use accurate colors and sizes (relative scale)
- Position planets at realistic distances
- Include accurate temperature and atmosphere data
"""
        elif request.universe_type == "exoplanet-system":
            base_prompt += """
- Create a star different from our Sun (red dwarf, binary, etc.)
- Include 3-6 exoplanets with varied characteristics
- At least one potentially habitable planet
- Mix of terrestrial and gas giant planets
- Creative names inspired by the star's characteristics
"""
        elif request.universe_type == "star-wars":
            base_prompt += """
- Create a Star Wars inspired system with fictional planets
- Include iconic locations like Tatooine (binary stars), Hoth (ice planet), Coruscant (city planet)
- Use creative names and descriptions fitting the Star Wars universe
- Make it feel epic and cinematic
- Include diverse planet types (desert, ice, forest, volcanic)
"""
        
        base_prompt += """
Ensure all positions spread objects appropriately in 3D space.
Make it educational and visually interesting for space exploration."""
        
        return base_prompt
    
    async def generate_narration(self, request: NarrationRequest) -> NarrationResponse:
        """Generate narration for a celestial object using Llama"""
        
        # System prompt for narration
        system_prompt = "You are a world-class space documentary narrator like David Attenborough or Neil deGrasse Tyson. Create engaging, educational narrations that inspire wonder about the cosmos."
        
        # Build prompt for narration
        prompt = f"""Generate an engaging narration about {request.objectId}.

Guidelines:
- 30-45 seconds when read aloud (about 80-120 words)
- Mix scientific facts with wonder and awe
- Make it accessible to general audiences
- Use vivid, descriptive language
- Language: {request.language}

Context about the object:
{self.universe_context}

Write only the narration text."""

        try:
            # Call Llama API
            narration_text = await self._call_llama_api(prompt, max_tokens=300, temperature=0.7, system_prompt=system_prompt)
            
            # Handle language codes
            language_map = {
                'en': 'English',
                'es': 'Spanish',
                'fr': 'French',
                'hi': 'Hindi'
            }
            
            # If not English, ask for translation
            if request.language != 'en':
                translation_prompt = f"""Translate the following space documentary narration to {language_map[request.language]}:

{narration_text}

Maintain the poetic, awe-inspiring tone while ensuring scientific accuracy."""
                
                narration_text = await self._call_llama_api(translation_prompt, max_tokens=400, temperature=0.3)
            
            return NarrationResponse(
                objectId=request.objectId,
                text=narration_text,
                language=request.language
            )
            
        except Exception as e:
            print(f"❌ Error generating narration: {e}")
            # Fallback to static narration
            return NarrationResponse(
                objectId=request.objectId,
                text=f"This is {request.objectId}, a magnificent celestial body in our universe. Its mysteries continue to inspire our exploration of the cosmos.",
                language=request.language
            )
    
    async def handle_chat(self, message: ChatMessage) -> ChatResponse:
        """Handle chat messages with Llama-powered understanding"""
        
        # System prompt for chat
        system_prompt = """You are an intelligent space exploration assistant in a 3D universe visualization app.

You can:
1. Navigate to existing celestial objects
2. Generate new universes based on user requests
3. Answer questions about space

When the user asks to go to a fictional universe, different solar system, or wants to explore something new, you should generate it.

IMPORTANT: Respond with ONLY valid JSON, no markdown formatting, no extra text."""
        
        # Build the user prompt
        prompt = f"""User's message: "{message.message}"

Current universe contains: Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune

Analyze the user's intent:
- If they want to go to an existing object (like Mars), use navigate action
- If they want a different universe (Star Wars, Andromeda, exoplanets, etc.), use generate_universe action
- If asking a question, just respond with text

Examples:
- "Go to Mars" -> navigate to mars
- "Take me to Star Wars universe" -> generate_universe with type "star-wars"
- "Show me an alien solar system" -> generate_universe with type "exoplanet-system"
- "I want to see Tatooine" -> generate_universe with type "star-wars"

Respond in this exact JSON format:
{{
    "text": "Your response",
    "action": {{
        "type": "navigate",
        "targetId": "object_id",
        "duration": 2000
    }}
}}

OR for universe generation:
{{
    "text": "Your response",
    "action": {{
        "type": "generate_universe",
        "universe_type": "universe-type-id",
        "parameters": {{}}
    }}
}}

Universe types available: solar-system, exoplanet-system, binary-system, galaxy-core, fictional, star-wars"""

        try:
            # Call Llama API
            response_text = await self._call_llama_api(prompt, max_tokens=200, temperature=0.5, system_prompt=system_prompt)
            
            # Try to parse JSON response
            try:
                # Sometimes Llama returns JSON with markdown formatting
                json_str = response_text.strip()
                if json_str.startswith('```json'):
                    json_str = json_str[7:]  # Remove ```json
                if json_str.endswith('```'):
                    json_str = json_str[:-3]  # Remove ```
                json_str = json_str.strip()
                
                response_data = json.loads(json_str)
                return ChatResponse(**response_data)
            except Exception as e:
                print(f"⚠️ Failed to parse JSON response: {e}")
                print(f"Raw response: {response_text}")
                # If JSON parsing fails, return as plain text response
                return ChatResponse(text=response_text.strip())
                
        except Exception as e:
            print(f"❌ Error in chat handling: {e}")
            return ChatResponse(
                text="I'm having trouble understanding right now. Try asking me to navigate to a specific planet or ask about space!"
            )
    
    # Keep existing helper methods
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
    
    async def close(self):
        """Clean up resources"""
        await self.client.aclose()