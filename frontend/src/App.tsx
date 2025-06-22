import React, { useState, useEffect } from 'react';
import { UniverseView } from './components/UniverseView';
import { SearchBar } from './components/SearchBar';
import { InfoPanel } from './components/InfoPanel';
import { ChatInterface } from './components/ChatInterface';
import { NarrationControls } from './components/NarrationControls';
import { HyperspaceJump } from './components/HyperspaceJump';
import { apiClient } from './services/api';
import { textureService } from './services/textureService';
import { 
  CelestialObject, 
  ViewState, 
  NavigationAction,
  GeneratedUniverse 
} from './types/interfaces';
import './App.css';

const initialViewState: ViewState = {
  cameraPosition: [30, 15, 30],
  lookAt: [0, 0, 0],
  selectedObjectId: undefined
};

// Basic solar system data that loads instantly
const basicSolarSystem: CelestialObject[] = [
  {
    id: 'sun',
    name: 'Sun',
    type: 'star',
    position: [0, 0, 0],
    size: 3,
    color: '#FDB813',
    info: { distance: '0 AU', temp: '5,778 K', magnitude: '-26.74' },
    narrationPrompt: 'The Sun'
  },
  {
    id: 'mercury',
    name: 'Mercury',
    type: 'planet',
    position: [6, 0, 0],
    size: 0.4,
    color: '#8C7853',
    info: { distance: '0.39 AU', temp: '440 K', moons: 0 },
    narrationPrompt: 'Mercury'
  },
  {
    id: 'venus',
    name: 'Venus',
    type: 'planet',
    position: [10, 0, 2],
    size: 0.9,
    color: '#FFC649',
    info: { distance: '0.72 AU', temp: '737 K', atmosphere: 'Carbon Dioxide', moons: 0 },
    narrationPrompt: 'Venus'
  },
  {
    id: 'earth',
    name: 'Earth',
    type: 'planet',
    position: [15, 0, 0],
    size: 1,
    color: '#4169E1',
    info: { distance: '1 AU', temp: '288 K', moons: 1, atmosphere: 'Nitrogen, Oxygen' },
    narrationPrompt: 'Earth'
  },
  {
    id: 'mars',
    name: 'Mars',
    type: 'planet',
    position: [20, 0, -3],
    size: 0.6,
    color: '#CD5C5C',
    info: { distance: '1.52 AU', temp: '210 K', moons: 2, atmosphere: 'Carbon Dioxide' },
    narrationPrompt: 'Mars'
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    position: [35, 0, 5],
    size: 2.5,
    color: '#DAA520',
    info: { distance: '5.2 AU', temp: '165 K', moons: 79, atmosphere: 'Hydrogen, Helium' },
    narrationPrompt: 'Jupiter'
  },
  {
    id: 'saturn',
    name: 'Saturn',
    type: 'planet',
    position: [50, 0, -8],
    size: 2.2,
    color: '#F4A460',
    ringSystem: { innerRadius: 1.5, outerRadius: 2.5, color: '#DEB887', opacity: 0.8 },
    info: { distance: '9.5 AU', temp: '134 K', moons: 82, atmosphere: 'Hydrogen, Helium' },
    narrationPrompt: 'Saturn'
  },
  {
    id: 'uranus',
    name: 'Uranus',
    type: 'planet',
    position: [65, 0, 10],
    size: 1.5,
    color: '#4FD0E0',
    info: { distance: '19.2 AU', temp: '76 K', moons: 27 },
    narrationPrompt: 'Uranus'
  },
  {
    id: 'neptune',
    name: 'Neptune',
    type: 'planet',
    position: [80, 0, -5],
    size: 1.5,
    color: '#4169E1',
    info: { distance: '30.1 AU', temp: '72 K', moons: 14 },
    narrationPrompt: 'Neptune'
  }
];

