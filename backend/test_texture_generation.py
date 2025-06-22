#!/usr/bin/env python3
"""
Test texture generation directly
Run with: python test_texture_generation.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.texture_generator import TextureGenerator
from PIL import Image
import io
import base64

def save_base64_image(base64_data: str, filename: str):
    """Save base64 image data to file"""
    # Remove data URL prefix
    if ',' in base64_data:
        base64_data = base64_data.split(',')[1]
    
    # Decode and save
    img_data = base64.b64decode(base64_data)
    with open(filename, 'wb') as f:
        f.write(img_data)

def test_texture_generation():
    """Test all texture types"""
    generator = TextureGenerator()
    
    # Create output directory
    output_dir = "test_textures"
    os.makedirs(output_dir, exist_ok=True)
    
    # Test cases
    test_cases = [
        {
            'name': 'Sun',
            'type': 'star',
            'color': '#FDB813',
            'temp': 5778
        },
        {
            'name': 'Rocky Planet',
            'type': 'rocky',
            'color': '#8C7853',
            'temp': 400
        },
        {
            'name': 'Gas Giant',
            'type': 'gas',
            'color': '#DAA520',
            'temp': 165
        },
        {
            'name': 'Ice World',
            'type': 'ice',
            'color': '#4FD0E0',
            'temp': 80
        },
        {
            'name': 'Earth-like',
            'type': 'terrestrial',
            'color': '#4169E1',
            'temp': 288
        }
    ]
    
    print("🎨 Generating textures...")
    print("-" * 50)
    
    for test in test_cases:
        print(f"\n📍 Generating {test['name']} ({test['type']})...")
        
        try:
            # Generate texture
            result = generator.generate_texture(
                planet_type=test['type'],
                base_color=test['color'],
                name=test['name'],
                temperature=test['temp']
            )
            
            # Save diffuse map
            if 'diffuse' in result:
                filename = os.path.join(output_dir, f"{test['name'].lower().replace(' ', '_')}_diffuse.jpg")
                save_base64_image(result['diffuse'], filename)
                print(f"   ✅ Diffuse map saved: {filename}")
            
            # Save normal map
            if 'normal' in result:
                filename = os.path.join(output_dir, f"{test['name'].lower().replace(' ', '_')}_normal.jpg")
                save_base64_image(result['normal'], filename)
                print(f"   ✅ Normal map saved: {filename}")
            
            # Save emissive map (stars only)
            if 'emissive' in result:
                filename = os.path.join(output_dir, f"{test['name'].lower().replace(' ', '_')}_emissive.jpg")
                save_base64_image(result['emissive'], filename)
                print(f"   ✅ Emissive map saved: {filename}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
            import traceback
            traceback.print_exc()
    
    # Test ring texture
    print(f"\n📍 Generating ring texture...")
    try:
        ring_result = generator.generate_ring_texture('#DEB887', 0.8)
        if 'ring' in ring_result:
            filename = os.path.join(output_dir, "saturn_rings.png")
            save_base64_image(ring_result['ring'], filename)
            print(f"   ✅ Ring texture saved: {filename}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "-" * 50)
    print(f"✅ Test complete! Check the '{output_dir}' directory for generated textures.")
    print("\nYou can open the images with any image viewer to see the results.")

if __name__ == "__main__":
    test_texture_generation()