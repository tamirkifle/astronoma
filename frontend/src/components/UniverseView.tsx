import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { CelestialObject, ViewState } from '../types/interfaces';
import { textureLoader, TextureSet } from '../services/textureLoader';
import { textureService } from '../services/textureService';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';


interface UniverseViewProps {
  objects: CelestialObject[];
  viewState: ViewState;
  onObjectClick: (object: CelestialObject) => void;
  onViewChange: (viewState: ViewState) => void;
  selectedObjectId?: string;
}

interface PlanetProps {
  object: CelestialObject;
  onClick: () => void;
  isSelected: boolean;
}

function Planet({ object, onClick, isSelected }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);
  const [textures, setTextures] = useState<TextureSet>({});
  const [loading, setLoading] = useState(true);

  // Load textures
  useEffect(() => {
    // Immediately set procedural textures
    if (object.type === 'star') {
      setTextures({
        map: textureLoader.createStarTexture(),
        emissiveMap: textureLoader.createStarTexture()
      });
    } else {
      const proceduralType = object.info.temp && parseInt(object.info.temp.replace(/[^\d]/g, '')) < 200 ? 'ice' :
                           object.type === 'planet' && object.info.atmosphere?.includes('Hydrogen') ? 'gas' : 
                           'rocky';
      
      setTextures({
        map: textureLoader.generateProceduralTexture(object.color, proceduralType)
      });
    }
    setLoading(false);

    // Then try to load better textures in the background
    const loadBetterTextures = async () => {
      try {
        // Check for cached backend textures
        let textureData = textureService.getTextureData(object.id);
        
        if (!textureData) {
          // Load from backend asynchronously
          textureData = await textureService.loadTextureForObject(object);
        }
        
        if (textureData) {
          const loadedTextures = textureLoader.loadFromGeneratedData(textureData);
          setTextures(loadedTextures);
        }
      } catch (err) {
        console.warn(`Background texture loading failed for ${object.name}:`, err);
        // Keep using procedural textures
      }
    };

    loadBetterTextures();
  }, [object]);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotation
      meshRef.current.rotation.y += 0.001;
      
      // Pulse effect for selected planet
      if (isSelected) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        meshRef.current.scale.setScalar(scale * object.size);
      } else {
        meshRef.current.scale.setScalar((hovered ? 1.1 : 1) * object.size);
      }
    }
  });

  // Create material based on object type
  const createMaterial = () => {
    if (object.type === 'star') {
      // Stars use basic material with emissive properties
      return (
        <meshBasicMaterial 
          map={textures.map || undefined}
          color={object.color}
        />
      );
    } else {
      // Planets use phong material with enhanced brightness
      return (
        <meshPhongMaterial 
          map={textures.map || undefined}
          normalMap={textures.normalMap || undefined}
          bumpMap={textures.bumpMap || undefined}
          bumpScale={textures.bumpMap ? 0.05 : 0}
          specularMap={textures.specularMap || undefined}
          color={object.color}
          emissive={new THREE.Color(object.color)}
          emissiveIntensity={0.05}
          shininess={30}
          specular={new THREE.Color(0x222222)}
        />
      );
    }
  };

  return (
    <group position={object.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={object.size}
      >
        <sphereGeometry args={[1, 64, 64]} />
        {loading ? (
          <meshBasicMaterial color={object.color} />
        ) : (
          createMaterial()
        )}
      </mesh>
      
      {/* Atmosphere (if applicable) */}
      {object.atmosphereColor && (
        <mesh scale={object.size * 1.1}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial
            color={object.atmosphereColor}
            transparent
            opacity={object.atmosphereDensity || 0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Ring system */}
      {object.ringSystem && (
        <mesh rotation={[Math.PI / 2.2, 0, 0]} scale={object.size}>
          <ringGeometry args={[
            object.ringSystem.innerRadius,
            object.ringSystem.outerRadius,
            64,
            8
          ]} />
          <meshBasicMaterial 
            color={object.ringSystem.color}
            side={THREE.DoubleSide}
            transparent
            opacity={object.ringSystem.opacity}
          />
        </mesh>
      )}
      
      {/* Selection glow effect */}
      {isSelected && (
        <mesh scale={object.size * 1.15}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={object.color}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Hover glow */}
      {hovered && !isSelected && (
        <mesh scale={object.size * 1.2}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

function CameraController({ selectedObjectId, objects }: { selectedObjectId?: string; objects: CelestialObject[] }) {
  const { camera } = useThree();
  
  useEffect(() => {
    if (selectedObjectId) {
      const target = objects.find(obj => obj.id === selectedObjectId);
      if (target) {
        // Animate camera to look at selected object
        const targetPosition = new THREE.Vector3(...target.position);
        const offset = new THREE.Vector3(
          target.size * 5,
          target.size * 2,
          target.size * 5
        );
        
        // Simple animation (in a real app, use a tweening library)
        const startPosition = camera.position.clone();
        const endPosition = targetPosition.clone().add(offset);
        
        let progress = 0;
        const animate = () => {
          progress += 0.02;
          if (progress <= 1) {
            camera.position.lerpVectors(startPosition, endPosition, progress);
            camera.lookAt(targetPosition);
            requestAnimationFrame(animate);
          }
        };
        animate();
      }
    }
  }, [selectedObjectId, objects, camera]);
  
  return null;
}

// Skybox component for better space environment
function SpaceSkybox() {
  const { scene } = useThree();
  
  useEffect(() => {
    // For now, just set a dark space background
    // We'll implement proper skybox in commit 3
    scene.background = new THREE.Color(0x000011);
    
    // Add some fog for depth
    scene.fog = new THREE.Fog(0x000011, 100, 500);
    
    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene]);
  
  return null;
}

export function UniverseView({ 
  objects, 
  viewState, 
  onObjectClick, 
  onViewChange,
  selectedObjectId 
}: UniverseViewProps) {
  return (
    <Canvas
      camera={{ 
        position: viewState.cameraPosition, 
        fov: 75 
      }}
      style={{ background: '#000' }}
      gl={{ 
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0
      }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      
      {/* Add point lights for each star */}
      {objects.filter(obj => obj.type === 'star').map(star => (
        <pointLight 
          key={star.id}
          position={star.position} 
          intensity={3} 
          color={star.color}
          distance={300}
          decay={1.5}
        />
      ))}
      
      {/* Add a soft directional light for better visibility */}
      <directionalLight 
        position={[50, 50, 50]} 
        intensity={0.5} 
        color="#ffffff"
      />
      
      {/* Add hemisphere light for natural lighting */}
      <hemisphereLight 
        color="#ffffff" 
        groundColor="#444444" 
        intensity={0.3} 
      />
      
      {/* Space environment */}
      <SpaceSkybox />
      <Stars 
        radius={300} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={0.5}
      />
      
      {/* Planets */}
      {objects.map((object) => (
        <Planet
          key={object.id}
          object={object}
          onClick={() => onObjectClick(object)}
          isSelected={object.id === selectedObjectId}
        />
      ))}
      
      {/* Camera Controls */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        zoomSpeed={0.5}
        rotateSpeed={0.5}
        minDistance={5}
        maxDistance={200}
        autoRotate={false}
        autoRotateSpeed={0.5}
      />
      
      <CameraController selectedObjectId={selectedObjectId} objects={objects} />
    </Canvas>
  );
}