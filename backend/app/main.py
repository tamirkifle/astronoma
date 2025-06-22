from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import socketio
import json
import os
import json
import time
import asyncio
import concurrent.futures
from dotenv import load_dotenv
import uvicorn
from typing import Dict, Any, List
import base64

from app.models import (
    UniverseData, NarrationRequest, NarrationResponse,
    ChatMessage, ChatResponse, UniverseGenerationRequest,
    GeneratedUniverse, SpeechInputRequest, SpeechInputResponse,
    SpeechOutputRequest, SpeechOutputResponse, AvailableLanguagesResponse
)
from app.llama_service import LlamaService
from app.speech_service import speech_service
from app.texture_generator import TextureGenerator  # Added missing import

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="Astronoma API", version="1.0.0")

# Create static directories if they don't exist
from pathlib import Path
static_dir = Path("static/textures")
static_dir.mkdir(parents=True, exist_ok=True)

# Mount static files for textures
app.mount("/textures", StaticFiles(directory="static/textures"), name="textures")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)
socket_app = socketio.ASGIApp(sio, app)

# Initialize services
llama_service = LlamaService(os.getenv("LLAMA_API_KEY", "demo_key"))
ENABLE_TEXTURE_GENERATION = os.getenv("ENABLE_TEXTURE_GENERATION", "true").lower() == "true"

if ENABLE_TEXTURE_GENERATION:
    try:
        texture_generator = TextureGenerator()
        print("✅ Texture generation enabled")
    except Exception as e:
        print(f"⚠️ Failed to initialize texture generator: {e}")
        texture_generator = None
        print("⚠️ Texture generation disabled")
else:
    texture_generator = None
    print("⚠️ Texture generation disabled")

# Store generated universes in memory for the session (in production, use Redis or similar)
universe_cache = {}
texture_cache = {}

