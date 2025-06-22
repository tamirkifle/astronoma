# test_tts.py - Simple TTS test script
import asyncio
import sys
import os
from pathlib import Path

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

try:
    from app.tts_service import TTSService
    print("✅ TTS Service imported successfully")
except ImportError as e:
    print(f"❌ Failed to import TTS Service: {e}")
    print("Make sure you're running this from the backend directory")
    exit(1)

async def test_tts():
    print("\n🎵 Testing Text-to-Speech Service...")
    
    # Initialize TTS service
    tts = TTSService()
    print("✅ TTS Service initialized")
    
    # Test text
    test_text = "Hello! This is a test of the text-to-speech system for Astronoma."
    
    print(f"\n📝 Testing with text: '{test_text}'")
    
    # Generate speech
    print("🔄 Generating speech...")
    audio_url = await tts.generate_speech(test_text, 'en')
    
    if audio_url:
        print(f"✅ TTS generation successful!")
        print(f"🎵 Audio file URL: {audio_url}")
        
        # Check if file actually exists
        file_path = Path("audio_cache") / audio_url.split('/')[-1]
        if file_path.exists():
            print(f"✅ Audio file exists at: {file_path}")
            print(f"📊 File size: {file_path.stat().st_size} bytes")
        else:
            print(f"❌ Audio file not found at: {file_path}")
    else:
        print("❌ TTS generation failed")
    
    print("\n🧪 Test completed!")

if __name__ == "__main__":
    asyncio.run(test_tts())