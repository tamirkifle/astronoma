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
    UniverseGenerationRequest, GeneratedUniverse, CelestialObject,
    ObjectInfo, RingSystem
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
    
    def _fix_llama_response(self, obj_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fix common issues with Llama responses"""
        # Fix narrationPrompt if it's an array
        if isinstance(obj_data.get('narrationPrompt'), list):
            obj_data['narrationPrompt'] = ' '.join(obj_data['narrationPrompt'])
        
        # Ensure required fields exist
        if 'info' not in obj_data:
            obj_data['info'] = {}
        
        info = obj_data['info']
        
        # Add missing distance for stars
        if obj_data.get('type') == 'star' and 'distance' not in info:
            info['distance'] = '0 AU'
        
        # Add missing temp if not present
        if 'temp' not in info:
            if obj_data.get('type') == 'star':
                info['temp'] = '5778 K'
            else:
                info['temp'] = '288 K'
        
        # Ensure distance exists for non-stars
        if 'distance' not in info and obj_data.get('type') != 'star':
            info['distance'] = '1 AU'
        
        return obj_data
    
    async def generate_universe(self, request: UniverseGenerationRequest) -> GeneratedUniverse:
        """Generate a complete universe using Llama API"""
        
        # Build the prompt based on universe type
        prompt = self._build_universe_generation_prompt(request)
        
        try:
            # Call Llama API with system prompt - reduced tokens for faster response
            system_prompt = "You are an expert astronomer and universe designer. Generate scientifically accurate but engaging celestial systems. Always respond with valid JSON only, no other text."
            response_text = await self._call_llama_api(prompt, max_tokens=1500, temperature=0.7, system_prompt=system_prompt)
            
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
                        # Fix common issues
                        fixed_data = self._fix_llama_response(obj_data)
                        
                        # Create the object
                        obj = CelestialObject(**fixed_data)
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
        elif request.universe_type == "star-wars":
            return self._generate_star_wars_system(request)
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
            "texture": "texture_name or null",
            "atmosphereColor": "#hexcolor or null",
            "atmosphereDensity": 0.1 to 0.5 or null,
            "ringSystem": {{
                "innerRadius": 1.3 to 1.8,
                "outerRadius": 2.0 to 3.0,
                "color": "#hexcolor",
                "opacity": 0.3 to 0.9
            }} or null,
            "info": {{
                "distance": "X AU from star",
                "temp": "X K",
                "atmosphere": "composition if applicable",
                "moons": number if applicable,
                "interesting_fact": "An engaging fact about this object"
            }},
            "narrationPrompt": "Key points for AI narrator to discuss as a single string"
        }}
    ]
}}

IMPORTANT: 
- narrationPrompt must be a single string, not an array
- All objects must have info.distance and info.temp
- Stars should have distance "0 AU"
- Use scientifically accurate colors, temperatures, and atmospheres
- For fictional universes, use canonical information from the source material

Guidelines for {request.universe_type}:
"""
        
        if request.universe_type == "solar-system":
            base_prompt += """
- Include our Sun and all 8 planets in correct order
- Use accurate colors: Sun #FDB813, Mercury #8C7853, Venus #FFC649, Earth #4169E1, Mars #CD5C5C, Jupiter #DAA520, Saturn #F4A460, Uranus #4FD0E0, Neptune #4169E1
- Use accurate temperatures: Sun 5778K, Mercury 440K, Venus 737K, Earth 288K, Mars 210K, Jupiter 165K, Saturn 134K, Uranus 76K, Neptune 72K
- Position planets at realistic distances
- Include accurate atmosphere data
"""
        elif request.universe_type == "exoplanet-system":
            base_prompt += """
- Create a star different from our Sun (red dwarf, binary, etc.)
- Include 3-6 exoplanets with varied characteristics
- At least one potentially habitable planet (temperature 250-320K)
- Mix of terrestrial and gas giant planets
- Use realistic exoplanet names (e.g., HD 209458 b, Kepler-452b style)
- Accurate stellar temperatures: M-dwarf (2400-3700K), K-dwarf (3700-5200K), G-dwarf (5200-6000K)
"""
        elif request.universe_type == "star-wars":
            base_prompt += """
- Use EXACT Star Wars canon information:
  - Tatooine: Binary star system (Tatoo I and Tatoo II), desert planet, 304K surface temp, tan/sandy color #F4A460
  - Hoth: Ice planet, 70K surface temp, white/light blue color #E0FFFF
  - Dagobah: Swamp planet, 298K surface temp, dark green color #2F4F2F
  - Coruscant: City planet, 288K surface temp, metallic gray color #708090
  - Endor: Forest moon orbiting gas giant, 290K surface temp, green color #228B22
  - Mustafar: Volcanic planet, 800K surface temp, red/orange color #FF4500
  - Bespin: Gas giant with Cloud City, 120K at altitude, peachy color #FFE4B5
- Include iconic features (Tatooine's twin suns, Death Star if appropriate)
- Use Star Wars naming conventions
"""
        elif request.universe_type == "binary-system":
            base_prompt += """
- Two stars orbiting common center of mass
- Accurate binary star types: contact binary, detached binary, or semi-detached
- Planets in S-type orbits (around one star) or P-type orbits (around both)
- Realistic stellar masses and temperatures for binary pairs
- Complex day/night cycles for planets
"""
        elif request.universe_type == "galaxy-core":
            base_prompt += """
- Supermassive black hole at center (Sagittarius A* style)
- High stellar density near core
- Ancient stellar populations
- Extreme radiation environments
- Possible accretion disk visualization
"""
        
        base_prompt += """
Ensure all positions spread objects appropriately in 3D space.
Make it educational and visually interesting for space exploration.
Use your knowledge to make all parameters as accurate as possible."""
        
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

You help users navigate the current universe they are exploring and answer questions about it.

IMPORTANT: 
- Always respond with ONLY valid JSON
- No markdown formatting, no backticks, no extra text
- Use exact object IDs for navigation
- Be aware of which universe the user is currently in"""
        
        # Extract universe context if provided
        universe_objects = []
        universe_name = "Unknown Universe"
        universe_type = "unknown"
        
        if message.universeContext:
            universe_name = message.universeContext.universeName
            universe_type = message.universeContext.universeType
            universe_objects = [(obj.id, obj.name, obj.type) for obj in message.universeContext.objects]
        else:
            # Fallback to solar system if no context
            universe_objects = [
                ("sun", "Sun", "star"),
                ("mercury", "Mercury", "planet"),
                ("venus", "Venus", "planet"),
                ("earth", "Earth", "planet"),
                ("mars", "Mars", "planet"),
                ("jupiter", "Jupiter", "planet"),
                ("saturn", "Saturn", "planet"),
                ("uranus", "Uranus", "planet"),
                ("neptune", "Neptune", "planet")
            ]
        
        # Build object list for prompt
        object_list = "\n".join([f"- {obj[1]} (ID: {obj[0]}, Type: {obj[2]})" for obj in universe_objects])
        valid_ids = [obj[0] for obj in universe_objects]
        
        # Build the user prompt
        prompt = f"""User's message: "{message.message}"

Current Universe: {universe_name} ({universe_type})
Available objects in this universe:
{object_list}

Valid IDs for navigation: {', '.join(valid_ids)}

Understand the user's intent based on the CURRENT universe context:
- If asking about "most iconic" in Star Wars universe, think Tatooine or Death Star
- If asking about "largest" in solar system, that's Jupiter
- If asking "what's here", list the current universe's objects

For navigation, the targetId must EXACTLY match one of the valid IDs above.

Response format for navigation:
{{"text": "Taking you to [object name]!", "action": {{"type": "navigate", "targetId": "[exact_id]", "duration": 2000}}}}

Response format for universe generation:
{{"text": "Creating [universe name]...", "action": {{"type": "generate_universe", "universe_type": "[universe-type]"}}}}

Response format for questions (no action):
{{"text": "In this {universe_type} universe, [answer about current universe]..."}}"""

        try:
            print(f"🎯 Chat received: {message.message}")
            print(f"🌌 Current universe: {universe_name} with {len(universe_objects)} objects")
            
            # Call Llama API
            response_text = await self._call_llama_api(
                prompt, 
                max_tokens=200, 
                temperature=0.3,  # Lower temperature for more consistent JSON
                system_prompt=system_prompt
            )
            
            print(f"🤖 Llama response: {response_text}")
            
            # Try to parse JSON response
            try:
                # Clean up response
                json_str = response_text.strip()
                
                # Remove markdown formatting
                if json_str.startswith('```json'):
                    json_str = json_str[7:]
                if json_str.startswith('```'):
                    json_str = json_str[3:]
                if json_str.endswith('```'):
                    json_str = json_str[:-3]
                    
                json_str = json_str.replace('```json\n', '').replace('```\n', '')
                json_str = json_str.strip()
                
                print(f"📄 Cleaned JSON: {json_str}")
                
                response_data = json.loads(json_str)
                
                # Validate navigation actions
                if response_data.get('action') and response_data['action'].get('type') == 'navigate':
                    target_id = response_data['action'].get('targetId', '')
                    if target_id not in valid_ids:
                        print(f"⚠️ Invalid navigation target: {target_id}")
                        # Try to find a close match
                        for obj_id, obj_name, _ in universe_objects:
                            if target_id.lower() in obj_name.lower() or obj_name.lower() in target_id.lower():
                                print(f"🔧 Correcting to: {obj_id}")
                                response_data['action']['targetId'] = obj_id
                                break
                        else:
                            response_data['action'] = None
                            response_data['text'] = f"I couldn't find '{target_id}' in {universe_name}. Available objects are: {', '.join([obj[1] for obj in universe_objects])}"
                
                return ChatResponse(**response_data)
                
            except Exception as e:
                print(f"⚠️ Failed to parse JSON response: {e}")
                print(f"Raw response: {response_text}")
                
                # Fallback: try simple keyword matching based on current universe
                msg_lower = message.message.lower()
                
                # Look for navigation intent
                nav_words = ['go', 'take', 'show', 'navigate', 'visit', 'see']
                if any(word in msg_lower for word in nav_words):
                    # Try to match object names
                    for obj_id, obj_name, _ in universe_objects:
                        if obj_name.lower() in msg_lower:
                            print(f"🔧 Fallback navigation to {obj_id}")
                            return ChatResponse(
                                text=f"Let me take you to {obj_name}!",
                                action=NavigationAction(
                                    type="navigate",
                                    targetId=obj_id,
                                    duration=2000
                                )
                            )
                
                # Check for universe-specific queries
                if 'iconic' in msg_lower or 'famous' in msg_lower:
                    if universe_type == 'star-wars':
                        # Find Tatooine or similar
                        for obj_id, obj_name, _ in universe_objects:
                            if 'tatooine' in obj_name.lower():
                                return ChatResponse(
                                    text="Tatooine is the most iconic planet in Star Wars!",
                                    action=NavigationAction(
                                        type="navigate",
                                        targetId=obj_id,
                                        duration=2000
                                    )
                                )
                
                # Default response about current universe
                return ChatResponse(
                    text=f"In {universe_name}, you can explore: {', '.join([obj[1] for obj in universe_objects[:5]])}{'...' if len(universe_objects) > 5 else ''}"
                )
                
        except Exception as e:
            print(f"❌ Error in chat handling: {e}")
            import traceback
            traceback.print_exc()
            
            # Emergency fallback with current universe info
            return ChatResponse(
                text=f"I'm having trouble understanding. You're in {universe_name}. Try asking me to go to one of these: {', '.join([obj[1] for obj in universe_objects[:3]])}"
            )    
    # Keep existing helper methods
    def _generate_example_exoplanet_system(self, request: UniverseGenerationRequest) -> GeneratedUniverse:
        """Generate an example exoplanet system"""
        objects = [
            CelestialObject(
                id="kepler22",  
                name="Kepler-22",
                type="star",
                position=[0, 0, 0],
                size=2.8,
                color="#FFD700",
                info=ObjectInfo(
                    distance="0 AU",
                    temp="5518 K",
                    magnitude="11.7",
                    interesting_fact="Slightly smaller and cooler than our Sun, located 620 light-years away"
                ),
                narrationPrompt="Describe this sun-like star in the constellation Cygnus"
            ),
            CelestialObject(
                id="kepler22b",
                name="Kepler-22b",
                type="planet",
                position=[15, 0, 0],
                size=1.3,
                color="#4682B4",
                info=ObjectInfo(
                    distance="0.85 AU",
                    temp="295 K",
                    atmosphere="Unknown, possibly water vapor",
                    moons=0,
                    interesting_fact="First confirmed exoplanet in the habitable zone of a sun-like star"
                ),
                narrationPrompt="Explain why this super-Earth might harbor life"
            ),
            CelestialObject(
                id="kepler22c",
                name="Kepler-22c",
                type="planet",
                position=[25, 3, -5],
                size=0.8,
                color="#CD853F",
                info=ObjectInfo(
                    distance="1.2 AU",
                    temp="250 K",
                    atmosphere="Thin, mostly CO2",
                    moons=0,
                    interesting_fact="A hypothetical rocky world at the edge of the habitable zone"
                ),
                narrationPrompt="Describe this Mars-like world"
            )
        ]
        
        return GeneratedUniverse(
            id=str(uuid.uuid4()),
            type=request.universe_type,
            name="Kepler-22 System",
            description="A distant exoplanet system with potentially habitable worlds",
            objects=objects,
            generated_at=int(time.time()),
            parameters_used=request.parameters or {}
        )
    
    def _generate_star_wars_system(self, request: UniverseGenerationRequest) -> GeneratedUniverse:
        """Generate a Star Wars themed system"""
        objects = [
            CelestialObject(
                id="tatoo1",
                name="Tatoo I",
                type="star",
                position=[0, 0, 0],
                size=2.5,
                color="#FDB813",
                info=ObjectInfo(
                    distance="0 AU",
                    temp="5200 K",
                    interesting_fact="First sun of the Tatooine binary star system"
                ),
                narrationPrompt="The first of Tatooine's twin suns"
            ),
            CelestialObject(
                id="tatoo2",
                name="Tatoo II",
                type="star",
                position=[8, 0, 0],
                size=2.0,
                color="#FFD700",
                info=ObjectInfo(
                    distance="0.5 AU from Tatoo I",
                    temp="4800 K",
                    interesting_fact="Second sun of the Tatooine binary star system"
                ),
                narrationPrompt="The second of Tatooine's twin suns"
            ),
            CelestialObject(
                id="tatooine",
                name="Tatooine",
                type="planet",
                position=[20, 0, 0],
                size=0.9,
                color="#F4A460",
                info=ObjectInfo(
                    distance="1.2 AU",
                    temp="310 K",
                    atmosphere="Thin, dry",
                    moons=3,
                    interesting_fact="Desert planet, birthplace of Anakin and Luke Skywalker"
                ),
                narrationPrompt="A harsh desert world with twin suns, where heroes are born"
            ),
            CelestialObject(
                id="hoth",
                name="Hoth",
                type="planet",
                position=[35, 5, -10],
                size=1.1,
                color="#E0FFFF",
                info=ObjectInfo(
                    distance="5.2 AU",
                    temp="120 K",
                    atmosphere="Thin",
                    moons=3,
                    interesting_fact="Ice planet that housed the Rebel Alliance base"
                ),
                narrationPrompt="A frozen world of ice and snow"
            ),
            CelestialObject(
                id="dagobah",
                name="Dagobah",
                type="planet",
                position=[30, -8, 5],
                size=0.8,
                color="#228B22",
                info=ObjectInfo(
                    distance="4.5 AU",
                    temp="280 K",
                    atmosphere="Dense, humid",
                    moons=0,
                    interesting_fact="Swamp planet where Yoda lived in exile"
                ),
                narrationPrompt="A mysterious swamp world strong with the Force"
            )
        ]
        
        return GeneratedUniverse(
            id=str(uuid.uuid4()),
            type=request.universe_type,
            name="Star Wars System",
            description="A galaxy far, far away...",
            objects=objects,
            generated_at=int(time.time()),
            parameters_used=request.parameters or {}
        )
    
    def _generate_default_universe(self, request: UniverseGenerationRequest) -> GeneratedUniverse:
        """Generate a default universe when type is not recognized"""
        objects = [
            CelestialObject(
                id="star1",
                name="Unknown Star",
                type="star",
                position=[0, 0, 0],
                size=3,
                color="#FFFF00",
                info=ObjectInfo(
                    distance="0 AU",
                    temp="5778 K",
                    magnitude="-26.74",
                    interesting_fact="A mysterious star in an unknown system"
                ),
                narrationPrompt="A mysterious star in an unknown system"
            ),
            CelestialObject(
                id="planet1",
                name="Unknown Planet",
                type="planet",
                position=[20, 0, 0],
                size=1,
                color="#4169E1",
                info=ObjectInfo(
                    distance="1 AU",
                    temp="288 K",
                    atmosphere="Unknown",
                    moons=0,
                    interesting_fact="A mysterious world orbiting a distant star"
                ),
                narrationPrompt="A mysterious world orbiting a distant star"
            )
        ]
        
        return GeneratedUniverse(
            id=str(uuid.uuid4()),
            type=request.universe_type,
            name="Unknown System",
            description="A procedurally generated star system",
            objects=objects,
            generated_at=int(time.time()),
            parameters_used=request.parameters or {}
        )
    
    async def close(self):
        """Clean up resources"""
        await self.client.aclose()