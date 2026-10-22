"""Crops and colour-grades the photos used on the highlight covers into assets/highlights/.

    python3 tools/prep_highlights.py

Every photo gets the same warm film grade (softer saturation, warm shift, lifted blacks, light grain),
so covers made from different sources read as one set.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "highlights"

# name: (source, crop box or None for the whole image)
SOURCES = {
    "otzyvy-konvert": ("assets/ai/hl-konvert.jpg", None),
    "otzyvy-malina": ("assets/ai/hl-malina.jpg", None),
    "nachinki-srez": ("assets/ai/hl-srez.jpg", None),
    "nachinki-banan": ("assets/ai/nachinka-banan.jpg", (318, 300, 708, 690)),
    "vazhno-barkhat": ("assets/ai/nachinka-barkhat.jpg", (300, 290, 722, 712)),
    "raboty-chai": ("assets/photos/cake-vremya-pit-chai.jpg", (30, 340, 930, 1240)),
    "deserty-trifl": ("assets/photos/trifle-vanilla.jpg", (0, 120, 520, 640)),
    "deserty-karamel": ("assets/photos/trifle-karamel-box.jpg", (0, 36, 302, 338)),
}


def grade(im, seed):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    a = lum[..., None] + (a - lum[..., None]) * 0.86
    a *= np.array([1.03, 1.0, 0.93], dtype=np.float32)
    a = 16 + a * 0.94
    a += np.random.default_rng(seed).normal(0, 3.5, a.shape[:2])[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (name, (src, box)) in enumerate(SOURCES.items()):
        im = Image.open(ROOT / src)
        if box:
            im = im.crop(box)
        im = im.resize((1080, 1080), Image.LANCZOS)
        grade(im, i).save(OUT / f"{name}.jpg", quality=92)
        print(name)


if __name__ == "__main__":
    main()
