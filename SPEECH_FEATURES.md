# Speech Features for Astronoma

This document describes the speech-to-text and text-to-speech capabilities added to the Astronoma project, enabling multilingual voice interaction with the space exploration interface.

## Features Overview

### 🎤 Speech Input (Speech-to-Text)
- **Real-time voice recognition** using Web Speech API
- **Multilingual support** for 11+ languages
- **AWS Transcribe integration** for enhanced accuracy
- **Local fallback** using Google Speech Recognition
- **Automatic language detection** from speech content

### 🔊 Speech Output (Text-to-Speech)
- **High-quality speech synthesis** using AWS Polly
- **Neural voice support** for natural-sounding speech
- **Local fallback** using pyttsx3
- **Multilingual voice support** with native accents
- **Auto-speak assistant responses**

### 🌍 Multilingual Support
- **English** (en) - Default language
- **Spanish** (es) - Español
- **French** (fr) - Français
- **Hindi** (hi) - हिंदी
- **German** (de) - Deutsch
- **Italian** (it) - Italiano
- **Portuguese** (pt) - Português
- **Russian** (ru) - Русский
- **Japanese** (ja) - 日本語
- **Korean** (ko) - 한국어
- **Chinese** (zh) - 中文

## Setup Instructions

### 1. Backend Dependencies

Install the required Python packages:

```bash
cd backend
pip install -r requirements.txt
```

The new dependencies include:
- `boto3` - AWS SDK for Python
- `SpeechRecognition` - Speech recognition library
- `pyaudio` - Audio processing
- `pyttsx3` - Text-to-speech
- `soundfile` - Audio file handling
- `librosa` - Audio analysis
- `numpy` & `scipy` - Scientific computing

### 2. AWS Configuration (Optional but Recommended)

For enhanced speech services, configure AWS credentials:

