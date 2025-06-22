import io
import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from typing import Literal, Tuple, Optional
import random
from noise import pnoise2
import math
import hashlib

class TextureGenerator:
    def __init__(self, width: int = 1024, height: int = 512):
        self.width = width
        self.height = height
        self.texture_dir = "static/textures"
        os.makedirs(self.texture_dir, exist_ok=True)

    def generate_texture(
        self, 
        planet_type: Literal['star', 'rocky', 'gas', 'ice', 'terrestrial'],
        base_color: str,
        name: str,
        temperature: Optional[int] = None
    ) -> dict:
        texture_id = hashlib.md5(f"{name}_{planet_type}_{base_color}".encode()).hexdigest()[:12]
        diffuse_path = f"{self.texture_dir}/{texture_id}_diffuse.jpg"
        if os.path.exists(diffuse_path):
            return {
                'diffuse': f"/textures/{texture_id}_diffuse.jpg",
                'type': planet_type,
                'name': name,
                'cached': True
            }

        rgb = self._hex_to_rgb(base_color)

        if planet_type == 'star':
            diffuse = self._generate_star_texture(rgb)
        elif planet_type == 'gas':
            diffuse = self._generate_gas_texture(rgb)
        elif planet_type == 'rocky':
            diffuse = self._generate_rocky_texture(rgb)
        elif planet_type == 'ice':
            diffuse = self._generate_ice_texture(rgb)
        else:
            diffuse = self._generate_terrestrial_texture()

        diffuse.save(diffuse_path, 'JPEG', quality=90, optimize=True)

        return {
            'diffuse': f"/textures/{texture_id}_diffuse.jpg",
            'type': planet_type,
            'name': name
        }

    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def _generate_star_texture(self, base_rgb: Tuple[int, int, int]) -> Image.Image:
        img = Image.new('RGB', (self.width, self.height))
        pixels = img.load()

        for y in range(self.height):
            for x in range(self.width):
                nx = x / self.width
                ny = y / self.height
                intensity = pnoise2(nx * 10, ny * 10, octaves=3)
                factor = 0.6 + 0.4 * intensity
                pixels[x, y] = tuple(min(255, int(c * factor)) for c in base_rgb)

        return img.filter(ImageFilter.GaussianBlur(1))

    def _generate_gas_texture(self, base_rgb: Tuple[int, int, int]) -> Image.Image:
        img = Image.new('RGB', (self.width, self.height))
        pixels = img.load()

        for y in range(self.height):
            for x in range(self.width):
                f = pnoise2(x / 100.0, y / 100.0, octaves=4)
                factor = 0.8 + 0.3 * f
                pixels[x, y] = tuple(min(255, max(0, int(c * factor))) for c in base_rgb)

        return img.filter(ImageFilter.GaussianBlur(2))

    def _generate_rocky_texture(self, base_rgb: Tuple[int, int, int]) -> Image.Image:
        img = Image.new('RGB', (self.width, self.height))
        pixels = img.load()

        for y in range(self.height):
            for x in range(self.width):
                f = pnoise2(x / 50.0, y / 50.0, octaves=5)
                noise_val = int((f + 1) / 2 * 100) - 50
                r, g, b = [min(255, max(0, c + noise_val)) for c in base_rgb]
                pixels[x, y] = (r, g, b)

        self._add_craters(pixels)
        return img

    def _add_craters(self, pixels):
        for _ in range(50):
            cx = random.randint(0, self.width - 1)
            cy = random.randint(0, self.height - 1)
            radius = random.randint(5, 20)
            for y in range(max(0, cy - radius), min(self.height, cy + radius)):
                for x in range(max(0, cx - radius), min(self.width, cx + radius)):
                    dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                    if dist < radius:
                        darken = int((1 - dist / radius) * 80)
                        r, g, b = pixels[x, y]
                        pixels[x, y] = (max(0, r - darken), max(0, g - darken), max(0, b - darken))

    def _generate_ice_texture(self, base_rgb: Tuple[int, int, int]) -> Image.Image:
        img = Image.new('RGB', (self.width, self.height), (230, 245, 255))
        pixels = img.load()

        for y in range(self.height):
            for x in range(self.width):
                crack = int((pnoise2(x / 20.0, y / 20.0, octaves=6) + 1) * 128)
                pixels[x, y] = (crack, crack, min(255, crack + 20))

        return img.filter(ImageFilter.SMOOTH_MORE)

    def generate_ring_texture(self, base_color: str, opacity: float) -> dict:
        """Generates a texture for a planetary ring system."""
        texture_id = hashlib.md5(f"ring_{base_color}_{opacity}".encode()).hexdigest()[:12]
        ring_path = f"{self.texture_dir}/{texture_id}_ring.png"

        if os.path.exists(ring_path):
            return {'ring': f"/textures/{texture_id}_ring.png", 'cached': True}

        img = Image.new('RGBA', (self.width, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        rgb = self._hex_to_rgb(base_color)
        
        for i in range(self.width):
            # Simulate ring particles and gaps
            if random.random() > 0.1:
                alpha = int((random.uniform(0.5, 1.0) * opacity) * 255)
                color_variation = random.randint(-15, 15)
                final_color = (
                    max(0, min(255, rgb[0] + color_variation)),
                    max(0, min(255, rgb[1] + color_variation)),
                    max(0, min(255, rgb[2] + color_variation)),
                    alpha
                )
                draw.line([(i, 0), (i, 64)], fill=final_color)

        img.save(ring_path, 'PNG')

        return {'ring': f"/textures/{texture_id}_ring.png"}
        
    def _generate_terrestrial_texture(self) -> Image.Image:
        img = Image.new('RGB', (self.width, self.height))
        pixels = img.load()

        for y in range(self.height):
            for x in range(self.width):
                nx = x / self.width
                ny = y / self.height
                noise = pnoise2(nx * 3, ny * 3, octaves=3)
                if noise > 0.1:
                    pixels[x, y] = (34, 139, 34)  # land
                else:
                    pixels[x, y] = (65, 105, 225)  # ocean

        return img
