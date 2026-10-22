"""Generates the artboards of the canvas: shared palette and helpers here, each group in its build_*.py.

    python3 tools/build.py

Edit tools/fillings.json to add or change a filling, run this script, then
`node tools/render.mjs Fill-` to get fresh PNGs. Hand-made artboards (logo, «Важно»,
templates, profile) live directly in canvas/project/ and are not touched here.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT / "canvas" / "project"

# Palette taken from the «Сладкий архив» posts.
CREAM = "#F1E9DE"
PAPER = "#FFFCF6"
INK = "#2E2019"
COCOA = "#4A2E24"
HAND = "#5C3B2B"
CARAMEL = "#AD7A4F"
CARAMEL_TEXT = "#8A5634"
CHERRY = "#C2363B"
RULE = "#D8CBBB"
CONFETTI = {"y": "#E8B523", "b": "#3AA0D8", "g": "#8CC43F", "r": "#E2453A"}

FONTS = (
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500'
    '&amp;family=Marck+Script&amp;family=Montserrat:wght@400;500;600&amp;family=Great+Vibes&amp;family=Lobster'
    '&amp;family=Playfair+Display+SC&amp;family=Tenor+Sans&amp;display=swap" rel="stylesheet">'
)


def page(title, w, h, body):
    return f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>body{{margin:0}}</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""


def paper_noise(w, h, opacity="0.09"):
    return (
        f'<svg aria-hidden="true" width="{w}" height="{h}" style="position: absolute; left: 0; top: 0">'
        '<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"></feTurbulence>'
        f'<feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.24  0 0 0 {opacity} 0"></feColorMatrix></filter>'
        '<rect width="100%" height="100%" filter="url(#paper)"></rect></svg>'
    )


def scallop(cx, cy, r, n, bump=9):
    """A piped cream border seen from above: n bumps around a circle."""
    import math
    pts = [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n + 1)]
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        c = (cx + (r + bump) * math.cos(a), cy + (r + bump) * math.sin(a))
        d += f"Q{c[0]:.1f} {c[1]:.1f} {pts[i + 1][0]:.1f} {pts[i + 1][1]:.1f}"
    return d + "Z"


def heart(cx, cy, s=1.0):
    p = [(0, 20), (-13, 11), (-25, 2), (-24, -10), (-23, -19), (-15, -24), (-8, -21), (-4, -19), (-2, -16), (0, -12),
         (2, -16), (5, -19), (9, -21), (16, -24), (24, -19), (24, -10), (25, 2), (13, 11), (0, 20)]
    pt = [(cx + x * s, cy + y * s) for x, y in p]
    d = f"M{pt[0][0]:.1f} {pt[0][1]:.1f}"
    for i in range(1, len(pt), 3):
        a, b, c = pt[i], pt[i + 1], pt[i + 2]
        d += f"C{a[0]:.1f} {a[1]:.1f} {b[0]:.1f} {b[1]:.1f} {c[0]:.1f} {c[1]:.1f}"
    return d + "Z"


def doily(cx, cy, r, paper=PAPER, hole=CARAMEL):
    """A lace doily: scalloped edge, rings of cut-out eyelets and petals, plain centre (radius ≈ 0.6r)."""
    import math
    out = [f'<path d="{scallop(cx, cy, r * 0.965, 56, r * 0.04)}" fill="{paper}"></path>']
    for i in range(56):
        a = 2 * math.pi * (i + 0.5) / 56
        out.append(f'<circle cx="{cx + r * 0.9 * math.cos(a):.1f}" cy="{cy + r * 0.9 * math.sin(a):.1f}" r="{r * 0.016:.1f}" fill="{hole}"></circle>')
    for i in range(28):
        a = 360 * i / 28
        x, y = cx + r * 0.79 * math.cos(math.radians(a)), cy + r * 0.79 * math.sin(math.radians(a))
        out.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r * 0.055:.1f}" ry="{r * 0.02:.1f}" fill="{hole}" transform="rotate({a:.1f} {x:.1f} {y:.1f})"></ellipse>')
    for i in range(42):
        a = 2 * math.pi * (i + 0.5) / 42
        out.append(f'<circle cx="{cx + r * 0.69 * math.cos(a):.1f}" cy="{cy + r * 0.69 * math.sin(a):.1f}" r="{r * 0.009:.1f}" fill="{hole}"></circle>')
    out.append(f'<path d="{scallop(cx, cy, r * 0.62, 30, r * 0.025)}" fill="none" stroke="{hole}" stroke-width="{r * 0.007:.1f}" opacity="0.55"></path>')
    return "".join(out)


def lace_logo():
    body = f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {CARAMEL}">
{paper_noise(1080, 1080)}
<svg aria-hidden="true" width="1080" height="1080" style="position: absolute; left: 0; top: 0">{doily(540, 540, 510)}</svg>
<img src="/_blob/a9eac0041f17fa83168692c9ca4fcb63" alt="Торт-сердце на кружевной салфетке" style="position: absolute; left: 322px; top: 334px; width: 436px">
</div>"""
    return page("Аватар — кружевная салфетка", 1080, 1080, body)


def build_doily_logo():
    (PROJECT / "Logo-8-Doily.dc.html").write_text(lace_logo())


if __name__ == "__main__":
    import build_fillings
    import build_highlights
    import build_logos
    import build_pinned
    import build_profile
    import build_stories

    build_doily_logo()
    build_highlights.build_highlights()
    build_fillings.build_fillings()
    build_stories.build_stories()
    build_pinned.build_pinned()
    build_logos.build_logos()
    build_profile.build_profile()
    print("artboards written to", PROJECT)
