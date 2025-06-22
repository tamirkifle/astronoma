export class AudioService {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  async speak(text: string, language: string = 'en'): Promise<void> {
    // Cancel any ongoing speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.getLanguageCode(language);
    utterance.rate = 0.9;
    utterance.pitch = 0.95;
    utterance.volume = 1.0;

    this.currentUtterance = utterance;

    return new Promise((resolve, reject) => {
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };
      
      utterance.onerror = (error) => {
        this.currentUtterance = null;
        reject(error);
      };
      
      this.synth.speak(utterance);
    });
  }

  stop(): void {
    this.synth.cancel();
    this.currentUtterance = null;
  }

  private getLanguageCode(lang: string): string {
    const codes: Record<string, string> = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'hi': 'hi-IN'
    };
    return codes[lang] || 'en-US';
  }
}

export const audioService = new AudioService();
