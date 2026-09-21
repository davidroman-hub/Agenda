"""
Genera las texturas del tablero de notas (corcho, madera del marco, sombras y sombreado del papel).

Requiere Pillow y numpy:  pip3 install pillow numpy
Uso (desde la raíz del proyecto):  python3 scripts/generate-notes-textures.py

Las texturas ya generadas están en assets/images/notes/. Este script solo hace falta para
cambiarles el aspecto; la semilla es fija, así que el resultado es siempre el mismo.
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "images", "notes")
rng = np.random.default_rng(7)


def wrap_blur(array, radius):
    """Desenfoque gaussiano que "da la vuelta" en los bordes, para que la textura encaje al repetirse"""
    fy = np.fft.fftfreq(array.shape[0])[:, None]
    fx = np.fft.rfftfreq(array.shape[1])[None, :]
    kernel = np.exp(-2 * (np.pi * radius) ** 2 * (fx**2 + fy**2))
    return np.fft.irfft2(np.fft.rfft2(array) * kernel, s=array.shape).astype(np.float32)


def wrap_blur_image(image, radius):
    """Lo mismo para una imagen en color: se desenfoca una rejilla de 3x3 copias y se recorta la del centro"""
    tiled = Image.new("RGB", (image.width * 3, image.height * 3))
    for i in range(3):
        for j in range(3):
            tiled.paste(image, (i * image.width, j * image.height))
    blurred = tiled.filter(ImageFilter.GaussianBlur(radius))
    return blurred.crop((image.width, image.height, image.width * 2, image.height * 2))


def mottling(size, radius):
    """Ruido suave (manchas grandes) entre -1 y 1 que se repite sin costuras"""
    noise = rng.random((size, size)).astype(np.float32)
    soft = wrap_blur(noise, radius)
    soft -= soft.mean()
    return soft / (np.abs(soft).max() or 1)


def cork(size):
    """Corcho aglomerado: granos claros y oscuros de distinto tamaño, poros y motas"""
    base = np.array([196, 150, 98], dtype=np.float32)
    canvas = Image.new("RGB", (size, size), tuple(int(v) for v in base))
    draw = ImageDraw.Draw(canvas)
    scale = size / 512

    tones = [
        (214, 172, 118), (205, 160, 106), (190, 143, 92), (178, 130, 82),
        (222, 184, 132), (168, 120, 74), (200, 155, 100), (184, 136, 86),
    ]

    def blob(x, y, w, h, color):
        # Se dibuja también desplazado un tamaño entero: lo que sale por un borde entra por el opuesto
        for dx in (-size, 0, size):
            for dy in (-size, 0, size):
                draw.ellipse([x - w + dx, y - h + dy, x + w + dx, y + h + dy], fill=color)

    # Granos: la base del aspecto de corcho
    for _ in range(int(3600 * scale * scale)):
        x, y = rng.random() * size, rng.random() * size
        radius = (1.5 + rng.random() ** 2 * 6.5) * scale
        color = tones[rng.integers(len(tones))]
        jitter = rng.integers(-7, 8)
        blob(x, y, radius, radius * (0.6 + rng.random() * 0.6), tuple(int(np.clip(c + jitter, 0, 255)) for c in color))

    # Poros oscuros
    for _ in range(int(520 * scale * scale)):
        x, y = rng.random() * size, rng.random() * size
        radius = (0.8 + rng.random() * 2.4) * scale
        shade = int(70 + rng.random() * 40)
        blob(x, y, radius, radius * (0.6 + rng.random() * 0.5), (shade + 30, shade, shade - 25))

    # Motas claras
    for _ in range(int(420 * scale * scale)):
        x, y = rng.random() * size, rng.random() * size
        radius = (0.6 + rng.random() * 1.6) * scale
        blob(x, y, radius, radius, (238, 205, 158))

    pixels = np.asarray(wrap_blur_image(canvas, 0.55 * scale)).astype(np.float32)

    # Manchas suaves de tono + grano fino
    tone = mottling(size, 26 * scale)[..., None] * 11
    grain = rng.normal(0, 4.5, (size, size, 1)).astype(np.float32)
    return Image.fromarray(np.clip(pixels + tone + grain, 0, 255).astype(np.uint8))


def wood(length, thickness):
    """Madera de nogal con la veta a lo largo (horizontal); se repite sin costuras a lo largo"""
    base = np.array([112, 72, 42], dtype=np.float32)
    rows = np.arange(thickness, dtype=np.float32)[:, None]
    cols = np.arange(length, dtype=np.float32)[None, :]

    # Vetas: bandas onduladas de distinto tono
    rings = np.zeros((thickness, length), dtype=np.float32)
    for _ in range(5):
        frequency = rng.uniform(0.35, 1.3)
        phase = rng.uniform(0, 6.28)
        wave_amplitude = rng.uniform(1.5, 5)
        wave_cycles = rng.integers(1, 4)
        wobble = np.sin(cols / length * 2 * np.pi * wave_cycles + rng.uniform(0, 6.28)) * wave_amplitude
        rings += np.sin((rows + wobble) * frequency + phase) * rng.uniform(0.4, 1)
    rings /= 5

    # Fibras finas: ruido muy alargado a lo largo de la veta
    fibers = rng.random((thickness, length)).astype(np.float32)
    fibers = np.mean([np.roll(fibers, shift, axis=1) for shift in range(-9, 10)], axis=0)
    fibers = (fibers - fibers.mean()) * 90

    # Algún nudo tenue: una mancha alargada más oscura
    knots = np.zeros((thickness, length), dtype=np.float32)
    for _ in range(3):
        cx, cy = rng.uniform(0, length), rng.uniform(0, thickness)
        sx, sy = rng.uniform(12, 30), rng.uniform(2, 5)
        dx = np.minimum(np.abs(cols - cx), length - np.abs(cols - cx))
        knots -= np.exp(-((dx / sx) ** 2 + ((rows - cy) / sy) ** 2)) * rng.uniform(8, 18)

    shade = rings * 14 + fibers + knots
    pixels = base[None, None, :] + shade[..., None] * np.array([1.0, 0.85, 0.65])[None, None, :]

    # Luz de canto: el borde superior un poco más claro y el inferior más oscuro (bisel)
    bevel = np.linspace(9, -12, thickness, dtype=np.float32)[:, None, None]
    pixels = pixels + bevel
    return Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8))


def paper_shade(size=96):
    """Sombreado del papel: más oscuro arriba a la derecha y más claro abajo a la izquierda"""
    ys, xs = np.mgrid[0:size, 0:size].astype(np.float32) / (size - 1)
    t = ys * 0.68 + (1 - xs) * 0.32
    dark = np.clip((0.5 - t) / 0.5, 0, 1) ** 1.3 * 0.16
    light = np.clip((t - 0.45) / 0.55, 0, 1) ** 1.2 * 0.26
    out = np.zeros((size, size, 4), dtype=np.uint8)
    out[..., :3] = np.where((t < 0.47)[..., None], 0, 255)
    out[..., 3] = (np.where(t < 0.47, dark, light) * 255).astype(np.uint8)
    return Image.fromarray(out)


def edge_shadow(length=4, depth=24):
    """Sombra que el marco echa sobre el corcho: negra junto al borde y transparente hacia dentro"""
    fade = (1 - np.linspace(0, 1, depth, dtype=np.float32)) ** 2 * 0.42
    out = np.zeros((length, depth, 4), dtype=np.uint8)
    out[..., 3] = (fade[None, :] * 255).astype(np.uint8)
    return Image.fromarray(out)


def save_tiled(image, name, sizes):
    """Guarda la textura a varios tamaños (@1x, @2x, @3x) sin romper la repetición"""
    for suffix, size in sizes.items():
        tiled = Image.new("RGB", (image.width * 3, image.height * 3))
        for i in range(3):
            for j in range(3):
                tiled.paste(image, (i * image.width, j * image.height))
        resized = tiled.resize((size * 3, size * 3), Image.LANCZOS)
        resized.crop((size, size, size * 2, size * 2)).save(os.path.join(OUT, f"{name}{suffix}.png"), optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)

    save_tiled(cork(768), "cork", {"": 256, "@2x": 512, "@3x": 768})

    # Madera: una tira para arriba/abajo (veta horizontal) y otra para los lados (veta vertical)
    horizontal = wood(1024, 28)
    horizontal.save(os.path.join(OUT, "wood-h.png"), optimize=True)
    horizontal.transpose(Image.ROTATE_90).save(os.path.join(OUT, "wood-v.png"), optimize=True)

    paper_shade().save(os.path.join(OUT, "paper-shade.png"), optimize=True)

    # La sombra del marco: una para el borde de arriba (degradado vertical) y otra para el de la
    # izquierda (horizontal); el de abajo y el de la derecha son las mismas, volteadas
    left = edge_shadow()
    left.save(os.path.join(OUT, "edge-left.png"), optimize=True)
    left.transpose(Image.ROTATE_270).transpose(Image.FLIP_LEFT_RIGHT).save(
        os.path.join(OUT, "edge-top.png"), optimize=True
    )


if __name__ == "__main__":
    main()
