# Astronoma - AI-Powered Universe Explorer
![App Screenshot](Banner.png)




Explore the cosmos with Llama 4-powered narration and intelligent Chat assistance.
## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Llama 4 API key

### Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd astronoma
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your LLAMA_API_KEY to .env
```

3. Set up the frontend:
```bash
cd ../frontend
npm install
cp .env.example .env
```

### Running the Application

1. Start the backend (from `/backend`):
```bash
uvicorn app.main:socket_app --host localhost --port 3000 --reload
```

2. Start the frontend (from `/frontend` in a new terminal):
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

## Features

- 🌌 3D visualization of the solar system
- 🎙️ AI-generated narration in multiple languages
- 💬 Intelligent chat assistant for navigation
- 🔍 Search functionality for celestial objects
- 🌐 Multilingual support (English, Spanish, French, Hindi)

## Controls

- **Click and drag**: Rotate view
- **Scroll**: Zoom in/out
- **Click planet**: View information
- **Chat**: "Take me to Mars", "What's the largest planet?"

## Tech Stack

- Frontend: React, Three.js, TypeScript, Tailwind CSS
- Backend: FastAPI, Python, Socket.io
- AI: Llama 4 API

## Architecture
![astronoma_diagram](https://github.com/user-attachments/assets/dda70642-e202-444a-ae92-813af8164b13)

## Screenshots

### Speak actions and move through the world
<img width="1507" alt="Screen Shot 2025-06-22 at 12 15 26 PM" src="https://github.com/user-attachments/assets/e4fd8cbe-a43f-4c30-b8f7-89f2b5ff761e" />

### Generate and explore fictional universes 
<img width="1508" alt="Screen Shot 2025-06-22 at 12 15 38 PM" src="https://github.com/user-attachments/assets/1855cf29-eccb-41cf-b3b5-bdf1868a727e" />

### Move around and between universes using our Space Assistant (Voice Mode also available)
<img width="1508" alt="Screen Shot 2025-06-22 at 12 16 59 PM" src="https://github.com/user-attachments/assets/f05e0229-2a78-4138-9281-f18a9801b930" />

### Custom Narration generated for the current view to make every scene interesting
<img width="1505" alt="Screen Shot 2025-06-22 at 12 17 36 PM" src="https://github.com/user-attachments/assets/1a27d7d9-df4c-4a3f-bdcb-6ba8e6f9d2fd" />


## Project Structure

```
astronoma/
├── frontend/          # React frontend
├── backend/           # Python backend
└── README.md         # This file
```

## Troubleshooting

### Backend won't start
- Ensure Python 3.9+ is installed
- Check that all dependencies are installed
- Verify LLAMA_API_KEY is set in .env

### Frontend connection issues
- Ensure backend is running on port 3000
- Check VITE_API_URL in frontend .env

### No narration audio
- Check browser audio permissions
- Ensure browser supports Web Speech API

## License

MIT
