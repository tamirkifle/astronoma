import os
import asyncio
import base64
import json
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
import boto3
from concurrent.futures import ThreadPoolExecutor

# Optional imports with fallbacks
try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False
    print("⚠️ SpeechRecognition not available - using fallback methods")

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False
    print("⚠️ pyttsx3 not available - TTS will use browser APIs only")

try:
    import soundfile as sf
    SOUNDFILE_AVAILABLE = True
except ImportError:
    SOUNDFILE_AVAILABLE = False
    print("⚠️ soundfile not available - audio processing limited")

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    print("⚠️ numpy not available - some features may be limited")

from botocore.exceptions import ClientError, NoCredentialsError

class SpeechService:
    def __init__(self):
        self.audio_dir = Path("audio_cache")
        self.audio_dir.mkdir(exist_ok=True)
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Initialize AWS clients if credentials are available
        self.aws_transcribe = None
        self.aws_polly = None
        self.aws_s3 = None
        self._init_aws_clients()
        
        # Language mapping for AWS services
        self.language_codes = {
            'en': 'en-US',
            'es': 'es-ES', 
            'fr': 'fr-FR',
            'hi': 'hi-IN',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-BR',
            'ru': 'ru-RU',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'zh': 'zh-CN'
        }
        
        # Voice settings for different languages
        self.voice_settings = {
            'en': {'rate': 180, 'volume': 0.9, 'voice_id': 'Joanna'},
            'es': {'rate': 170, 'volume': 0.9, 'voice_id': 'Lupe'},
            'fr': {'rate': 175, 'volume': 0.9, 'voice_id': 'Lea'},
            'hi': {'rate': 160, 'volume': 0.9, 'voice_id': 'Aditi'},
            'de': {'rate': 170, 'volume': 0.9, 'voice_id': 'Marlene'},
            'it': {'rate': 175, 'volume': 0.9, 'voice_id': 'Carla'},
            'pt': {'rate': 170, 'volume': 0.9, 'voice_id': 'Camila'},
            'ru': {'rate': 160, 'volume': 0.9, 'voice_id': 'Tatyana'},
            'ja': {'rate': 150, 'volume': 0.9, 'voice_id': 'Mizuki'},
            'ko': {'rate': 150, 'volume': 0.9, 'voice_id': 'Seoyeon'},
            'zh': {'rate': 160, 'volume': 0.9, 'voice_id': 'Zhiyu'}
        }
        
        # Initialize speech recognition if available
        self.recognizer = None
        if SPEECH_RECOGNITION_AVAILABLE:
            try:
                self.recognizer = sr.Recognizer()
            except Exception as e:
                print(f"⚠️ Failed to initialize speech recognition: {e}")
        
    def _init_aws_clients(self):
        """Initialize AWS clients if credentials are available"""
        try:
            # Check if AWS credentials are configured
            session = boto3.Session()
            credentials = session.get_credentials()
            
            if credentials:
                self.aws_transcribe = boto3.client('transcribe')
                self.aws_polly = boto3.client('polly')
                self.aws_s3 = boto3.client('s3')
                print("✅ AWS clients initialized successfully")
            else:
                print("⚠️ AWS credentials not found, using local fallbacks")
                
        except Exception as e:
            print(f"⚠️ AWS initialization failed: {e}, using local fallbacks")
    
    async def transcribe_audio(self, audio_data: bytes, language: str = 'en') -> Optional[str]:
        """
        Transcribe audio to text using AWS Transcribe or local fallback
        """
        try:
            # Try AWS Transcribe first
            if self.aws_transcribe:
                return await self._transcribe_aws(audio_data, language)
            else:
                # Fallback to local speech recognition
                return await self._transcribe_local(audio_data, language)
                
        except Exception as e:
            print(f"❌ Transcription error: {e}")
            return None
    
    async def _transcribe_aws(self, audio_data: bytes, language: str) -> Optional[str]:
        """Transcribe using AWS Transcribe"""
        try:
            # Save audio to temporary file
            temp_file = self.audio_dir / f"temp_transcribe_{hashlib.md5(audio_data).hexdigest()}.wav"
            with open(temp_file, 'wb') as f:
                f.write(audio_data)
            
            # Start transcription job
            job_name = f"transcribe_{hashlib.md5(audio_data).hexdigest()}"
            language_code = self.language_codes.get(language, 'en-US')
            
            self.aws_transcribe.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={'MediaFileUri': f"s3://your-bucket/{temp_file.name}"},  # You'd need S3 setup
                MediaFormat='wav',
                LanguageCode=language_code
            )
            
            # Wait for completion (simplified - in production you'd use async polling)
            # For now, we'll use the local fallback
            return await self._transcribe_local(audio_data, language)
            
        except Exception as e:
            print(f"AWS Transcribe failed: {e}")
            return await self._transcribe_local(audio_data, language)
    
    async def _transcribe_local(self, audio_data: bytes, language: str) -> Optional[str]:
        """Transcribe using local speech recognition"""
        if not SPEECH_RECOGNITION_AVAILABLE or not self.recognizer:
            print("❌ Speech recognition not available")
            return None
            
        try:
            loop = asyncio.get_event_loop()
            
            def transcribe():
                # Convert audio data to AudioData object
                audio = sr.AudioData(audio_data, sample_rate=16000, sample_width=2)
                
                # Use Google Speech Recognition (free tier)
                try:
                    language_code = self.language_codes.get(language, 'en-US')
                    text = self.recognizer.recognize_google(audio, language=language_code)
                    return text
                except sr.UnknownValueError:
                    return None
                except sr.RequestError as e:
                    print(f"Speech recognition service error: {e}")
                    return None
            
            result = await loop.run_in_executor(self.executor, transcribe)
            return result
            
        except Exception as e:
            print(f"Local transcription error: {e}")
            return None
    
    async def synthesize_speech(self, text: str, language: str = 'en', voice_type: str = 'neural') -> Optional[str]:
        """
        Synthesize text to speech using AWS Polly or local fallback
        """
        try:
            # Try AWS Polly first
            if self.aws_polly:
                return await self._synthesize_aws(text, language, voice_type)
            else:
                # Fallback to local TTS
                return await self._synthesize_local(text, language)
                
        except Exception as e:
            print(f"❌ Speech synthesis error: {e}")
            return None
    
    async def _synthesize_aws(self, text: str, language: str, voice_type: str) -> Optional[str]:
        """Synthesize using AWS Polly"""
        try:
            settings = self.voice_settings.get(language, self.voice_settings['en'])
            voice_id = settings['voice_id']
            
            # Use Neural engine if available
            engine = 'neural' if voice_type == 'neural' else 'standard'
            
            response = self.aws_polly.synthesize_speech(
                Text=text,
                VoiceId=voice_id,
                OutputFormat='mp3',
                Engine=engine
            )
            
            # Generate filename and save
            filename = self._generate_filename(text, language)
            file_path = self.audio_dir / filename
            
            with open(file_path, 'wb') as f:
                f.write(response['AudioStream'].read())
            
            return f"/audio/{filename}"
            
        except Exception as e:
            print(f"AWS Polly failed: {e}")
            return await self._synthesize_local(text, language)
    
    async def _synthesize_local(self, text: str, language: str) -> Optional[str]:
        """Synthesize using local pyttsx3"""
        if not PYTTSX3_AVAILABLE:
            print("❌ pyttsx3 not available for local TTS")
            return None
            
        try:
            loop = asyncio.get_event_loop()
            
            def synthesize():
                engine = pyttsx3.init()
                
                # Set voice properties
                settings = self.voice_settings.get(language, self.voice_settings['en'])
                engine.setProperty('rate', settings['rate'])
                engine.setProperty('volume', settings['volume'])
                
                # Try to set language-specific voice
                voices = engine.getProperty('voices')
                if voices:
                    for voice in voices:
                        voice_name = voice.name.lower()
                        voice_id = voice.id.lower()
                        
                        if language == 'es' and ('spanish' in voice_name or 'es' in voice_id):
                            engine.setProperty('voice', voice.id)
                            break
                        elif language == 'fr' and ('french' in voice_name or 'fr' in voice_id):
                            engine.setProperty('voice', voice.id)
                            break
                        elif language == 'hi' and ('hindi' in voice_name or 'hi' in voice_id):
                            engine.setProperty('voice', voice.id)
                            break
                        elif language == 'de' and ('german' in voice_name or 'de' in voice_id):
                            engine.setProperty('voice', voice.id)
                            break
                
                # Generate filename and save
                filename = self._generate_filename(text, language)
                file_path = self.audio_dir / filename
                
                engine.save_to_file(text, str(file_path))
                engine.runAndWait()
                engine.stop()
                
                return f"/audio/{filename}" if file_path.exists() else None
            
            result = await loop.run_in_executor(self.executor, synthesize)
            return result
            
        except Exception as e:
            print(f"Local synthesis error: {e}")
            return None
    
    def _generate_filename(self, text: str, language: str) -> str:
        """Generate unique filename based on text and language"""
        content = f"{text}_{language}"
        hash_obj = hashlib.md5(content.encode())
        return f"{hash_obj.hexdigest()}.wav"
    
    async def detect_language(self, text: str) -> str:
        """
        Detect the language of the input text
        Simple implementation - in production you'd use a proper language detection service
        """
        # Simple language detection based on common words
        text_lower = text.lower()
        
        # Spanish indicators
        spanish_words = ['hola', 'gracias', 'por favor', 'si', 'no', 'que', 'como', 'donde']
        if any(word in text_lower for word in spanish_words):
            return 'es'
        
        # French indicators
        french_words = ['bonjour', 'merci', 's\'il vous plaît', 'oui', 'non', 'que', 'comment', 'où']
        if any(word in text_lower for word in french_words):
            return 'fr'
        
        # Hindi indicators
        hindi_words = ['नमस्ते', 'धन्यवाद', 'कृपया', 'हाँ', 'नहीं', 'क्या', 'कैसे', 'कहाँ']
        if any(word in text_lower for word in hindi_words):
            return 'hi'
        
        # German indicators
        german_words = ['hallo', 'danke', 'bitte', 'ja', 'nein', 'was', 'wie', 'wo']
        if any(word in text_lower for word in german_words):
            return 'de'
        
        # Default to English
        return 'en'
    
    async def process_speech_input(self, audio_data: bytes, detected_language: str = None) -> Dict[str, Any]:
        """
        Process speech input and return transcription with language detection
        """
        try:
            # Transcribe audio
            transcription = await self.transcribe_audio(audio_data, detected_language or 'en')
            
            if not transcription:
                return {
                    'success': False,
                    'error': 'Could not transcribe audio'
                }
            
            # Detect language if not provided
            if not detected_language:
                detected_language = await self.detect_language(transcription)
            
            return {
                'success': True,
                'text': transcription,
                'language': detected_language,
                'confidence': 0.8  # Placeholder - would be provided by actual service
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_available_languages(self) -> List[Dict[str, str]]:
        """Get list of available languages and their codes"""
        return [
            {'code': 'en', 'name': 'English', 'native_name': 'English'},
            {'code': 'es', 'name': 'Spanish', 'native_name': 'Español'},
            {'code': 'fr', 'name': 'French', 'native_name': 'Français'},
            {'code': 'hi', 'name': 'Hindi', 'native_name': 'हिंदी'},
            {'code': 'de', 'name': 'German', 'native_name': 'Deutsch'},
            {'code': 'it', 'name': 'Italian', 'native_name': 'Italiano'},
            {'code': 'pt', 'name': 'Portuguese', 'native_name': 'Português'},
            {'code': 'ru', 'name': 'Russian', 'native_name': 'Русский'},
            {'code': 'ja', 'name': 'Japanese', 'native_name': '日本語'},
            {'code': 'ko', 'name': 'Korean', 'native_name': '한국어'},
            {'code': 'zh', 'name': 'Chinese', 'native_name': '中文'}
        ]
    
    def get_capabilities(self) -> Dict[str, bool]:
        """Get current speech capabilities"""
        return {
            'aws_transcribe': self.aws_transcribe is not None,
            'aws_polly': self.aws_polly is not None,
            'local_speech_recognition': SPEECH_RECOGNITION_AVAILABLE,
            'local_tts': PYTTSX3_AVAILABLE,
            'audio_processing': SOUNDFILE_AVAILABLE,
            'numpy_available': NUMPY_AVAILABLE
        }

# Global instance
speech_service = SpeechService() 