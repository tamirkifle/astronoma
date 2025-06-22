import { apiClient } from './api';

export interface SpeechRecognitionResult {
  success: boolean;
  text?: string;
  language?: string;
  confidence?: number;
  error?: string;
}

export interface SpeechSynthesisResult {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  native_name: string;
}

export class SpeechService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private currentLanguage = 'en';
  private onResultCallback: ((result: SpeechRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  private initializeSpeechRecognition(): void {
    // Check if SpeechRecognition is available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognitionHandlers();
    } else {
      console.warn('Speech Recognition not supported in this browser');
    }
  }

  private initializeSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('Speech Synthesis not supported in this browser');
    }
  }

  private setupRecognitionHandlers(): void {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      const result = event.results[0];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      console.log('🎤 Speech recognized:', transcript, 'confidence:', confidence);

      if (this.onResultCallback) {
        this.onResultCallback({
          success: true,
          text: transcript,
          language: this.currentLanguage,
          confidence: confidence
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      this.isListening = false;

      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      this.isListening = false;
    };
  }

  // Start listening for speech input
  startListening(language: string = 'en', onResult?: (result: SpeechRecognitionResult) => void, onError?: (error: string) => void): boolean {
    if (!this.recognition) {
      console.error('Speech recognition not available');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.currentLanguage = language;
    this.onResultCallback = onResult || null;
    this.onErrorCallback = onError || null;

    // Set language
    const languageCode = this.getLanguageCode(language);
    this.recognition.lang = languageCode;

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  // Stop listening for speech input
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Check if currently listening
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // Transcribe audio data using backend service
  async transcribeAudio(audioData: ArrayBuffer, language: string = 'en'): Promise<SpeechRecognitionResult> {
    try {
      // Convert ArrayBuffer to base64
      const base64Audio = this.arrayBufferToBase64(audioData);
      
      const response = await apiClient.transcribeSpeech({
        audio_data: base64Audio,
        language: language,
        sample_rate: 16000,
        sample_width: 2
      });

      return {
        success: response.success,
        text: response.text,
        language: response.language,
        confidence: response.confidence,
        error: response.error
      };
    } catch (error) {
      console.error('Transcription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed'
      };
    }
  }

  // Synthesize text to speech using backend service
  async synthesizeSpeech(text: string, language: string = 'en', voiceType: string = 'neural'): Promise<SpeechSynthesisResult> {
    try {
      const response = await apiClient.synthesizeSpeech({
        text: text,
        language: language,
        voice_type: voiceType
      });

      return {
        success: response.success,
        audioUrl: response.audio_url,
        error: response.error
      };
    } catch (error) {
      console.error('Speech synthesis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Speech synthesis failed'
      };
    }
  }

  // Synthesize text to speech using Web Speech API (fallback)
  speakText(text: string, language: string = 'en'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.getLanguageCode(language);
      utterance.rate = 0.9;
      utterance.pitch = 0.95;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synthesis.speak(utterance);
    });
  }

  // Stop speech synthesis
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  // Get available languages
  async getAvailableLanguages(): Promise<LanguageInfo[]> {
    try {
      const response = await apiClient.getAvailableLanguages();
      return response.languages;
    } catch (error) {
      console.error('Error getting languages:', error);
      // Return basic languages as fallback
      return [
        { code: 'en', name: 'English', native_name: 'English' },
        { code: 'es', name: 'Spanish', native_name: 'Español' },
        { code: 'fr', name: 'French', native_name: 'Français' },
        { code: 'hi', name: 'Hindi', native_name: 'हिंदी' }
      ];
    }
  }

  // Detect language from text
  async detectLanguage(text: string): Promise<string> {
    // Simple language detection based on common words
    const textLower = text.toLowerCase();
    
    // Spanish indicators
    const spanishWords = ['hola', 'gracias', 'por favor', 'si', 'no', 'que', 'como', 'donde'];
    if (spanishWords.some(word => textLower.includes(word))) {
      return 'es';
    }
    
    // French indicators
    const frenchWords = ['bonjour', 'merci', 's\'il vous plaît', 'oui', 'non', 'que', 'comment', 'où'];
    if (frenchWords.some(word => textLower.includes(word))) {
      return 'fr';
    }
    
    // Hindi indicators
    const hindiWords = ['नमस्ते', 'धन्यवाद', 'कृपया', 'हाँ', 'नहीं', 'क्या', 'कैसे', 'कहाँ'];
    if (hindiWords.some(word => textLower.includes(word))) {
      return 'hi';
    }
    
    // German indicators
    const germanWords = ['hallo', 'danke', 'bitte', 'ja', 'nein', 'was', 'wie', 'wo'];
    if (germanWords.some(word => textLower.includes(word))) {
      return 'de';
    }
    
    // Default to English
    return 'en';
  }

  // Convert ArrayBuffer to base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Get language code for speech recognition
  private getLanguageCode(language: string): string {
    const codes: Record<string, string> = {
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
    };
    return codes[language] || 'en-US';
  }

  // Check if speech recognition is supported
  isSpeechRecognitionSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  // Check if speech synthesis is supported
  isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  // Get browser capabilities
  getCapabilities(): {
    speechRecognition: boolean;
    speechSynthesis: boolean;
    backendServices: boolean;
  } {
    return {
      speechRecognition: this.isSpeechRecognitionSupported(),
      speechSynthesis: this.isSpeechSynthesisSupported(),
      backendServices: true // Assuming backend is always available
    };
  }
}

// Global instance
export const speechService = new SpeechService(); 