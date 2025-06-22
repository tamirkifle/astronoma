export interface CelestialObject {
  id: string;
  name: string;
  type: 'planet' | 'star' | 'moon';
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
}

export interface ChatResponse {
  text: string;
  action?: NavigationAction;
}

export interface NavigationAction {
  type: 'navigate';
  targetId: string;
  duration: number;
}

export interface ViewState {
  cameraPosition: [number, number, number];
  lookAt: [number, number, number];
  selectedObjectId?: string;
}
