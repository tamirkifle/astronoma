import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ViewState, 
  NavigationAction, 
  GenerateUniverseAction,
  CelestialObject,
  GeneratedUniverse 
} from '../types/interfaces';
import { apiClient } from '../services/api';
import { speechService, SpeechRecognitionResult, LanguageInfo } from '../services/speech';

interface ChatInterfaceProps {
  currentView: ViewState;
  onNavigate: (action: NavigationAction) => void;
  onGenerateUniverse?: (universeType: string) => void;
  currentUniverse?: GeneratedUniverse | null;
  objects: CelestialObject[];
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  isSpeech?: boolean;
  language?: string;
}

export function ChatInterface({ 
  currentView, 
  onNavigate, 
  onGenerateUniverse,
  currentUniverse,
  objects 
}: ChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState<LanguageInfo[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load available languages
    loadLanguages();
    
    // Check speech capabilities
    const capabilities = speechService.getCapabilities();
    setSpeechEnabled(capabilities.speechRecognition || capabilities.speechSynthesis);
  }, []);

  const loadLanguages = async () => {
    try {
      const languages = await speechService.getAvailableLanguages();
      setAvailableLanguages(languages);
    } catch (error) {
      console.error('Failed to load languages:', error);
      // Set default languages
      setAvailableLanguages([
        { code: 'en', name: 'English', native_name: 'English' },
        { code: 'es', name: 'Spanish', native_name: 'Español' },
        { code: 'fr', name: 'French', native_name: 'Français' },
        { code: 'hi', name: 'Hindi', native_name: 'हिंदी' }
      ]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Build universe context from current objects
      const universeContext = {
        universeName: currentUniverse?.name || 'Unknown Universe',
        universeType: currentUniverse?.type || 'unknown',
        objects: objects.map(obj => ({
          id: obj.id,
          name: obj.name,
          type: obj.type
        }))
      };

      console.log('📍 Sending chat with universe context:', universeContext);

      const response = await apiClient.sendChatMessage({
        message: userMessage,
        currentView,
        timestamp: Date.now(),
        universeContext
      });

      const assistantMessage: Message = { 
        role: 'assistant', 
        text: response.text,
        language: selectedLanguage
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak assistant response if enabled
      if (autoSpeak && speechEnabled) {
        await speakText(response.text, selectedLanguage);
      }

      if (response.action) {
        console.log('🎯 Chat action received:', response.action);
        
        if (response.action.type === 'navigate') {
          console.log('🧭 Navigating to:', response.action.targetId);
          onNavigate(response.action as NavigationAction);
        } else if (response.action.type === 'generate_universe' && onGenerateUniverse) {
          const action = response.action as GenerateUniverseAction;
          console.log('🌌 Generating universe:', action.universe_type);
          onGenerateUniverse(action.universe_type);
        }
      } else {
        console.log('💬 No action in response, just text');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeechInput = () => {
    if (!speechEnabled || isListening) return;

    const success = speechService.startListening(
      selectedLanguage,
      (result: SpeechRecognitionResult) => {
        setIsListening(false);
        if (result.success && result.text) {
          setInput(result.text);
          // Auto-send speech input
          setTimeout(() => {
            setInput(result.text!);
            handleSend();
          }, 500);
        } else {
          console.error('Speech recognition failed:', result.error);
        }
      },
      (error: string) => {
        setIsListening(false);
        console.error('Speech recognition error:', error);
      }
    );

    if (success) {
      setIsListening(true);
    }
  };

  const stopSpeechInput = () => {
    speechService.stopListening();
    setIsListening(false);
  };

  const speakText = async (text: string, language: string) => {
    if (!speechEnabled) return;

    setIsSpeaking(true);
    try {
      await speechService.speakText(text, language);
    } catch (error) {
      console.error('Speech synthesis error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 glass rounded-full flex items-center justify-center relative"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        
        {/* Speech indicator */}
        {speechEnabled && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 right-0 w-96 h-[32rem] glass rounded-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-light text-white">Space Assistant</h3>
                  <p className="text-white/60 text-sm">
                    Exploring: {currentUniverse?.name || 'Unknown Universe'}
                  </p>
                </div>
                
                {/* Language Selector */}
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-transparent text-white outline-none cursor-pointer text-xs border border-white/20 rounded px-2 py-1"
                >
                  {availableLanguages.map(lang => (
                    <option key={lang.code} value={lang.code} className="bg-gray-800">
                      {lang.native_name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Speech Controls */}
              {speechEnabled && (
                <div className="flex items-center gap-3 mt-3">
                  <label className="flex items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={autoSpeak}
                      onChange={(e) => setAutoSpeak(e.target.checked)}
                      className="w-3 h-3"
                    />
                    Auto-speak
                  </label>
                  
                  {isSpeaking && (
                    <button
                      onClick={stopSpeaking}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Stop Speaking
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center text-white/40 text-sm mt-8">
                  <p>Try asking:</p>
                  <p className="mt-2">"What planets are here?"</p>
                  <p>"Take me to the largest object"</p>
                  <p>"What's special about this universe?"</p>
                  {speechEnabled && (
                    <p className="mt-2 text-green-400">🎤 Or use voice commands!</p>
                  )}
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-blue-500/80 text-white' 
                      : 'bg-white/10 text-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      {msg.isSpeech && (
                        <span className="text-xs opacity-60">🎤</span>
                      )}
                      <span>{msg.text}</span>
                    </div>
                    
                    {/* Language indicator */}
                    {msg.language && msg.language !== 'en' && (
                      <div className="text-xs opacity-60 mt-1">
                        {availableLanguages.find(l => l.code === msg.language)?.native_name}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 px-4 py-2 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={speechEnabled ? "Type or speak your message..." : "Ask about this universe..."}
                  className="flex-1 px-4 py-3 bg-white/10 rounded-full text-white placeholder-white/40 
                           outline-none focus:bg-white/15 transition-colors"
                  disabled={isLoading || isListening}
                />
                
                {/* Speech Input Button */}
                {speechEnabled && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isListening ? stopSpeechInput : handleSpeechInput}
                    className={`p-3 rounded-full transition-all ${
                      isListening 
                        ? 'bg-red-500/80 animate-pulse' 
                        : 'glass hover:bg-white/20'
                    }`}
                    disabled={isLoading}
                  >
                    {isListening ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </motion.button>
                )}
                
                {/* Send Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-3 glass rounded-full"
                  disabled={isLoading || isListening}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </motion.button>
              </form>
              
              {/* Speech Status */}
              {isListening && (
                <div className="mt-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Listening... Speak now
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}