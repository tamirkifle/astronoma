import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CelestialObject } from '../types/interfaces';
import { apiClient } from '../services/api';
import { audioService } from '../services/audio';

interface NarrationControlsProps {
  object: CelestialObject;
}

export function NarrationControls({ object }: NarrationControlsProps) {
  const [language, setLanguage] = useState<'en' | 'es' | 'fr' | 'hi'>('en');
  const [isNarrating, setIsNarrating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNarrate = async () => {
    if (isNarrating) {
      audioService.stop();
      setIsNarrating(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.requestNarration({
        objectId: object.id,
        language
      });

      setIsNarrating(true);
      await audioService.speak(response.text, language);
      setIsNarrating(false);
    } catch (error) {
      console.error('Narration error:', error);
      setIsNarrating(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-full px-6 py-3 flex items-center gap-4"
    >
      {/* Language Selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as any)}
        className="bg-transparent text-white outline-none cursor-pointer text-sm"
        disabled={isNarrating || isLoading}
      >
        <option value="en" className="bg-gray-800">English</option>
        <option value="es" className="bg-gray-800">Español</option>
        <option value="fr" className="bg-gray-800">Français</option>
        <option value="hi" className="bg-gray-800">हिंदी</option>
      </select>

      {/* Play/Stop Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleNarrate}
        disabled={isLoading}
        className="p-3 glass rounded-full transition-all"
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isNarrating ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </motion.button>

      {/* Audio Visualizer */}
      {isNarrating && (
        <div className="flex items-center gap-1">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-white rounded-full"
              animate={{
                height: [8, 20, 8],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
