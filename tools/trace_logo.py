"""Rebuilds the original Dessertopia avatar (wine heart-cake drawing + «dessertopia» on a light circle) as vectors
from the first profile screenshot, and writes it with a brown outline on the drawing.

    python3 tools/trace_logo.py path/to/screenshot.png

Writes assets/logo/original-*.svg: the drawing and the lettering as separate paths, so the outline goes only
around the drawing. Two outline kinds: «line» — a thin edge along every stroke of the drawing,
«contour» — one line around the whole heart-cake silhouette. «linii» repaints the drawing itself brown.
"""
import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
BOX = (207, 774, 1000, 1567)          # the avatar circle in the screenshot
TEXT_TOP = 1308 - BOX[1]              # first row of «dessertopia»; the drawing ends above it
SCALE = 4                             # trace at 4× for smooth curves
WINE, BG = "#791626", "#E9E4E3"
BROWNS = {"svetlo": "#B07A50", "temno": "#4A2E24"}


def to_path(mask):
    curves = potrace.Bitmap(mask).trace(turdsize=30 * SCALE, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                                        alphamax=1.0, opticurve=True, opttolerance=0.3)
    out = []
    for c in curves:
        d = [f"M{c.start_point.x / SCALE:.2f},{c.start_point.y / SCALE:.2f}"]
        for s in c.segments:
            if s.is_corner:
                d.append(f"L{s.c.x / SCALE:.2f},{s.c.y / SCALE:.2f}L{s.end_point.x / SCALE:.2f},{s.end_point.y / SCALE:.2f}")
            else:
                d.append(f"C{s.c1.x / SCALE:.2f},{s.c1.y / SCALE:.2f} {s.c2.x / SCALE:.2f},{s.c2.y / SCALE:.2f} "
                         f"{s.end_point.x / SCALE:.2f},{s.end_point.y / SCALE:.2f}")
        out.append("".join(d) + "Z")
    return "".join(out)


def main(screenshot):
    im = Image.open(screenshot).convert("RGB").crop(BOX)
    big = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS).filter(ImageFilter.GaussianBlur(SCALE * 0.5))
    a = np.asarray(big).astype(int)
    # how far each pixel is from the light background: catches the anti-aliased hairlines of the serifs too
    ink = (233 + 228 + 227) - a.sum(axis=2)
    split = TEXT_TOP * SCALE
    drawing = (a[..., 0] - a[..., 1] > 55) & (a[..., 1] < 150)
    drawing[split:] = False
    text = ink > 150
    text[:split] = False
    # potrace treats True as background here, as in tools/build.py's tracer
    d_draw, d_text = to_path(~drawing), to_path(~text)

    # silhouette: close the line drawing into one shape, then take its outline
    shape = ndimage.binary_fill_holes(ndimage.binary_dilation(drawing[::SCALE, ::SCALE], iterations=12))
    shape = ndimage.binary_dilation(shape, iterations=6)
    soft = np.asarray(Image.fromarray(np.uint8(shape) * 255).resize((shape.shape[1] * SCALE, shape.shape[0] * SCALE), Image.BICUBIC)
                      .filter(ImageFilter.GaussianBlur(SCALE * 4))) > 127
    ring = soft & ~ndimage.binary_erosion(soft, iterations=9 * SCALE)
    d_ring = to_path(~ring)

    size = BOX[2] - BOX[0]
    out = ROOT / "assets" / "logo"
    out.mkdir(parents=True, exist_ok=True)
    head = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
    base = f'<rect width="{size}" height="{size}" fill="{BG}"/>'
    text_el = f'<path fill="{WINE}" fill-rule="evenodd" d="{d_text}"/>'
    (out / "original.svg").write_text(f'{head}{base}<path fill="{WINE}" fill-rule="evenodd" d="{d_draw}"/>{text_el}</svg>')
    for name, brown in BROWNS.items():
        line = (f'<path fill="{WINE}" fill-rule="evenodd" stroke="{brown}" stroke-width="6" stroke-linejoin="round" '
                f'paint-order="stroke" d="{d_draw}"/>')
        (out / f"original-obvodka-{name}.svg").write_text(f"{head}{base}{line}{text_el}</svg>")
        contour = f'<path fill="{brown}" fill-rule="evenodd" d="{d_ring}"/><path fill="{WINE}" fill-rule="evenodd" d="{d_draw}"/>'
        (out / f"original-kontur-{name}.svg").write_text(f"{head}{base}{contour}{text_el}</svg>")
        recolor = f'<path fill="{brown}" fill-rule="evenodd" d="{d_draw}"/>'
        (out / f"original-linii-{name}.svg").write_text(f"{head}{base}{recolor}{text_el}</svg>")
    print("written to", out)


if __name__ == "__main__":
    main(sys.argv[1])
