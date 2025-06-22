# Astronoma - AI-Powered Universe Explorer
![App Screenshot](Banner.png)

Explore the cosmos with Llama 4-powered narration and intelligent Chat assistance with **multilingual speech capabilities**.

## 🌟 New Features

### 🎤 Voice-Enabled Chat
- **Speech-to-Text**: Talk to your space assistant naturally
- **Text-to-Speech**: Hear responses in multiple languages
- **Multilingual Support**: 11+ languages including English, Spanish, French, Hindi, German, Italian, Portuguese, Russian, Japanese, Korean, and Chinese
- **AWS Integration**: Enhanced speech quality with Amazon Transcribe and Polly
- **Local Fallbacks**: Works offline with browser-native speech APIs

### 🌍 Multilingual Experience
- **Voice Commands**: "Take me to Mars" / "Llévame a Marte" / "Emmène-moi sur Mars"
- **Natural Conversations**: Ask questions in your preferred language
- **Automatic Language Detection**: System detects your language automatically
- **Native Voice Accents**: Authentic pronunciation for each language

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Llama 4 API key
- **Optional**: AWS account for enhanced speech services

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
# Optional: Add AWS credentials for enhanced speech
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
python app/main.py
```

2. Start the frontend (from `/frontend` in a new terminal):
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

## Features

- 🌌 3D visualization of the solar system
- 🎙️ AI-generated narration in multiple languages
- 💬 **Intelligent chat assistant with voice interaction**
- 🎤 **Speech-to-text for natural voice commands**
- 🔊 **Text-to-speech for spoken responses**
- 🌍 **Multilingual support (11+ languages)**
- 🔍 Search functionality for celestial objects
- 🚀 **AWS-powered speech services (optional)**

## Voice Commands

### Basic Navigation
- **English**: "Take me to Mars", "Show me the largest planet"
- **Spanish**: "Llévame a Marte", "Muéstrame el planeta más grande"
- **French**: "Emmène-moi sur Mars", "Montre-moi la plus grande planète"
- **Hindi**: "मुझे मंगल ग्रह पर ले चलो", "सबसे बड़ा ग्रह दिखाओ"

### Information Queries
- **English**: "What's the temperature on Venus?", "Tell me about this planet"
- **Spanish**: "¿Cuál es la temperatura en Venus?", "Háblame de este planeta"
- **French**: "Quelle est la température sur Vénus?", "Parle-moi de cette planète"
- **Hindi**: "शुक्र ग्रह का तापमान क्या है?", "इस ग्रह के बारे में बताओ"

## Controls

- **Click and drag**: Rotate view
- **Scroll**: Zoom in/out
- **Click planet**: View information
- **Chat**: Type or speak your questions
- **🎤 Microphone**: Click to start voice input
- **🌍 Language**: Select your preferred language

## Tech Stack

- Frontend: React, Three.js, TypeScript, Tailwind CSS
- Backend: FastAPI, Python, Socket.io
- AI: Llama 4 API
- **Speech**: Web Speech API, AWS Transcribe/Polly, pyttsx3
- **Audio**: SpeechRecognition, soundfile, librosa

## Project Structure

```
astronoma/
├── frontend/          # React frontend with speech UI
├── backend/           # Python backend with speech services
├── SPEECH_FEATURES.md # Detailed speech documentation
└── README.md         # This file
```

## Speech Setup (Optional)

For enhanced speech quality, configure AWS services:

1. **Create AWS Account** and get access keys
2. **Add credentials** to `backend/.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```
3. **Grant permissions** for Amazon Transcribe and Polly

**Note**: Speech features work without AWS using browser-native APIs.

## Troubleshooting

### Backend won't start
- Ensure Python 3.9+ is installed
- Check that all dependencies are installed
- Verify LLAMA_API_KEY is set in .env

### Frontend connection issues
- Ensure backend is running on port 3000
- Check VITE_API_URL in frontend .env

### Speech features not working
- **Check browser permissions** for microphone access
- **Use Chrome/Edge** for best speech recognition
- **Verify HTTPS** (required for microphone)
- **Check console logs** for detailed errors

### No narration audio
- Check browser audio permissions
- Ensure browser supports Web Speech API
- **Try different languages** if one doesn't work

## Browser Compatibility

### Speech Recognition
- ✅ Chrome/Chromium (recommended)
- ✅ Edge
- ✅ Safari (limited)
- ❌ Firefox (not supported)

### Speech Synthesis
- ✅ All modern browsers
- ✅ Mobile browsers

## Cost Considerations

### Free Features
- Browser-native speech APIs
- Local text-to-speech
- Basic speech recognition

### Optional AWS Services
- **Amazon Transcribe**: $0.024/minute
- **Amazon Polly**: $4.00/1M characters
- **S3 Storage**: $0.023/GB/month

## License

MIT
