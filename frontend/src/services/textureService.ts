import { CelestialObject } from '../types/interfaces';

class TextureService {
  private baseURL: string;
  private textureCache: Map<string, any>;
  private loadingPromises: Map<string, Promise<any>>;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.textureCache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Load textures for multiple objects in batch
   */
  async loadTexturesForObjects(objects: CelestialObject[]): Promise<Map<string, any>> {
    const uncachedObjects = objects.filter(obj => !this.textureCache.has(obj.id));
    
    if (uncachedObjects.length === 0) {
      // All textures are cached
      return this.textureCache;
    }

    // Check if we're already loading these textures
    const cacheKey = uncachedObjects.map(o => o.id).join(',');
    if (this.loadingPromises.has(cacheKey)) {
      await this.loadingPromises.get(cacheKey);
      return this.textureCache;
    }

    // Start loading
    const loadPromise = this.batchLoadTextures(uncachedObjects);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }

    return this.textureCache;
  }

  /**
   * Load textures for a single object
   */
  async loadTextureForObject(object: CelestialObject): Promise<any> {
    if (this.textureCache.has(object.id)) {
      return this.textureCache.get(object.id);
    }

    const textures = await this.loadTexturesForObjects([object]);
    return textures.get(object.id);
  }

  /**
   * Batch load textures from the backend
   */
  private async batchLoadTextures(objects: CelestialObject[]): Promise<void> {
    try {
      console.log(`🎨 Requesting textures for ${objects.length} objects`);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${this.baseURL}/texture/generate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(objects),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to generate textures');
      }

      const results = await response.json();
      console.log('✅ Texture batch response received:', Object.keys(results).length, 'textures');
      
      // Cache the results
      for (const [objectId, textureData] of Object.entries(results)) {
        if (textureData && !(textureData as any).error) {
          this.textureCache.set(objectId, textureData);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('⏱️ Texture generation timed out after 15 seconds');
      } else {
        console.error('❌ Error loading textures:', error);
      }
      // Don't throw - we'll fall back to procedural textures
    }
  }

  /**
   * Get texture data for an object (from cache only)
   */
  getTextureData(objectId: string): any | null {
    return this.textureCache.get(objectId) || null;
  }

  /**
   * Clear texture cache
   */
  clearCache() {
    this.textureCache.clear();
    this.loadingPromises.clear();
  }
}

export const textureService = new TextureService();