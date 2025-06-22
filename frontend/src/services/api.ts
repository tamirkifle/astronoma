import { io, Socket } from 'socket.io-client';
import { 
  CelestialObject, 
  NarrationRequest, 
  NarrationResponse,
  ChatMessage, 
  ChatResponse,
  NavigationAction,
  UniverseGenerationRequest,
  GeneratedUniverse,
  UniverseTemplate
} from '../types/interfaces';

class APIClient {
  private socket: Socket;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    this.socket = io(this.baseURL, {
      transports: ['websocket'], 
      path: '/socket.io/', 
    });
    
    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully! SID:', this.socket.id);
    });

    this.socket.on('connection_established', (data) => {
      console.log('🎉 Server says:', data.message);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('🛑 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message, error.name);
    });
  }

  async getUniverse(id: string): Promise<{ objects: CelestialObject[] }> {
    const response = await fetch(`${this.baseURL}/universe/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch universe data');
    }
    return response.json();
  }

  async generateUniverse(request: UniverseGenerationRequest): Promise<GeneratedUniverse> {
    const response = await fetch(`${this.baseURL}/universe/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate universe');
    }
    
    return response.json();
  }

  async getUniverseTemplates(): Promise<UniverseTemplate[]> {
    const response = await fetch(`${this.baseURL}/universe/templates`);
    if (!response.ok) {
      throw new Error('Failed to fetch universe templates');
    }
    const data = await response.json();
    return data.templates;
  }

  requestNarration(request: NarrationRequest): Promise<NarrationResponse> {
    return new Promise((resolve, reject) => {
      this.socket.emit('request_narration', request);
      
      const timeout = setTimeout(() => {
        reject(new Error('Narration request timeout'));
      }, 10000);
      
      this.socket.once('narration_response', (response: NarrationResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });
      
      this.socket.once('narration_error', (error: any) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  sendChatMessage(message: ChatMessage): Promise<ChatResponse> {
    return new Promise((resolve, reject) => {
      this.socket.emit('chat_message', message);
      
      const timeout = setTimeout(() => {
        reject(new Error('Chat request timeout'));
      }, 5000);
      
      this.socket.once('chat_response', (response: ChatResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });
      
      this.socket.once('chat_error', (error: any) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  onNavigate(callback: (action: NavigationAction) => void) {
    this.socket.on('navigate_to', callback);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export const apiClient = new APIClient();