function App() {
  // Initialize with basic solar system immediately
  const [objects, setObjects] = useState<CelestialObject[]>(basicSolarSystem);
  const [selectedObject, setSelectedObject] = useState<CelestialObject | null>(null);
  const [viewState, setViewState] = useState<ViewState>(initialViewState);
  const [loading, setLoading] = useState(false);
  const [showHyperspace, setShowHyperspace] = useState(false);
  const [hyperspaceDestination, setHyperspaceDestination] = useState('');
  const [currentUniverse, setCurrentUniverse] = useState<GeneratedUniverse | null>({
    id: 'solar-system',
    type: 'solar-system',
    name: 'Our Solar System',
    description: 'The solar system we call home',
    objects: basicSolarSystem,
    generated_at: Date.now(),
    parameters_used: {}
  });
  const [error, setError] = useState<string | null>(null);
  const [availableUniverses, setAvailableUniverses] = useState<string[]>([
    'solar-system',
    'exoplanet-system',
    'binary-system',
    'galaxy-core',
    'star-wars',
    'fictional'
  ]);

  useEffect(() => {
    // Load enhanced data in the background
    loadEnhancedData();
  }, []);

  useEffect(() => {
    // Load textures asynchronously after objects are loaded
    if (objects.length > 0 && !showHyperspace) {
      textureService.loadTexturesForObjects(objects).then(() => {
        console.log('✅ Textures loaded in background');
      }).catch(err => {
        console.warn('⚠️ Failed to load some textures:', err);
      });
    }
  }, [objects, showHyperspace]);

  const loadEnhancedData = async () => {
    try {
      console.log('🚀 Loading enhanced universe data in background...');
      const data = await apiClient.getUniverse('solar-system');
      console.log('✅ Enhanced universe data loaded');
      
      // Update with enhanced data (includes atmosphere, rings, etc.)
      setObjects(data.objects);
      setCurrentUniverse(prev => ({
        ...prev!,
        objects: data.objects
      }));
    } catch (error) {
      console.warn('⚠️ Could not load enhanced data, using basic universe:', error);
      // Basic universe is already showing, so just log the error
    }
  };

  const loadUniverse = async (type: string = 'solar-system') => {
    setError(null);
    
    if (type === 'solar-system') {
      // For solar system, just show it immediately
      setObjects(basicSolarSystem);
      setCurrentUniverse({
        id: 'solar-system',
        type: 'solar-system',
        name: 'Our Solar System',
        description: 'The solar system we call home',
        objects: basicSolarSystem,
        generated_at: Date.now(),
        parameters_used: {}
      });
      
      // Then load enhanced data
      loadEnhancedData();
    } else {
      // Show hyperspace jump for other universes
      const destinationName = type.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      setHyperspaceDestination(destinationName);
      setShowHyperspace(true);
      
      try {
        // Generate the universe while showing hyperspace
        const universe = await apiClient.generateUniverse({
          universe_type: type as any,
          parameters: {
            size: 'medium',
            complexity: 'moderate',
            style: 'realistic'
          }
        });
        
        // Update the universe data (will be applied when hyperspace completes)
        setObjects(universe.objects);
        setCurrentUniverse(universe);
        
        // Start loading textures in background
        textureService.loadTexturesForObjects(universe.objects);
      } catch (error) {
        console.error('Failed to generate universe:', error);
        setError('Failed to generate universe');
        setShowHyperspace(false);
      }
    }
  };

  const handleObjectClick = (object: CelestialObject) => {
    setSelectedObject(object);
    setViewState(prev => ({
      ...prev,
      selectedObjectId: object.id
    }));
  };

  const handleSearch = (query: string) => {
    const found = objects.find(obj => 
      obj.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (found) {
      handleNavigate({
        type: 'navigate',
        targetId: found.id,
        duration: 2000
      });
    }
  };

  const handleNavigate = (action: NavigationAction) => {
    console.log('🚀 Navigation action received:', action);
    
    const target = objects.find(obj => obj.id.toLowerCase() === action.targetId.toLowerCase());
    
    if (target) {
      console.log('✅ Found target object:', target);
      setSelectedObject(target);
      setViewState(prev => ({
        ...prev,
        selectedObjectId: target.id
      }));
    } else {
      console.error('❌ Target object not found:', action.targetId);
      console.log('Available objects:', objects.map(o => o.id));
    }
  };

  const handleUniverseChange = async (type: string) => {
    // Add dynamic universe types if not already in list
    if (!availableUniverses.includes(type)) {
      setAvailableUniverses(prev => [...prev, type]);
    }
    
    setSelectedObject(null);
    setViewState(initialViewState);
    await loadUniverse(type);
  };

  return (
    <>
      {/* Hyperspace Jump Effect */}
      {showHyperspace && (
        <HyperspaceJump
          universeName={hyperspaceDestination}
          onComplete={() => setShowHyperspace(false)}
        />
      )}
      
      {/* Main App */}
      <div className="relative w-screen h-screen bg-black overflow-hidden">
        {/* 3D Universe */}
        <UniverseView
          objects={objects}
          viewState={viewState}
          onObjectClick={handleObjectClick}
          onViewChange={setViewState}
          selectedObjectId={selectedObject?.id}
        />

        {/* UI Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Bar with Universe Info and Selector */}
          <div className="absolute top-0 left-0 right-0 p-8 pointer-events-auto">
            <div className="flex items-center justify-between">
              {/* Universe Info */}
              <div className="text-white/80">
                <h1 className="text-2xl font-light">{currentUniverse?.name || 'Unknown Universe'}</h1>
                <p className="text-sm text-white/60">{currentUniverse?.description}</p>
                {error && (
                  <p className="text-sm text-yellow-400 mt-1">⚠️ Failed to generate universe</p>
                )}
              </div>
              
              {/* Search Bar
              <div className="flex-1 max-w-md mx-8">
                <SearchBar onSearch={handleSearch} />
              </div> */}
              
              {/* Universe Type Selector */}
              <select
                value={currentUniverse?.type || 'solar-system'}
                onChange={(e) => handleUniverseChange(e.target.value)}
                className="glass px-4 py-2 rounded-lg text-white bg-transparent outline-none cursor-pointer"
              >
                {availableUniverses.map(universeType => (
                  <option key={universeType} value={universeType} className="bg-gray-800">
                    {universeType.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Hint */}
          <div className="absolute top-24 right-8 text-white/40 text-sm">
            Click and drag to explore • Scroll to zoom • Click planets for details
          </div>

          {/* Info Panel */}
          {selectedObject && (
            <div className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-auto">
              <InfoPanel 
                object={selectedObject} 
                onClose={() => setSelectedObject(null)} 
              />
            </div>
          )}

          {/* Chat Interface */}
          <div className="absolute bottom-8 right-8 pointer-events-auto">
            <ChatInterface 
              currentView={viewState}
              onNavigate={handleNavigate}
              onGenerateUniverse={handleUniverseChange}
              currentUniverse={currentUniverse}
              objects={objects}
            />
          </div>

          {/* Narration Controls */}
          {selectedObject && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
              <NarrationControls object={selectedObject} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;