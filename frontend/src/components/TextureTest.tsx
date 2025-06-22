import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { textureLoader } from '../services/textureLoader';

interface TestPlanet {
  id: string;
  name: string;
  type: 'star' | 'rocky' | 'gas' | 'ice' | 'terrestrial';
  color: string;
  temperature?: number;
  position: [number, number, number];
}

const testPlanets: TestPlanet[] = [
  { id: 'test-sun', name: 'Test Sun', type: 'star', color: '#FDB813', position: [-10, 0, 0] },
  { id: 'test-rocky', name: 'Test Rocky', type: 'rocky', color: '#8C7853', temperature: 400, position: [-5, 0, 0] },
  { id: 'test-gas', name: 'Test Gas Giant', type: 'gas', color: '#DAA520', position: [0, 0, 0] },
  { id: 'test-ice', name: 'Test Ice World', type: 'ice', color: '#4FD0E0', temperature: 100, position: [5, 0, 0] },
  { id: 'test-earth', name: 'Test Terrestrial', type: 'terrestrial', color: '#4169E1', position: [10, 0, 0] }
];

function TestPlanetMesh({ planet, textureData }: { planet: TestPlanet; textureData: any }) {
  const [textures, setTextures] = useState<any>({});

  useEffect(() => {
    if (textureData) {
      const loadedTextures = textureLoader.loadFromGeneratedData(textureData);
      setTextures(loadedTextures);
    }
  }, [textureData]);

  return (
    <mesh position={planet.position}>
      <sphereGeometry args={[1, 64, 64]} />
      {textures.map ? (
        <meshPhongMaterial
          map={textures.map}
          normalMap={textures.normalMap}
          emissiveMap={textures.emissiveMap}
          emissive={planet.type === 'star' ? new THREE.Color(planet.color) : undefined}
          emissiveIntensity={planet.type === 'star' ? 0.5 : 0}
        />
      ) : (
        <meshBasicMaterial color={planet.color} />
      )}
    </mesh>
  );
}

export function TextureTest() {
  const [textureData, setTextureData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProceduralTextures, setShowProceduralTextures] = useState(false);

  useEffect(() => {
    if (!showProceduralTextures) {
      loadBackendTextures();
    }
  }, [showProceduralTextures]);

  const loadBackendTextures = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch textures from backend
      const results: Record<string, any> = {};
      
      for (const planet of testPlanets) {
        try {
          const response = await fetch(
            `http://localhost:3000/texture/generate/${planet.id}?planet_type=${planet.type}&color=${encodeURIComponent(planet.color)}`
          );
          
          if (!response.ok) {
            throw new Error(`Failed to generate texture for ${planet.name}`);
          }
          
          const data = await response.json();
          results[planet.id] = data;
        } catch (err) {
          console.error(`Error generating texture for ${planet.name}:`, err);
        }
      }
      
      setTextureData(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load textures');
    } finally {
      setLoading(false);
    }
  };

  const generateProceduralTextures = () => {
    const results: Record<string, any> = {};
    
    for (const planet of testPlanets) {
      const proceduralType = planet.type === 'star' ? 'metallic' :
                           planet.type === 'ice' ? 'ice' :
                           planet.type === 'gas' ? 'gas' :
                           planet.type === 'terrestrial' ? 'rocky' : 'rocky';
      
      const texture = textureLoader.generateProceduralTexture(planet.color, proceduralType as any);
      
      // Create a canvas to convert the texture to base64
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      if (texture.image && ctx) {
        ctx.drawImage(texture.image as any, 0, 0, canvas.width, canvas.height);
        results[planet.id] = {
          diffuse: canvas.toDataURL('image/jpeg'),
          type: planet.type,
          name: planet.name
        };
      }
    }
    
    setTextureData(results);
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* 3D View */}
      <Canvas camera={{ position: [0, 5, 15], fov: 60 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 5, 5]} intensity={1} />
        
        {testPlanets.map(planet => (
          <TestPlanetMesh
            key={planet.id}
            planet={planet}
            textureData={textureData[planet.id]}
          />
        ))}
        
        <OrbitControls />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-8 left-8 space-y-4">
        <div className="glass p-6 rounded-2xl max-w-md">
          <h2 className="text-2xl font-light text-white mb-4">Texture Generation Test</h2>
          
          {loading && (
            <p className="text-white/60">Generating textures from backend...</p>
          )}
          
          {error && (
            <div className="text-red-400 mb-4">
              <p>Error: {error}</p>
              <p className="text-sm mt-2">Make sure the backend is running on port 3000</p>
            </div>
          )}
          
          <div className="space-y-2 text-white/80 text-sm">
            <p>• <span className="text-yellow-400">Star</span> - Corona and surface activity</p>
            <p>• <span className="text-amber-600">Rocky</span> - Craters and mineral variations</p>
            <p>• <span className="text-yellow-600">Gas Giant</span> - Atmospheric bands and storms</p>
            <p>• <span className="text-cyan-400">Ice World</span> - Glaciers and cracks</p>
            <p>• <span className="text-blue-500">Terrestrial</span> - Continents and oceans</p>
          </div>
          
          <div className="mt-4 space-x-4">
            <button
              onClick={() => {
                setShowProceduralTextures(false);
                loadBackendTextures();
              }}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-white rounded-lg transition-colors"
            >
              Load Backend Textures
            </button>
            
            <button
              onClick={() => {
                setShowProceduralTextures(true);
                generateProceduralTextures();
              }}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-white rounded-lg transition-colors"
            >
              Test Frontend Procedural
            </button>
          </div>
          
          <div className="mt-4 text-white/60 text-xs">
            <p>Drag to rotate • Scroll to zoom</p>
            <p>Each planet has a unique texture based on its properties</p>
          </div>
        </div>

        {/* Texture Preview Grid */}
        {Object.keys(textureData).length > 0 && (
          <div className="glass p-4 rounded-2xl">
            <h3 className="text-white text-lg mb-2">Generated Textures</h3>
            <div className="grid grid-cols-5 gap-2">
              {testPlanets.map(planet => {
                const data = textureData[planet.id];
                if (!data?.diffuse) return null;
                
                return (
                  <div key={planet.id} className="text-center">
                    <img
                      src={data.diffuse}
                      alt={planet.name}
                      className="w-24 h-12 object-cover rounded"
                    />
                    <p className="text-white/60 text-xs mt-1">{planet.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Back to main app */}
      <button
        onClick={() => window.location.href = '/'}
        className="absolute top-8 right-8 px-4 py-2 glass text-white rounded-lg hover:bg-white/20 transition-colors"
      >
        Back to App
      </button>
    </div>
  );
}