
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface HyperspaceJumpProps {
  onComplete?: () => void;
  universeName: string;
}

export function HyperspaceJump({ onComplete, universeName }: HyperspaceJumpProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
          Generating Universe...
        </h1>
        <p className="text-xl text-blue-300">{universeName}</p>
      </div>
    </motion.div>
  );
}
