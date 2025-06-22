import React, { useState, useEffect } from 'react';
import { UniverseView } from './components/UniverseView';
import { SearchBar } from './components/SearchBar';
import { InfoPanel } from './components/InfoPanel';
import { ChatInterface } from './components/ChatInterface';
import { NarrationControls } from './components/NarrationControls';
import { apiClient } from './services/api';
import { CelestialObject, ViewState, NavigationAction } from './types/interfaces';
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

  useEffect(() => {
    // Load universe data
    const loadUniverse = async () => {
      try {
        const data = await apiClient.getUniverse('solar-system');
        setObjects(data.objects);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load universe:', error);
        setLoading(false);
      }
    };

    loadUniverse();

    // Cleanup
    return () => {
      apiClient.disconnect();
    };
  }, []);

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
    const target = objects.find(obj => obj.id === action.targetId);
    if (target) {
      setSelectedObject(target);
      // The UniverseView component will handle the actual camera movement
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white text-xl">Loading Universe...</div>
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
        {/* Search Bar */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Navigation Hint */}
        <div className="absolute top-8 right-8 text-white/40 text-sm">
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
