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
  private socket: Socket | null = null;
  private baseURL: string;
  private connected: boolean = false;
  private socketInitialized: boolean = false;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log('🔌 API client initialized with URL:', this.baseURL);
    // Don't connect socket immediately - wait until needed
  }

  private initializeSocket() {
    if (this.socketInitialized) return;
    
    console.log('🔌 Initializing socket connection...');
    
    this.socket = io(this.baseURL, {
      transports: ['websocket', 'polling'], 
      path: '/socket.io/',
      timeout: 20000, // 20 second timeout
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      autoConnect: false // Don't auto-connect
    });
    
    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully! SID:', this.socket?.id);
      this.connected = true;
    });

    this.socket.on('connection_established', (data) => {
      console.log('🎉 Server says:', data.message);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('🛑 Socket disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.connected = false;
    });
    
    this.socketInitialized = true;
  }

  private ensureSocketConnected(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket) {
        this.initializeSocket();
      }
      
      if (this.connected) {
        resolve();
        return;
      }
      
      if (this.socket) {
        console.log('🔌 Connecting socket...');
        this.socket.connect();
        
        // Wait for connection or timeout
        const timeout = setTimeout(() => {
          console.warn('⚠️ Socket connection timeout, proceeding anyway');
          resolve();
        }, 5000);
        
        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async getUniverse(id: string): Promise<{ objects: CelestialObject[] }> {
    const url = `${this.baseURL}/universe/${id}`;
    console.log('🌌 Fetching universe from:', url);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server response:', response.status, errorText);
        throw new Error(`Failed to fetch universe: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Universe data received, objects:', data.objects?.length || 0);
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ Network error - is the backend running on port 3000?');
        throw new Error('Cannot connect to backend. Make sure the server is running on port 3000.');
      }
      throw error;
    }
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
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureSocketConnected();
        
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }
        
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
      } catch (error) {
        reject(error);
      }
    });
  }

  sendChatMessage(message: ChatMessage & { universe_id?: string }): Promise<ChatResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureSocketConnected();
        
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }
        
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
      } catch (error) {
        reject(error);
      }
    });
  }

  onNavigate(callback: (action: NavigationAction) => void) {
    // Initialize socket if needed
    if (!this.socket) {
      this.initializeSocket();
    }
    
    if (this.socket) {
      this.socket.on('navigate_to', callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.socketInitialized = false;
      this.connected = false;
    }
  }
  
  isConnected(): boolean {
    return this.connected;
  }
}

export const apiClient = new APIClient();