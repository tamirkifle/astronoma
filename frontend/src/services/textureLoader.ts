import * as THREE from 'three';

export interface TextureSet {
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  bumpMap?: THREE.Texture;
  specularMap?: THREE.Texture;
  emissiveMap?: THREE.Texture;
}

class TextureLoaderService {
  private loader: THREE.TextureLoader;
  private textureCache: Map<string, THREE.Texture>;
  private loadingPromises: Map<string, Promise<THREE.Texture>>;

  constructor() {
    this.loader = new THREE.TextureLoader();
    this.textureCache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Load a single texture with caching
   */
  async loadTexture(url: string): Promise<THREE.Texture> {
    // Check cache first
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading
    const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          // Configure texture for planets
          texture.encoding = THREE.sRGBEncoding;
          texture.anisotropy = 16;
          
          // Cache the texture
          this.textureCache.set(url, texture);
          this.loadingPromises.delete(url);
          
          resolve(texture);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(url);
          console.error(`Failed to load texture: ${url}`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Load a complete texture set for a celestial object
   */
  async loadTextureSet(baseName: string): Promise<TextureSet> {
    const textureSet: TextureSet = {};
    const baseUrl = `/textures/planets/${baseName}`;

    try {
      // Load main texture
      textureSet.map = await this.loadTexture(`${baseUrl}_diffuse.jpg`);
    } catch (e) {
      console.warn(`No diffuse map for ${baseName}`);
    }

    // Try to load additional maps (these are optional)
    const optionalMaps = [
      { key: 'normalMap', suffix: '_normal.jpg' },
      { key: 'bumpMap', suffix: '_bump.jpg' },
      { key: 'specularMap', suffix: '_specular.jpg' },
      // Commenting out emissiveMap for planets - only stars need it
      // { key: 'emissiveMap', suffix: '_emissive.jpg' }
    ];

    for (const { key, suffix } of optionalMaps) {
      try {
        (textureSet as any)[key] = await this.loadTexture(`${baseUrl}${suffix}`);
      } catch (e) {
        // Optional maps may not exist, that's okay
      }
    }

    return textureSet;
  }

  /**
   * Generate a simple texture for objects without custom textures
   */
  generateProceduralTexture(color: string, type: 'rocky' | 'gas' | 'ice' | 'metallic' = 'rocky'): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some variation based on type
    switch (type) {
      case 'rocky':
        this.addRockyTexture(ctx, color);
        break;
      case 'gas':
        this.addGasTexture(ctx, color);
        break;
      case 'ice':
        this.addIceTexture(ctx, color);
        break;
      case 'metallic':
        this.addMetallicTexture(ctx, color);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private addRockyTexture(ctx: CanvasRenderingContext2D, baseColor: string) {
    // Add noise for rocky appearance
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      data[i] += noise;     // R
      data[i + 1] += noise; // G
      data[i + 2] += noise; // B
    }

    ctx.putImageData(imageData, 0, 0);

    // Add some craters
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * ctx.canvas.width;
      const y = Math.random() * ctx.canvas.height;
      const radius = Math.random() * 20 + 5;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`;
      ctx.fill();
    }
  }

  private addGasTexture(ctx: CanvasRenderingContext2D, baseColor: string) {
    // Create bands for gas giants
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    const color = new THREE.Color(baseColor);
    
    for (let i = 0; i < 10; i++) {
      const offset = i / 10;
      const variation = (Math.random() - 0.5) * 0.2;
      const bandColor = color.clone();
      bandColor.offsetHSL(variation, 0, variation * 0.5);
      gradient.addColorStop(offset, bandColor.getStyle());
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Add some turbulence
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * ctx.canvas.width;
      const y = Math.random() * ctx.canvas.height;
      const width = Math.random() * 100 + 50;
      const height = Math.random() * 20 + 5;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
      ctx.fillRect(-width/2, -height/2, width, height);
      ctx.restore();
    }
  }

  private addIceTexture(ctx: CanvasRenderingContext2D, baseColor: string) {
    // Add icy cracks and patterns
    const gradient = ctx.createRadialGradient(
      ctx.canvas.width/2, ctx.canvas.height/2, 0,
      ctx.canvas.width/2, ctx.canvas.height/2, ctx.canvas.width/2
    );
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, '#E0F7FA');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Add cracks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * ctx.canvas.width, Math.random() * ctx.canvas.height);
      
      for (let j = 0; j < 5; j++) {
        ctx.lineTo(
          Math.random() * ctx.canvas.width,
          Math.random() * ctx.canvas.height
        );
      }
      ctx.stroke();
    }
  }

  private addMetallicTexture(ctx: CanvasRenderingContext2D, baseColor: string) {
    // Create metallic sheen
    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
    const color = new THREE.Color(baseColor);
    
    gradient.addColorStop(0, color.clone().multiplyScalar(0.7).getStyle());
    gradient.addColorStop(0.5, color.getStyle());
    gradient.addColorStop(1, color.clone().multiplyScalar(1.3).getStyle());
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Add some scratches
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < 100; i++) {
      ctx.beginPath();
      const startX = Math.random() * ctx.canvas.width;
      const startY = Math.random() * ctx.canvas.height;
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + Math.random() * 50, startY + Math.random() * 10 - 5);
      ctx.stroke();
    }
  }

  /**
   * Create star texture
   */
  createStarTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Create radial gradient for star
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 250, 200, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 200, 50, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Add some corona effects
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2;
      const length = Math.random() * 100 + 150;
      const width = Math.random() * 3 + 1;
      
      ctx.save();
      ctx.translate(256, 256);
      ctx.rotate(angle);
      ctx.fillStyle = `rgba(255, 200, 0, ${Math.random() * 0.3})`;
      ctx.fillRect(0, -width/2, length, width);
      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Clear texture cache
   */
  clearCache() {
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Load textures from generated data
   */
  loadFromGeneratedData(textureData: any): TextureSet {
    const textureSet: TextureSet = {};
    
    // Check if we have URLs instead of base64
    if (textureData.diffuse) {
      if (textureData.diffuse.startsWith('/') || textureData.diffuse.startsWith('http')) {
        // It's a URL
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const fullURL = textureData.diffuse.startsWith('http') 
          ? textureData.diffuse 
          : `${baseURL}${textureData.diffuse}`;
        
        textureSet.map = this.loader.load(fullURL);
        textureSet.map.encoding = THREE.sRGBEncoding;
      } else if (textureData.diffuse.startsWith('data:')) {
        // It's base64
        textureSet.map = this.createTextureFromBase64(textureData.diffuse);
      }
    }
    
    if (textureData.normal) {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const fullURL = textureData.normal.startsWith('http') 
        ? textureData.normal 
        : `${baseURL}${textureData.normal}`;
      textureSet.normalMap = this.loader.load(fullURL);
    }
    
    if (textureData.emissive) {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const fullURL = textureData.emissive.startsWith('http') 
        ? textureData.emissive 
        : `${baseURL}${textureData.emissive}`;
      textureSet.emissiveMap = this.loader.load(fullURL);
    }
    
    return textureSet;
  }

  /**
   * Create texture from base64 data
   */
  createTextureFromBase64(base64Data: string): THREE.Texture {
    const texture = new THREE.Texture();
    const image = new Image();
    
    image.onload = () => {
      texture.image = image;
      texture.needsUpdate = true;
      texture.encoding = THREE.sRGBEncoding;
      texture.anisotropy = 16;
    };
    
    image.src = base64Data;
    
    return texture;
  }
}

export const textureLoader = new TextureLoaderService();