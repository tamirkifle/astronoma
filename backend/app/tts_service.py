import os
import hashlib
import base64
from pathlib import Path
from typing import Optional
import pyttsx3
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor

class TTSService:
    def __init__(self):
        self.audio_dir = Path("audio_cache")
        self.audio_dir.mkdir(exist_ok=True)
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        # Voice settings for different languages
        self.voice_settings = {
            'en': {'rate': 180, 'volume': 0.9},
            'es': {'rate': 170, 'volume': 0.9},
            'fr': {'rate': 175, 'volume': 0.9},
            'hi': {'rate': 160, 'volume': 0.9}
        }
    
    def _generate_filename(self, text: str, language: str) -> str:
        """Generate unique filename based on text and language"""
        content = f"{text}_{language}"
        hash_obj = hashlib.md5(content.encode())
        return f"{hash_obj.hexdigest()}.wav"
    
    def _synthesize_speech(self, text: str, language: str, output_path: str) -> bool:
        """Synchronous TTS synthesis using pyttsx3"""
        try:
            engine = pyttsx3.init()
            
            # Set voice properties
            settings = self.voice_settings.get(language, self.voice_settings['en'])
            engine.setProperty('rate', settings['rate'])
            engine.setProperty('volume', settings['volume'])
            
            # Try to set language-specific voice
            voices = engine.getProperty('voices')
            if voices:
                for voice in voices:
                    if language == 'es' and ('spanish' in voice.name.lower() or 'es' in voice.id.lower()):
                        engine.setProperty('voice', voice.id)
                        break
                    elif language == 'fr' and ('french' in voice.name.lower() or 'fr' in voice.id.lower()):
                        engine.setProperty('voice', voice.id)
                        break
                    elif language == 'hi' and ('hindi' in voice.name.lower() or 'hi' in voice.id.lower()):
                        engine.setProperty('voice', voice.id)
                        break
            
            # Save to file
            engine.save_to_file(text, output_path)
            engine.runAndWait()
            engine.stop()
            
            return os.path.exists(output_path)
            
        except Exception as e:
            print(f"TTS Error: {e}")
            return False
    
    async def generate_speech(self, text: str, language: str = 'en') -> Optional[str]:
        """Generate speech audio file"""
        try:
            filename = self._generate_filename(text, language)
            file_path = self.audio_dir / filename
            
            # Return existing file if already cached
            if file_path.exists():
                return f"/audio/{filename}"
            
            # Generate new audio file
            loop = asyncio.get_event_loop()
            success = await loop.run_in_executor(
                self.executor, 
                self._synthesize_speech, 
                text, 
                language, 
                str(file_path)
            )
            
            if success:
                return f"/audio/{filename}"
            else:
                return None
                
        except Exception as e:
            print(f"TTS Generation Error: {e}")
            return None
    
    async def generate_speech_base64(self, text: str, language: str = 'en') -> Optional[str]:
        """Generate speech and return as base64 encoded string"""
        try:
            filename = self._generate_filename(text, language)
            file_path = self.audio_dir / filename
            
            # Generate if not exists
            if not file_path.exists():
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    self.executor, 
                    self._synthesize_speech, 
                    text, 
                    language, 
                    str(file_path)
                )
            
            # Read and encode as base64
            if file_path.exists():
                with open(file_path, 'rb') as audio_file:
                    audio_data = audio_file.read()
                    return base64.b64encode(audio_data).decode('utf-8')
            
            return None
            
        except Exception as e:
            print(f"TTS Base64 Error: {e}")
            return None