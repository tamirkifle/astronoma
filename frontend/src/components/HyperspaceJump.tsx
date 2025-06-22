// frontend/src/components/HyperspaceJump.tsx - Fixed version that waits for universe

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

interface HyperspaceJumpProps {
  onComplete?: () => void;
  universeName: string;
  isUniverseReady?: boolean; // NEW: prop to indicate if universe is ready
}

export function HyperspaceJump({ onComplete, universeName, isUniverseReady = false }: HyperspaceJumpProps) {
  const [phase, setPhase] = useState<'starting' | 'jumping' | 'generating' | 'ready'>('starting');
  const [dots, setDots] = useState('');
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const onCompleteRef = useRef(onComplete);
  
  // Keep the callback reference stable
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    console.log('🚀 HYPERSPACE DEBUG: Component mounted/updated with:', {
      universeName,
      isUniverseReady,
      hasOnComplete: !!onComplete
    });
  }, [universeName, isUniverseReady, onComplete]);

  useEffect(() => {
    // Animate loading dots
    const dotInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    // Phase progression with timing
    const startingTimer = setTimeout(() => {
      console.log('🚀 HYPERSPACE DEBUG: Moving to jumping phase');
      setPhase('jumping');
    }, 1000);

    const jumpingTimer = setTimeout(() => {
      console.log('🚀 HYPERSPACE DEBUG: Moving to generating phase');
      setPhase('generating');
    }, 3000);

    // Minimum time before we can complete (ensures hyperspace shows for at least 4 seconds)
    const minTimeTimer = setTimeout(() => {
      console.log('🚀 HYPERSPACE DEBUG: Minimum time elapsed');
      setMinTimeElapsed(true);
    }, 4000);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(startingTimer);
      clearTimeout(jumpingTimer);
      clearTimeout(minTimeTimer);
    };
  }, []);

  // Check if we can complete: both minimum time elapsed AND universe is ready
  useEffect(() => {
    console.log('🔍 HYPERSPACE DEBUG: Checking completion conditions:', {
      minTimeElapsed,
      isUniverseReady,
      phase,
      bothConditionsMet: minTimeElapsed && isUniverseReady
    });
    
    if (minTimeElapsed && isUniverseReady) {
      if (phase !== 'ready') {
        console.log('✅ Both conditions met - universe ready and min time elapsed');
        setPhase('ready');
        
        // Small delay to show "ready" state before completing
        const completeTimer = setTimeout(() => {
          console.log('🚀 HYPERSPACE DEBUG: Calling onComplete callback');
          if (onCompleteRef.current) {
            onCompleteRef.current();
          } else {
            console.error('❌ HYPERSPACE DEBUG: onComplete callback is null!');
          }
        }, 500);
        
        return () => {
          console.log('🧹 HYPERSPACE DEBUG: Cleaning up completion timer');
          clearTimeout(completeTimer);
        };
      }
    }
  }, [minTimeElapsed, isUniverseReady, phase]); // Removed onComplete from deps

  // Backup completion mechanism - if both conditions are met for too long without completing
  useEffect(() => {
    if (minTimeElapsed && isUniverseReady) {
      console.log('🔄 HYPERSPACE DEBUG: Setting backup completion timer');
      const backupTimer = setTimeout(() => {
        console.log('⚠️ HYPERSPACE DEBUG: Backup completion triggered');
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }, 2000); // 2 second backup
      
      return () => {
        console.log('🧹 HYPERSPACE DEBUG: Clearing backup timer');
        clearTimeout(backupTimer);
      };
    }
  }, [minTimeElapsed, isUniverseReady]);

  const getPhaseText = () => {
    switch (phase) {
      case 'starting':
        return `Initializing hyperspace drive${dots}`;
      case 'jumping':
        return `Jumping to ${universeName}${dots}`;
      case 'generating':
        return `Generating ${universeName}${dots}`;
      case 'ready':
        return `Welcome to ${universeName}!`;
      default:
        return `Loading${dots}`;
    }
  };

  const getPhaseSubtext = () => {
    switch (phase) {
      case 'starting':
        return 'Calibrating stellar coordinates...';
      case 'jumping':
        return 'Traversing the cosmic void...';
      case 'generating':
        return 'Creating celestial bodies with AI...';
      case 'ready':
        return 'Universe ready for exploration!';
      default:
        return 'Please wait...';
    }
  };

  const getProgress = () => {
    switch (phase) {
      case 'starting': return 20;
      case 'jumping': return 50;
      case 'generating': return isUniverseReady ? 90 : 75;
      case 'ready': return 100;
      default: return 0;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
    >
      {/* Animated star field background */}
      <div className="absolute inset-0 stars-animation" />
      
      {/* Hyperspace lines effect */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: '2px',
              height: '1px',
            }}
            animate={{
              scaleX: phase === 'jumping' ? [1, 100, 1] : 1,
              opacity: phase === 'jumping' ? [0.6, 1, 0] : 0.6,
            }}
            transition={{
              duration: 0.3,
              delay: Math.random() * 0.5,
              repeat: phase === 'jumping' ? Infinity : 0,
              repeatDelay: Math.random() * 0.2,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="text-center z-10 max-w-2xl px-8">
        <motion.h1 
          className="text-4xl md:text-6xl font-light text-white mb-6"
          animate={{ 
            scale: phase === 'jumping' ? [1, 1.05, 1] : 1,
            textShadow: phase === 'ready' ? [
              '0 0 20px #4169E1',
              '0 0 40px #4169E1',
              '0 0 20px #4169E1'
            ] : '0 0 10px #ffffff'
          }}
          transition={{ 
            duration: 0.5, 
            repeat: phase === 'jumping' ? Infinity : phase === 'ready' ? Infinity : 0,
            repeatType: 'reverse'
          }}
        >
          {getPhaseText()}
        </motion.h1>
        
        <motion.p 
          className="text-xl text-blue-300 mb-8"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {getPhaseSubtext()}
        </motion.p>

        {/* Progress visualization */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/10 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                phase === 'ready' 
                  ? 'bg-gradient-to-r from-green-500 to-blue-500' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              animate={{ width: `${getProgress()}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-white/60 text-sm mt-2">
            {phase === 'starting' && 'Preparing for jump...'}
            {phase === 'jumping' && 'In hyperspace...'}
            {phase === 'generating' && `Generating universe... ${isUniverseReady ? '(Almost done!)' : ''}`}
            {phase === 'ready' && 'Ready to explore!'}
          </p>
        </div>

        {/* Status indicators */}
        <div className="mt-6 flex justify-center space-x-6 text-sm">
          <div className={`flex items-center space-x-2 ${minTimeElapsed ? 'text-green-400' : 'text-yellow-400'}`}>
            <div className={`w-2 h-2 rounded-full ${minTimeElapsed ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span>Hyperspace Timer</span>
          </div>
          <div className={`flex items-center space-x-2 ${isUniverseReady ? 'text-green-400' : 'text-yellow-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isUniverseReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span>Universe Generation</span>
          </div>
        </div>

        {/* Pulsing ring effect during jump */}
        {phase === 'jumping' && (
          <motion.div
            className="absolute inset-0 border-2 border-white/20 rounded-full"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              width: ['200px', '800px', '200px'],
              height: ['200px', '800px', '200px'],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}
      </div>

      {/* Corner loading indicator */}
      <div className="absolute bottom-8 right-8 flex items-center space-x-2">
        <div className="flex space-x-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-white rounded-full"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
        <span className="text-white/60 text-sm ml-2">
          {phase === 'ready' ? 'Complete!' : 'Loading...'}
        </span>
      </div>
    </motion.div>
  );
}