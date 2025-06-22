// frontend/scripts/generatePlaceholderTextures.js
// Run this with: node scripts/generatePlaceholderTextures.js

const fs = import('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// You'll need to install canvas: npm install canvas

const planets = [
  { name: 'sun', color: '#FDB813', type: 'star' },
  { name: 'mercury', color: '#8C7853', type: 'rocky' },
  { name: 'venus', color: '#FFC649', type: 'rocky' },
  { name: 'earth', color: '#4169E1', type: 'terrestrial' },
  { name: 'mars', color: '#CD5C5C', type: 'rocky' },
  { name: 'jupiter', color: '#DAA520', type: 'gas' },
  { name: 'saturn', color: '#F4A460', type: 'gas' },
  { name: 'uranus', color: '#4FD0E0', type: 'ice' },
  { name: 'neptune', color: '#4169E1', type: 'ice' }
];

// Create directories
const textureDir = path.join(__dirname, '../public/textures/planets');
fs.mkdirSync(textureDir, { recursive: true });

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function generatePlanetTexture(planet) {
  const width = 2048;
  const height = 1024;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const rgb = hexToRgb(planet.color);
  
  // Base color
  ctx.fillStyle = planet.color;
  ctx.fillRect(0, 0, width, height);
  
  // Add some variation
  if (planet.type === 'gas') {
    // Create bands for gas giants
    for (let i = 0; i < height; i += 20) {
      const opacity = Math.random() * 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fillRect(0, i, width, 10);
    }
  } else if (planet.type === 'rocky') {
    // Add noise for rocky planets
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    
    ctx.putImageData(imageData, 0, 0);
  } else if (planet.type === 'terrestrial') {
    // Create continents for Earth-like planets
    ctx.fillStyle = '#228B22';
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 200 + 100;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Save diffuse map
  const buffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync(path.join(textureDir, `${planet.name}_diffuse.jpg`), buffer);
  console.log(`Created ${planet.name}_diffuse.jpg`);
  
  // Create a simple normal map (blue-ish)
  ctx.fillStyle = '#8080FF';
  ctx.fillRect(0, 0, width, height);
  
  // Add some detail
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 50 + 10;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, '#9090FF');
    gradient.addColorStop(1, '#8080FF');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const normalBuffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync(path.join(textureDir, `${planet.name}_normal.jpg`), normalBuffer);
  console.log(`Created ${planet.name}_normal.jpg`);
}

// Generate textures for all planets
planets.forEach(planet => {
  generatePlanetTexture(planet);
});

console.log('\nPlaceholder textures generated successfully!');
console.log('You can replace these with real textures from:');
console.log('- https://www.solarsystemscope.com/textures/');
console.log('- https://planetpixelemporium.com/');
console.log('- NASA\'s Scientific Visualization Studio');