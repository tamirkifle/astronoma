import React, { useState, useEffect } from 'react';
import { UniverseView } from './components/UniverseView';
import { SearchBar } from './components/SearchBar';
import { InfoPanel } from './components/InfoPanel';
import { ChatInterface } from './components/ChatInterface';
import { NarrationControls } from './components/NarrationControls';
import { apiClient } from './services/api';
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

function App() {
  const [objects, setObjects] = useState<CelestialObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<CelestialObject | null>(null);
  const [viewState, setViewState] = useState<ViewState>(initialViewState);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentUniverse, setCurrentUniverse] = useState<GeneratedUniverse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableUniverses, setAvailableUniverses] = useState<string[]>([
    'solar-system',
    'exoplanet-system',
    'binary-system',
    'galaxy-core',
    'fictional'
  ]);

  useEffect(() => {
    // Try to generate a universe, fallback to static if fails
    loadUniverse();

    // Don't disconnect the socket on unmount - we need it for narration
    // Only disconnect when the entire app closes (browser tab closes)
  }, []);

  const loadUniverse = async (type: string = 'solar-system') => {
    try {
      setLoading(true);
      setError(null);
      
      if (type === 'solar-system') {
        // For solar system, try static file first (faster for demo)
        try {
          const data = await apiClient.getUniverse('solar-system');
          setObjects(data.objects);
          setCurrentUniverse({
            id: 'solar-system',
            type: 'solar-system',
            name: 'Our Solar System',
            description: 'The solar system we call home',
            objects: data.objects,
            generated_at: Date.now(),
            parameters_used: {}
          });
        } catch (error) {
          console.error('Failed to load static solar system:', error);
          throw error;
        }
      } else {
        // Generate new universe
        setGenerating(true);
        const universe = await apiClient.generateUniverse({
          universe_type: type as any,
          parameters: {
            size: 'medium',
            complexity: 'moderate',
            style: 'realistic'
          }
        });
        
        setObjects(universe.objects);
        setCurrentUniverse(universe);
      }
      
      setLoading(false);
      setGenerating(false);
    } catch (error) {
      console.error('Failed to load universe:', error);
      setError('Failed to load universe. Using static data as fallback.');
      
      // Fallback to static solar system
      try {
        const data = await apiClient.getUniverse('solar-system');
        setObjects(data.objects);
        setLoading(false);
        setGenerating(false);
      } catch (fallbackError) {
        console.error('Even fallback failed:', fallbackError);
        setError('Failed to load any universe data.');
        setLoading(false);
        setGenerating(false);
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

  if (loading || generating) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <div className="text-white text-xl mb-4">
            {generating ? 'Generating Universe with AI...' : 'Loading Universe...'}
          </div>
          {generating && (
            <div className="text-white/60 text-sm">
              This may take a few moments as we create a unique universe for you
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && objects.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error Loading Universe</div>
          <div className="text-white/60 text-sm">{error}</div>
          <button 
            onClick={() => loadUniverse('solar-system')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
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
                <p className="text-sm text-yellow-400 mt-1">⚠️ Using static data (AI generation failed)</p>
              )}
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <SearchBar onSearch={handleSearch} />
            </div>
            
            {/* Universe Type Selector */}
            <select
              value={currentUniverse?.type || 'solar-system'}
              onChange={(e) => handleUniverseChange(e.target.value)}
              className="glass px-4 py-2 rounded-lg text-white bg-transparent outline-none cursor-pointer"
              disabled={generating}
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
  );
}

export default App;