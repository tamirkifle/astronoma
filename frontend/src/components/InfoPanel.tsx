import React from 'react';
import { motion } from 'framer-motion';
import { CelestialObject } from '../types/interfaces';

interface InfoPanelProps {
  object: CelestialObject;
  onClose: () => void;
}

export function InfoPanel({ object, onClose }: InfoPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-80 glass rounded-3xl p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-3xl font-light text-white">{object.name}</h2>
          <p className="text-white/60 text-sm uppercase tracking-wider mt-1">
            {object.type}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-3">
        <InfoRow label="Distance" value={object.info.distance} />
        <InfoRow label="Temperature" value={object.info.temp} />
        {object.info.moons !== undefined && (
          <InfoRow label="Moons" value={object.info.moons.toString()} />
        )}
        {object.info.atmosphere && (
          <InfoRow label="Atmosphere" value={object.info.atmosphere} />
        )}
        {object.info.magnitude && (
          <InfoRow label="Magnitude" value={object.info.magnitude} />
        )}
      </div>
    </motion.div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
      <span className="text-white/60 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}
