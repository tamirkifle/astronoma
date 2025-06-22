from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import socketio
import json
import os
from dotenv import load_dotenv
import uvicorn

from app.models import (
    UniverseData, NarrationRequest, NarrationResponse,
    ChatMessage, ChatResponse, UniverseGenerationRequest,
    GeneratedUniverse
)
from app.llama_service import LlamaService

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="Astronoma API", version="1.0.0")

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

# Store generated universes in memory for the session (in production, use Redis or similar)
universe_cache = {}

# REST API Endpoints
@app.get("/")
async def root():
    return {"message": "Astronoma API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "astronoma-api"}

@app.get("/universe/{universe_id}")
async def get_universe(universe_id: str):
    """Get universe data by ID"""
    try:
        # Check if it's a generated universe
        if universe_id in universe_cache:
            return universe_cache[universe_id]
        
        # For MVP, only support solar-system from file
        if universe_id == "solar-system":
            with open("data/solar_system.json", "r") as f:
                data = json.load(f)
            return data
            
        raise HTTPException(status_code=404, detail="Universe not found")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Universe data not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/universe/generate")
async def generate_universe(request: UniverseGenerationRequest):
    """Generate a new universe using Llama API"""
    try:
        print(f"Generating universe of type: {request.universe_type}")
        print(f"Request parameters: {request.parameters}")
        
        # Generate the universe
        generated_universe = await llama_service.generate_universe(request)
        
        # Cache the generated universe
        universe_cache[generated_universe.id] = {
            "id": generated_universe.id,
            "type": generated_universe.type,
            "name": generated_universe.name,
            "description": generated_universe.description,
            "objects": [obj.dict() for obj in generated_universe.objects],
            "generated_at": generated_universe.generated_at,
            "parameters_used": generated_universe.parameters_used
        }
        
        return universe_cache[generated_universe.id]
    except Exception as e:
        print(f"Error generating universe: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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

@app.post("/test-post")
async def test_post(data: dict):
    """Test endpoint to verify POST requests work"""
    return {"message": "POST request received", "data": data}

@app.post("/test-narration")
async def test_narration(request: NarrationRequest):
    response = await llama_service.generate_narration(request)
    return response

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
    print("✅ Received chat_message:", data)

    try:
        message = ChatMessage(**data)
        response = await llama_service.handle_chat(message)
        await sio.emit('chat_response', response.dict(), to=sid)
    except Exception as e:
        print("❌ Error processing chat_message:", e)
        await sio.emit('chat_error', {'error': str(e)}, to=sid)

@sio.on('generate_universe')
async def handle_generate_universe(sid, data):
    """Handle universe generation via WebSocket"""
    try:
        print(f"Universe generation request from {sid}: {data}")
        request = UniverseGenerationRequest(**data)
        generated_universe = await llama_service.generate_universe(request)
        
        # Cache it
        universe_data = {
            "id": generated_universe.id,
            "type": generated_universe.type,
            "name": generated_universe.name,
            "description": generated_universe.description,
            "objects": [obj.dict() for obj in generated_universe.objects],
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