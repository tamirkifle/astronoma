export interface CelestialObject {
  id: string;
  name: string;
  type: 'planet' | 'star' | 'moon' | 'asteroid' | 'comet' | 'black_hole' | 'nebula';
  position: [number, number, number];
  size: number;
  color: string;
  texture?: string;
  info: ObjectInfo;
  narrationPrompt: string;
}

export interface ObjectInfo {
  distance: string;
  temp: string;
  moons?: number;
  atmosphere?: string;
  magnitude?: string;
  interesting_fact?: string;
}

export interface NarrationRequest {
  objectId: string;
  language: 'en' | 'es' | 'fr' | 'hi';
}

export interface NarrationResponse {
  objectId: string;
  text: string;
  language: string;
}

export interface ChatMessage {
  message: string;
  currentView: ViewState;
  timestamp: number;
  universeContext?: {
    universeName: string;
    universeType: string;
    objects: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  };
}

export interface NavigationAction {
  type: 'navigate';
  targetId: string;
  duration: number;
}

export interface GenerateUniverseAction {
  type: 'generate_universe';
  universe_type: string;
  parameters?: Record<string, any>;
}

export interface ChatResponse {
  text: string;
  action?: NavigationAction | GenerateUniverseAction;
}

export interface ViewState {
  cameraPosition: [number, number, number];
  lookAt: [number, number, number];
  selectedObjectId?: string;
}

// Universe generation types
export interface UniverseGenerationRequest {
  universe_type: 'solar-system' | 'exoplanet-system' | 'galaxy-core' | 'fictional' | 'binary-system' | string;
  parameters?: UniverseGenerationParameters;
}

export interface UniverseGenerationParameters {
  size?: 'small' | 'medium' | 'large';
  complexity?: 'simple' | 'moderate' | 'complex';
  style?: 'realistic' | 'educational' | 'fantastical';
  theme?: string;
  num_objects?: number;
}

export interface GeneratedUniverse {
  id: string;
  type: string;
  name: string;
  description: string;
  objects: CelestialObject[];
  generated_at: number;
  parameters_used: Record<string, any>;
}

export interface UniverseTemplate {
  id: string;
  name: string;
  description: string;
  preview_image?: string;
}