1. **Create AWS Account** (if you don't have one)
2. **Create IAM User** with permissions for:
   - Amazon Transcribe
   - Amazon Polly
   - Amazon S3 (for audio storage)
3. **Get Access Keys** and add to `.env`:

```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-audio-bucket-name
```

### 3. Environment Configuration

Copy and configure the environment file:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials:

```env
LLAMA_API_KEY=your_llama_api_key_here

# AWS Configuration (optional)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-audio-bucket-name

# Speech Service Configuration
SPEECH_ENABLE_AWS=true
SPEECH_FALLBACK_TO_LOCAL=true
SPEECH_DEFAULT_LANGUAGE=en
```

### 4. Frontend Setup

The frontend automatically detects speech capabilities. No additional setup required for basic functionality.

## Usage Guide

### Voice Commands

Users can now interact with the chat using voice commands:

#### Basic Navigation
- "Take me to Mars"
- "Show me the largest planet"
- "Navigate to the sun"
- "What's the temperature on Venus?"

#### Information Queries
- "Tell me about this planet"
- "What's special about this universe?"
- "How many moons does Jupiter have?"
- "What's the distance to Earth?"

#### Multilingual Examples

**Spanish:**
- "Llévame a Marte"
- "¿Cuál es el planeta más grande?"
- "Muéstrame información sobre la Tierra"

**French:**
- "Emmène-moi sur Mars"
- "Quelle est la température sur Vénus?"
- "Parle-moi de cette planète"

**Hindi:**
- "मुझे मंगल ग्रह पर ले चलो"
- "सबसे बड़ा ग्रह कौन सा है?"
- "पृथ्वी के बारे में बताओ"

### Chat Interface Features

#### Speech Input
1. **Click the microphone button** in the chat interface
2. **Speak your message** clearly
3. **The system will automatically** transcribe and send your message
4. **Visual feedback** shows when listening

#### Speech Output
1. **Enable "Auto-speak"** in chat settings
2. **Assistant responses** will be spoken automatically
3. **Language selection** determines voice accent
4. **Stop speaking** button to interrupt audio

#### Language Selection
1. **Choose language** from the dropdown in chat header
2. **Speech recognition** adapts to selected language
3. **Text-to-speech** uses appropriate voice
4. **Automatic detection** from speech content

## Technical Architecture

### Backend Services

#### Speech Service (`backend/app/speech_service.py`)
- **AWS Integration**: Transcribe and Polly for high-quality speech processing
- **Local Fallbacks**: Google Speech Recognition and pyttsx3
- **Language Detection**: Simple keyword-based detection
- **Audio Processing**: Base64 encoding/decoding for API communication

#### API Endpoints
- `POST /speech/transcribe` - Convert speech to text
- `POST /speech/synthesize` - Convert text to speech
- `GET /speech/languages` - Get available languages

#### WebSocket Events
- `speech_input` - Real-time speech transcription
- `speech_output` - Real-time speech synthesis

### Frontend Services

#### Speech Service (`frontend/src/services/speech.ts`)
- **Web Speech API**: Browser-native speech recognition
- **Backend Integration**: REST API calls for enhanced processing
- **Capability Detection**: Automatic feature detection
- **Error Handling**: Graceful fallbacks

#### Enhanced Chat Interface
- **Voice Controls**: Microphone button and visual feedback
- **Language Selection**: Dropdown for language choice
- **Auto-speak**: Toggle for automatic speech output
- **Status Indicators**: Visual feedback for speech states

## Browser Compatibility

### Speech Recognition
- ✅ Chrome/Chromium (recommended)
- ✅ Edge
- ✅ Safari (limited support)
- ❌ Firefox (not supported)

### Speech Synthesis
- ✅ All modern browsers
- ✅ Mobile browsers

### Fallback Strategy
1. **Web Speech API** (browser-native)
2. **AWS Services** (if configured)
3. **Local Processing** (pyttsx3)

## Performance Considerations

### Audio Quality
- **Sample Rate**: 16kHz (optimal for speech)
- **Format**: WAV/MP3
- **Compression**: Automatic optimization

### Latency
- **Local Processing**: ~100-500ms
- **AWS Services**: ~1-3 seconds
- **Web Speech API**: ~200-1000ms

### Caching
- **Audio Files**: Cached in `audio_cache/` directory
- **Transcriptions**: Not cached (privacy)
- **Language Models**: Browser-cached

## Troubleshooting

### Common Issues

#### Speech Recognition Not Working
1. **Check browser permissions** for microphone access
2. **Verify HTTPS** (required for microphone access)
3. **Test with Chrome** (best compatibility)
4. **Check console errors** for detailed issues

#### AWS Services Not Working
1. **Verify credentials** in `.env` file
2. **Check IAM permissions** for Transcribe/Polly
3. **Confirm region** settings
4. **Review AWS billing** (services are pay-per-use)

#### Audio Playback Issues
1. **Check browser audio** permissions
2. **Verify audio files** are generated
3. **Test with different** voice types
4. **Check network** connectivity

### Debug Commands

#### Backend Testing
```bash
# Test speech service
python -c "from app.speech_service import speech_service; import asyncio; print(asyncio.run(speech_service.get_available_languages()))"

# Test AWS connection
python -c "import boto3; print(boto3.client('transcribe').list_transcription_jobs(MaxResults=1))"
```

#### Frontend Testing
```javascript
// Check speech capabilities
console.log(speechService.getCapabilities());

// Test speech recognition
speechService.startListening('en', console.log, console.error);
```

## Cost Considerations

### AWS Services (Optional)
- **Amazon Transcribe**: $0.024 per minute
- **Amazon Polly**: $4.00 per 1 million characters
- **S3 Storage**: $0.023 per GB/month

### Local Processing (Free)
- **Google Speech Recognition**: Free tier available
- **pyttsx3**: Completely free
- **Web Speech API**: Browser-native, no cost

## Future Enhancements

### Planned Features
- **Real-time translation** between languages
- **Voice command shortcuts** for navigation
- **Custom voice training** for better recognition
- **Emotion detection** in speech
- **Accent adaptation** for better accuracy

### Integration Opportunities
- **NVIDIA GPU acceleration** for speech processing
- **Advanced language models** for better understanding
- **Voice biometrics** for user identification
- **Conversation memory** across sessions

## Support

For issues or questions about speech features:

1. **Check browser compatibility** first
2. **Review console logs** for error messages
3. **Test with different languages** to isolate issues
4. **Verify AWS configuration** if using cloud services
5. **Check network connectivity** for API calls

The speech features are designed to gracefully degrade when services are unavailable, ensuring the core chat functionality remains operational. 