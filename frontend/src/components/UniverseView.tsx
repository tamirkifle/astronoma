import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { CelestialObject, ViewState } from '../types/interfaces';

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

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
      
      // Pulse effect for selected planet
      if (isSelected) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        meshRef.current.scale.setScalar(scale);
      } else {
        meshRef.current.scale.setScalar(hovered ? 1.1 : 1);
      }
    }
  });

  // Create texture based on planet type
  const getTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Simple gradient for planets
    const gradient = ctx.createLinearGradient(0, 0, 512, 0);
    
    if (object.id === 'earth') {
      gradient.addColorStop(0, '#4169E1');
      gradient.addColorStop(0.5, '#87CEEB');
      gradient.addColorStop(1, '#4169E1');
    } else if (object.id === 'mars') {
      gradient.addColorStop(0, '#CD5C5C');
      gradient.addColorStop(0.5, '#E25822');
      gradient.addColorStop(1, '#8B4513');
    } else if (object.id === 'jupiter') {
      for (let i = 0; i < 10; i++) {
        const color = i % 2 === 0 ? '#DAA520' : '#D2691E';
        gradient.addColorStop(i / 10, color);
      }
    } else {
      gradient.addColorStop(0, object.color);
      gradient.addColorStop(1, object.color);
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    
    return new THREE.CanvasTexture(canvas);
  };

  return (
    <group position={object.position}>
      {/* Planet */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[object.size, 32, 32]} />
        <meshPhongMaterial 
          map={getTexture()}
          emissive={new THREE.Color(object.color)}
          emissiveIntensity={object.type === 'star' ? 0.5 : 0.1}
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh scale={[1.2, 1.2, 1.2]}>
        <sphereGeometry args={[object.size, 32, 32]} />
        <meshBasicMaterial
          color={object.color}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Saturn's rings */}
      {object.id === 'saturn' && (
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <ringGeometry args={[object.size * 1.5, object.size * 2.5, 64]} />
          <meshBasicMaterial 
            color="#F4A460" 
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
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
    >
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#FDB813" />
      
      {/* Stars background */}
      <Stars 
        radius={300} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
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
        maxDistance={100}
      />
      
      <CameraController selectedObjectId={selectedObjectId} objects={objects} />
    </Canvas>
  );
}
