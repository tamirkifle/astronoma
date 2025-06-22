// frontend/src/components/TextureGenerator.tsx
// Add this component temporarily to generate and download textures

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface PlanetTexture {
  name: string;
  color: string;
  type: 'star' | 'rocky' | 'gas' | 'ice' | 'terrestrial';
}

export function TextureGenerator() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);

  const planets: PlanetTexture[] = [
    { name: 'sun', color: '#FDB813', type: 'star' },
    { name: 'mercury', color: '#8C7853', type: 'rocky' },
    { name: 'venus', color: '#FFC649', type: 'rocky' },
    { name: 'earth', color: '#4169E1', type: 'terrestrial' },
    { name: 'mars', color: '#CD5C5C', type: 'rocky' },
    { name: 'jupiter', color: '#DAA520', type: 'gas' },
    { name: 'saturn', color: '#F4A460', type: 'gas' },
    { name: 'uranus', color: '#4FD0E0', type: 'ice' },
    { name: 'neptune', color: '#4169E1', type: 'ice' }
  ];

  const generateTexture = (planet: PlanetTexture, type: 'diffuse' | 'normal' = 'diffuse'): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    if (type === 'normal') {
      // Create normal map (bluish)
      ctx.fillStyle = '#8080FF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some variation
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 50 + 10;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#9999FF');
        gradient.addColorStop(1, '#8080FF');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      return canvas;
    }

    // Diffuse texture
    ctx.fillStyle = planet.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    switch (planet.type) {
      case 'star':
        // Create sun texture
        const sunGradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.height / 2
        );
        sunGradient.addColorStop(0, '#FFFFFF');
        sunGradient.addColorStop(0.3, '#FFE4B5');
        sunGradient.addColorStop(0.6, planet.color);
        sunGradient.addColorStop(1, '#FF8C00');
        ctx.fillStyle = sunGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add sunspots
        for (let i = 0; i < 30; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 30 + 10,
            0, Math.PI * 2
          );
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`;
          ctx.fill();
        }
        break;

      case 'gas':
        // Create bands for gas giants
        for (let y = 0; y < canvas.height; y += 2) {
          const bandWidth = Math.random() * 40 + 20;
          const opacity = Math.random() * 0.3 + 0.7;
          const hue = planet.name === 'jupiter' ? 
            30 + Math.random() * 30 : // Orange/brown for Jupiter
            200 + Math.random() * 60; // Blue range for others
          
          ctx.fillStyle = `hsla(${hue}, 50%, 50%, ${opacity})`;
          ctx.fillRect(0, y, canvas.width, bandWidth);
          y += bandWidth;
        }

        // Add storms (like Jupiter's red spot)
        if (planet.name === 'jupiter') {
          ctx.save();
          ctx.translate(canvas.width * 0.3, canvas.height * 0.6);
          ctx.scale(1.5, 1);
          ctx.beginPath();
          ctx.arc(0, 0, 80, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
          ctx.fill();
          ctx.restore();
        }
        break;

      case 'rocky':
        // Add noise for rocky texture
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 60;
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        
        ctx.putImageData(imageData, 0, 0);

        // Add craters
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const radius = Math.random() * 30 + 5;
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.4})`;
          ctx.fill();
          
          // Crater rim
          ctx.beginPath();
          ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        break;

      case 'terrestrial':
        // Create Earth-like texture
        // Ocean
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Continents
        ctx.fillStyle = '#228B22';
        
        // Simple continent shapes
        const continents = [
          { x: 0.2, y: 0.3, w: 0.15, h: 0.4 }, // Americas-like
          { x: 0.5, y: 0.2, w: 0.2, h: 0.3 },  // Europe/Africa-like
          { x: 0.7, y: 0.4, w: 0.15, h: 0.2 }, // Asia-like
          { x: 0.8, y: 0.7, w: 0.1, h: 0.1 },  // Australia-like
        ];

        continents.forEach(cont => {
          const x = cont.x * canvas.width;
          const y = cont.y * canvas.height;
          const w = cont.w * canvas.width;
          const h = cont.h * canvas.height;
          
          ctx.beginPath();
          ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        // Add clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const w = Math.random() * 200 + 50;
          const h = Math.random() * 50 + 20;
          
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.random() * Math.PI);
          ctx.beginPath();
          ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;

      case 'ice':
        // Ice planet texture
        const iceGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        iceGradient.addColorStop(0, '#E0F7FA');
        iceGradient.addColorStop(0.5, planet.color);
        iceGradient.addColorStop(1, '#B2EBF2');
        ctx.fillStyle = iceGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add ice cracks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 50; i++) {
          ctx.beginPath();
          const startX = Math.random() * canvas.width;
          const startY = Math.random() * canvas.height;
          ctx.moveTo(startX, startY);
          
          for (let j = 0; j < 5; j++) {
            const angle = Math.random() * Math.PI * 2;
            const length = Math.random() * 100 + 50;
            ctx.lineTo(
              startX + Math.cos(angle) * length,
              startY + Math.sin(angle) * length
            );
          }
          ctx.stroke();
        }

        // Add some frost
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const radius = Math.random() * 20 + 5;
          
          const frost = ctx.createRadialGradient(x, y, 0, x, y, radius);
          frost.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
          frost.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = frost;
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        break;
    }

    return canvas;
  };

  const downloadTexture = (canvas: HTMLCanvasElement, filename: string) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/jpeg', 0.95);
  };

  const generateAllTextures = async () => {
    setGenerating(true);
    setProgress([]);

    for (const planet of planets) {
      // Generate diffuse texture
      const diffuseCanvas = generateTexture(planet, 'diffuse');
      downloadTexture(diffuseCanvas, `${planet.name}_diffuse.jpg`);
      setProgress(prev => [...prev, `✅ Generated ${planet.name}_diffuse.jpg`]);
      
      // Small delay to prevent browser from blocking
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate normal map for non-star objects
      if (planet.type !== 'star') {
        const normalCanvas = generateTexture(planet, 'normal');
        downloadTexture(normalCanvas, `${planet.name}_normal.jpg`);
        setProgress(prev => [...prev, `✅ Generated ${planet.name}_normal.jpg`]);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setProgress(prev => [...prev, '✨ All textures generated! Check your downloads folder.']);
    setGenerating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                 bg-black/90 backdrop-blur-xl rounded-3xl p-8 
                 border border-white/20 max-w-md w-full max-h-[80vh] overflow-y-auto"
    >
      <h2 className="text-2xl font-light text-white mb-4">Texture Generator</h2>
      
      <p className="text-white/60 mb-6">
        Generate placeholder textures for all planets. These will be downloaded to your computer.
        Move them to: <code className="text-white/80">frontend/public/textures/planets/</code>
      </p>

      <div className="space-y-2 mb-6">
        {progress.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-white/80"
          >
            {msg}
          </motion.div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={generateAllTextures}
        disabled={generating}
        className="w-full py-3 bg-blue-500/80 hover:bg-blue-500 
                   text-white rounded-xl transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? 'Generating...' : 'Generate All Textures'}
      </motion.button>

      <p className="text-white/40 text-xs mt-4">
        Note: For production, use real textures from NASA or Solar System Scope for better quality.
      </p>
    </motion.div>
  );
}