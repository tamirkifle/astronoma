#!/usr/bin/env python3
"""
Test script for speech services in Astronoma
Run this to verify speech functionality is working
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the app directory to the path
sys.path.append(str(Path(__file__).parent / "app"))

from speech_service import speech_service

async def test_speech_services():
    """Test all speech service functionality"""
    print("🎤 Testing Astronoma Speech Services")
    print("=" * 50)
    
    # Test 1: Check available languages
    print("\n1. Testing available languages...")
    try:
        languages = await speech_service.get_available_languages()
        print(f"✅ Found {len(languages)} supported languages:")
        for lang in languages[:5]:  # Show first 5
            print(f"   - {lang['native_name']} ({lang['code']})")
        if len(languages) > 5:
            print(f"   ... and {len(languages) - 5} more")
    except Exception as e:
        print(f"❌ Error getting languages: {e}")
    
    # Test 2: Test language detection
    print("\n2. Testing language detection...")
    test_texts = [
        ("Hello, how are you?", "en"),
        ("Hola, ¿cómo estás?", "es"),
        ("Bonjour, comment allez-vous?", "fr"),
        ("नमस्ते, कैसे हो आप?", "hi"),
        ("Hallo, wie geht es dir?", "de")
    ]
    
    for text, expected in test_texts:
        try:
            detected = await speech_service.detect_language(text)
            status = "✅" if detected == expected else "⚠️"
            print(f"   {status} '{text[:20]}...' -> {detected} (expected: {expected})")
        except Exception as e:
            print(f"   ❌ Error detecting language for '{text[:20]}...': {e}")
    
    # Test 3: Test speech synthesis
    print("\n3. Testing speech synthesis...")
    test_synthesis = [
        ("Hello from Astronoma!", "en"),
        ("¡Hola desde Astronoma!", "es"),
        ("Bonjour depuis Astronoma!", "fr")
    ]
    
    for text, lang in test_synthesis:
        try:
            audio_url = await speech_service.synthesize_speech(text, lang)
            if audio_url:
                print(f"   ✅ Synthesized '{text}' in {lang}: {audio_url}")
            else:
                print(f"   ❌ Failed to synthesize '{text}' in {lang}")
        except Exception as e:
            print(f"   ❌ Error synthesizing '{text}' in {lang}: {e}")
    
    # Test 4: Check AWS status
    print("\n4. Checking AWS integration...")
    if speech_service.aws_transcribe:
        print("   ✅ AWS Transcribe available")
    else:
        print("   ⚠️ AWS Transcribe not configured (using local fallback)")
    
    if speech_service.aws_polly:
        print("   ✅ AWS Polly available")
    else:
        print("   ⚠️ AWS Polly not configured (using local fallback)")
    
    # Test 5: Check audio directory
    print("\n5. Checking audio cache directory...")
    audio_dir = speech_service.audio_dir
    if audio_dir.exists():
        files = list(audio_dir.glob("*.wav"))
        print(f"   ✅ Audio cache directory exists with {len(files)} files")
    else:
        print("   ⚠️ Audio cache directory doesn't exist (will be created)")
    
    print("\n" + "=" * 50)
    print("🎉 Speech service testing complete!")
    print("\nTo use speech features:")
    print("1. Start the backend server: python app/main.py")
    print("2. Open the frontend in Chrome/Edge")
    print("3. Click the microphone button in chat")
    print("4. Speak your questions in any supported language!")

def test_environment():
    """Test environment setup"""
    print("🔧 Testing Environment Setup")
    print("=" * 30)
    
    # Check Python version
    print(f"Python version: {sys.version}")
    
    # Check required packages
    required_packages = [
        'boto3', 'speech_recognition', 'pyttsx3', 
        'soundfile', 'librosa', 'numpy', 'scipy'
    ]
    
    print("\nChecking required packages:")
    for package in required_packages:
        try:
            __import__(package)
            print(f"   ✅ {package}")
        except ImportError:
            print(f"   ❌ {package} - not installed")
    
    # Check environment variables
    print("\nChecking environment variables:")
    env_vars = ['LLAMA_API_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
    for var in env_vars:
        value = os.getenv(var)
        if value:
            print(f"   ✅ {var} = {value[:10]}...")
        else:
            print(f"   ⚠️ {var} - not set")

if __name__ == "__main__":
    print("🚀 Astronoma Speech Service Test")
    print("=" * 40)
    
    # Test environment first
    test_environment()
    
    # Test speech services
    asyncio.run(test_speech_services()) 