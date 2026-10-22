"""Cuts the food out of its background for the highlight covers, into assets/cutouts/*.png.

    pip install rembg onnxruntime scipy
    python3 tools/cutouts.py

Uses rembg with the isnet-general-use model (downloaded to ~/.u2net on first run), then keeps only the main
object: faint alpha is dropped, the largest connected piece is kept, and optional boxes trim the rest.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "cutouts"

# name: (source, keep-only box in source pixels or None, rows to trim (top, bottom) after cutting)
SOURCES = {
    "malina-piala": ("assets/ai/hl-malina.jpg", (0, 0, 838, 1024), (0, 0)),
    "krasnyj-barkhat": ("assets/ai/nachinka-barkhat.jpg", (250, 150, 780, 885), (15, 49)),
    "banan-karamel": ("assets/ai/nachinka-banan.jpg", (300, 205, 740, 860), (0, 0)),
    "trifl": ("assets/photos/trifle-vanilla.jpg", None, (0, 0)),
    "bento": ("assets/photos/bento-budh-schastliva.jpg", None, (0, 0)),
    "tort-chai": ("assets/photos/cake-vremya-pit-chai.jpg", None, (0, 0)),
    "trifly-karamel": ("assets/photos/trifle-karamel-box.jpg", None, (0, 0)),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    session = new_session("isnet-general-use")
    for name, (src, box, (top, bottom)) in SOURCES.items():
        a = np.asarray(remove(Image.open(ROOT / src).convert("RGB"), session=session)).copy()
        if box:
            x0, y0, x1, y1 = box
            keep = np.zeros(a.shape[:2], bool)
            keep[y0:y1, x0:x1] = True
            a[~keep, 3] = 0
        a[a[..., 3] < 30, 3] = 0
        labels, n = ndimage.label(a[..., 3] > 0)
        sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
        a[labels != np.argmax(sizes) + 1, 3] = 0
        im = Image.fromarray(a)
        im = im.crop(im.getchannel("A").getbbox())
        im.thumbnail((1000, 1000), Image.LANCZOS)
        im = im.crop((0, top, im.width, im.height - bottom))
        im.save(OUT / f"{name}.png", optimize=True)
        print(name, im.size)


if __name__ == "__main__":
    main()
