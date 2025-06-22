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
    ChatMessage, ChatResponse
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
        # For MVP, only support solar-system
        if universe_id != "solar-system":
            raise HTTPException(status_code=404, detail="Universe not found")
            
        with open("data/solar_system.json", "r") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Universe data not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




####TEST
from fastapi import Body

@app.post("/test-narration")
async def test_narration(request: NarrationRequest = Body(...)):
    response = await llama_service.generate_narration(request)
    return response

####TEST





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

# Run the server
if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(socket_app, host="0.0.0.0", port=port, log_level="info")