# REST API Endpoints
@app.get("/")
async def root():
    return {"message": "Astronoma API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "astronoma-api"}

# Speech-related endpoints
@app.post("/speech/transcribe", response_model=SpeechInputResponse)
async def transcribe_speech(request: SpeechInputRequest):
    """Transcribe speech to text"""
    try:
        # Decode base64 audio data
        audio_data = base64.b64decode(request.audio_data)
        
        # Process speech input
        result = await speech_service.process_speech_input(
            audio_data, 
            request.language
        )
        
        return SpeechInputResponse(**result)
        
    except Exception as e:
        print(f"❌ Speech transcription error: {e}")
        return SpeechInputResponse(
            success=False,
            error=str(e)
        )

@app.post("/speech/synthesize", response_model=SpeechOutputResponse)
async def synthesize_speech(request: SpeechOutputRequest):
    """Synthesize text to speech"""
    try:
        # Generate speech
        audio_url = await speech_service.synthesize_speech(
            request.text,
            request.language,
            request.voice_type
        )
        
        if audio_url:
            return SpeechOutputResponse(
                success=True,
                audio_url=audio_url
            )
        else:
            return SpeechOutputResponse(
                success=False,
                error="Failed to synthesize speech"
            )
            
    except Exception as e:
        print(f"❌ Speech synthesis error: {e}")
        return SpeechOutputResponse(
            success=False,
            error=str(e)
        )

@app.get("/speech/languages", response_model=AvailableLanguagesResponse)
async def get_available_languages():
    """Get list of available languages for speech processing"""
    try:
        languages = await speech_service.get_available_languages()
        return AvailableLanguagesResponse(languages=languages)
    except Exception as e:
        print(f"❌ Error getting languages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/universe/{universe_id}")
async def get_universe(universe_id: str):
    """Get universe data by ID - returns immediately, textures load async"""
    try:
        # Check if it's a generated universe
        if universe_id in universe_cache:
            universe_data = universe_cache[universe_id]
        # For MVP, only support solar-system from file
        elif universe_id == "solar-system":
            with open("data/solar_system.json", "r") as f:
                universe_data = json.load(f)
        else:
            raise HTTPException(status_code=404, detail="Universe not found")
        
        # Return universe data immediately without textures
        # Textures will be loaded separately via the texture endpoint
        return universe_data
            
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Universe data not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/universe/generate")
async def generate_universe(request: UniverseGenerationRequest):
    """Generate a new universe using Llama API with auto-generated textures"""
    try:
        print(f"Generating universe of type: {request.universe_type}")
        print(f"Request parameters: {request.parameters}")
        
        # Generate the universe
        generated_universe = await llama_service.generate_universe(request)
        
        # Generate textures for each object (if texture generator is available)
        if texture_generator:
            for obj in generated_universe.objects:
                try:
                    # Determine planet type based on properties
                    planet_type = "star" if obj.type == "star" else \
                                "gas" if obj.info.atmosphere and "Hydrogen" in obj.info.atmosphere else \
                                "ice" if obj.info.temp and int(obj.info.temp.replace("K", "").strip()) < 200 else \
                                "terrestrial" if obj.info.atmosphere and "Oxygen" in obj.info.atmosphere else "rocky"
                    
                    # Get temperature
                    temp = None
                    if obj.info.temp:
                        try:
                            temp = int(obj.info.temp.replace("K", "").replace(",", "").strip())
                        except:
                            pass
                    
                    # Generate texture
                    texture_data = texture_generator.generate_texture(
                        planet_type=planet_type,
                        base_color=obj.color,
                        name=obj.name,
                        temperature=temp
                    )
                    
                    # Cache it
                    texture_cache[obj.id] = texture_data
                except Exception as tex_error:
                    print(f"⚠️ Failed to generate texture for {obj.name}: {tex_error}")
        
        # Cache the generated universe
        universe_dict = {
            "id": generated_universe.id,
            "type": generated_universe.type,
            "name": generated_universe.name,
            "description": generated_universe.description,
            "objects": [
                {
                    **obj.dict(),
                    "generatedTextures": texture_cache.get(obj.id)
                } for obj in generated_universe.objects
            ],
            "generated_at": generated_universe.generated_at,
            "parameters_used": generated_universe.parameters_used
        }
        universe_cache[generated_universe.id] = universe_dict
        
        return universe_dict
    except Exception as e:
        print(f"Error generating universe: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/texture/generate-batch")
async def generate_textures_batch(objects: List[Dict[str, Any]]):
    """Generate textures for multiple objects in batch"""
    results = {}
    
    if not texture_generator:
        print("⚠️ Texture generator not available")
        for obj in objects:
            results[obj["id"]] = {"error": "Texture generation not available"}
        return results
    
    for obj in objects:
        try:
            obj_id = obj["id"]
            
            # Check cache first
            if obj_id in texture_cache:
                results[obj_id] = texture_cache[obj_id]
                continue
            
            # Get temperature if available
            temp = None
            if "temp" in obj.get("info", {}):
                try:
                    temp = int(obj["info"]["temp"].replace("K", "").replace(",", "").strip())
                except:
                    pass
            
            # Determine planet type based on properties and name
            planet_type = "star" if obj["type"] == "star" else \
                        "gas" if obj.get("name") in ["Jupiter", "Saturn", "Uranus", "Neptune", "Bespin"] else \
                        "ice" if obj.get("name") in ["Uranus", "Neptune", "Hoth"] or (temp and temp < 150) else \
                        "terrestrial" if obj.get("name") in ["Earth", "Endor", "Coruscant"] else \
                        "rocky" if temp and temp > 600 else "rocky"  # Volcanic planets like Mustafar
            
            # Generate texture
            texture_data = texture_generator.generate_texture(
                planet_type=planet_type,
                base_color=obj["color"],
                name=obj["name"],
                temperature=temp
            )
            
            # Generate ring texture if needed
            if obj.get("ringSystem"):
                ring_texture = texture_generator.generate_ring_texture(
                    obj["ringSystem"]["color"],
                    obj["ringSystem"]["opacity"]
                )
                texture_data["ringTexture"] = ring_texture["ring"]
            
            texture_cache[obj_id] = texture_data
            results[obj_id] = texture_data
            
        except Exception as e:
            print(f"Error generating texture for {obj.get('name', 'unknown')}: {e}")
            results[obj_id] = {"error": str(e)}
    
    return results

@app.get("/universe/templates")
async def get_universe_templates():
    """Get available universe generation templates"""
    return {
        "templates": [
            {
                "id": "solar-system",
                "name": "Our Solar System",
                "description": "Accurate representation of our solar system with all 8 planets",
                "preview_image": "/images/solar-system.jpg"
            },
            {
                "id": "exoplanet-system",
                "name": "Exoplanet System",
                "description": "Explore distant star systems with potentially habitable worlds",
                "preview_image": "/images/exoplanet.jpg"
            },
            {
                "id": "binary-system",
                "name": "Binary Star System",
                "description": "A system with two stars and unique planetary orbits",
                "preview_image": "/images/binary.jpg"
            },
            {
                "id": "galaxy-core",
                "name": "Galaxy Core",
                "description": "Journey to the center of a galaxy with supermassive black holes",
                "preview_image": "/images/galaxy.jpg"
            },
            {
                "id": "fictional",
                "name": "Fictional Universe",
                "description": "Create fantastical space environments limited only by imagination",
                "preview_image": "/images/fictional.jpg"
            }
        ]
    }

@app.post("/test-narration")
async def test_narration(request: NarrationRequest):
    response = await llama_service.generate_narration(request)
    return response

@app.get("/test-llama")
async def test_llama():
    """Test endpoint to verify Llama API is working"""
    try:
        # Try different test prompts
        test_prompts = [
            "What is 2+2? Answer with just the number.",
            "Complete this sentence: The capital of France is",
            "Say 'Hello World'"
        ]
        
        results = []
        for test_prompt in test_prompts:
            try:
                system_prompt = "You are a helpful assistant. Answer concisely."
                response = await llama_service._call_llama_api(test_prompt, max_tokens=50, system_prompt=system_prompt)
                results.append({
                    "prompt": test_prompt,
                    "response": response,
                    "success": bool(response)
                })
            except Exception as e:
                results.append({
                    "prompt": test_prompt,
                    "response": None,
                    "error": str(e)
                })
        
        return {
            "status": "success",
            "model": "Llama-4-Maverick-17B-128E-Instruct-FP8",
            "results": results
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
    
@app.post("/planet/generate-texture")
async def generate_planet_texture(planet_id: str, description: str):
    """
    Generate a texture image for a planet using Llama 4 API.
    """
    if not texture_generator:
        raise HTTPException(status_code=503, detail="Texture generation not available")
    
    # This would need to be implemented in texture_generator
    # For now, return an error
    raise HTTPException(status_code=501, detail="Planet texture generation not implemented")

@app.get("/debug/check-env")
async def check_environment():
    """Debug endpoint to check environment setup"""
    api_key = os.getenv("LLAMA_API_KEY", "")
    return {
        "has_api_key": bool(api_key),
        "api_key_length": len(api_key),
        "api_key_preview": f"{api_key[:10]}..." if api_key else "NOT SET",
        "env_vars": list(os.environ.keys()),
        "texture_generator_available": texture_generator is not None
    }

@app.post("/chat", response_model=ChatResponse)
async def send_chat_message(request: ChatMessage):
    """Send a chat message and get AI response"""
    try:
        print(f"💬 Chat message received: {request.message}")
        
        # Call the llama service
        response = await llama_service.handle_chat(request)
        
        return response
    except Exception as e:
        print(f"❌ Chat error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Socket.IO Event Handlers
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await sio.emit('connection_established', {'message': 'Welcome to Astronoma!'}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def request_narration(sid, data):
    """Handle narration requests"""
    try:
        print(f"Narration request from {sid}: {data}")
        request = NarrationRequest(**data)
        response = await llama_service.generate_narration(request)
        await sio.emit('narration_response', response.dict(), to=sid)
    except Exception as e:
        print(f"Error in narration: {e}")
        await sio.emit('narration_error', {'error': str(e)}, to=sid)

@sio.on('chat_message')
async def handle_chat_message(sid, data):
    """Handle chat messages - sid is automatically passed by socketio"""
    print("✅ Received chat_message from", sid)
    print("📦 Chat data:", data)

    try:
        # Parse the chat message
        message = ChatMessage(**data)
        
        # Call the llama service (it only needs the message, not the sid)
        response = await llama_service.handle_chat(message)
        
        # Send response back to the client
        await sio.emit('chat_response', response.dict(), to=sid)
    except Exception as e:
        print("❌ Error processing chat_message:", e)
        import traceback
        traceback.print_exc()
        await sio.emit('chat_error', {'error': str(e)}, to=sid)

@sio.on('speech_input')
async def handle_speech_input(sid, data):
    """Handle speech input via WebSocket"""
    try:
        print(f"🎤 Speech input from {sid}")
        
        # Decode base64 audio data
        audio_data = base64.b64decode(data['audio_data'])
        language = data.get('language', 'en')
        
        # Process speech input
        result = await speech_service.process_speech_input(audio_data, language)
        
        await sio.emit('speech_input_response', result, to=sid)
        
    except Exception as e:
        print(f"❌ Speech input error: {e}")
        await sio.emit('speech_input_error', {'error': str(e)}, to=sid)

@sio.on('speech_output')
async def handle_speech_output(sid, data):
    """Handle speech output request via WebSocket"""
    try:
        print(f"🔊 Speech output request from {sid}")
        
        text = data['text']
        language = data.get('language', 'en')
        voice_type = data.get('voice_type', 'neural')
        
        # Generate speech
        audio_url = await speech_service.synthesize_speech(text, language, voice_type)
        
        if audio_url:
            await sio.emit('speech_output_response', {
                'success': True,
                'audio_url': audio_url
            }, to=sid)
        else:
            await sio.emit('speech_output_error', {
                'error': 'Failed to synthesize speech'
            }, to=sid)
            
    except Exception as e:
        print(f"❌ Speech output error: {e}")
        await sio.emit('speech_output_error', {'error': str(e)}, to=sid)

@sio.on('generate_universe')
async def handle_generate_universe(sid, data):
    """Handle universe generation via WebSocket"""
    try:
        print(f"Universe generation request from {sid}: {data}")
        request = UniverseGenerationRequest(**data)
        generated_universe = await llama_service.generate_universe(request)
        
        # Generate textures for each object (if available)
        objects_with_textures = []
        for obj in generated_universe.objects:
            obj_dict = obj.dict()
            
            if texture_generator:
                try:
                    # Determine planet type
                    planet_type = "star" if obj.type == "star" else \
                                "gas" if obj.info.atmosphere and "Hydrogen" in obj.info.atmosphere else \
                                "ice" if obj.info.temp and int(obj.info.temp.replace("K", "").strip()) < 200 else \
                                "terrestrial" if obj.info.atmosphere and "Oxygen" in obj.info.atmosphere else "rocky"
                    
                    # Generate texture
                    texture_data = texture_generator.generate_texture(
                        planet_type=planet_type,
                        base_color=obj.color,
                        name=obj.name,
                        temperature=int(obj.info.temp.replace("K", "").strip()) if obj.info.temp else None
                    )
                    
                    obj_dict["generatedTextures"] = texture_data
                except Exception as tex_error:
                    print(f"⚠️ Failed to generate texture for {obj.name}: {tex_error}")
            
            objects_with_textures.append(obj_dict)
        
        # Cache it
        universe_data = {
            "id": generated_universe.id,
            "type": generated_universe.type,
            "name": generated_universe.name,
            "description": generated_universe.description,
            "objects": objects_with_textures,
            "generated_at": generated_universe.generated_at,
            "parameters_used": generated_universe.parameters_used
        }
        universe_cache[generated_universe.id] = universe_data
        
        await sio.emit('universe_generated', universe_data, to=sid)
    except Exception as e:
        print(f"Error in universe generation: {e}")
        await sio.emit('universe_generation_error', {'error': str(e)}, to=sid)

# Run the server
if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(socket_app, host="0.0.0.0", port=port, log_level="info")