"""Generates the repeating artboards of the canvas (highlight covers and filling stories).

    python3 tools/build.py

Edit tools/fillings.json to add or change a filling, run this script, then
`node tools/render.mjs Fill-` to get fresh PNGs. Hand-made artboards (logo, «Важно»,
templates, profile) live directly in canvas/project/ and are not touched here.
"""
import json
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
    '&amp;family=Marck+Script&amp;family=Montserrat:wght@400;500;600&amp;display=swap" rel="stylesheet">'
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


def dots(points):
    """Zero-length round-capped strokes render as dots — the doodles use them for crumbs."""
    return "".join(f"M{x} {y}l0 0" for x, y in points)


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


# Doodle icons, 200×200, drawn with `line` strokes; `accent` marks the one red detail.


def heart(cx, cy, s=1.0):
    p = [(0, 20), (-13, 11), (-25, 2), (-24, -10), (-23, -19), (-15, -24), (-8, -21), (-4, -19), (-2, -16), (0, -12),
         (2, -16), (5, -19), (9, -21), (16, -24), (24, -19), (24, -10), (25, 2), (13, 11), (0, 20)]
    pt = [(cx + x * s, cy + y * s) for x, y in p]
    d = f"M{pt[0][0]:.1f} {pt[0][1]:.1f}"
    for i in range(1, len(pt), 3):
        a, b, c = pt[i], pt[i + 1], pt[i + 2]
        d += f"C{a[0]:.1f} {a[1]:.1f} {b[0]:.1f} {b[1]:.1f} {c[0]:.1f} {c[1]:.1f}"
    return d + "Z"


ICONS = {
    "otzyvy": {
        "line": [
            "M46 48C44 36 54 30 66 30L136 29C150 29 158 36 158 49L159 109C159 121 151 128 139 128L92 129L63 156L69 129L64 129C52 129 45 122 45 110Z",
            "M172 36L182 26M178 52L190 51M163 22L165 11",
        ],
        "accent": [heart(101, 84, 1.25)],
    },
    "raboty": {
        "line": [
            "M22 170C64 180 136 180 178 167",
            "M46 99L47 157M154 99L153 157M47 157C78 166 122 166 153 157",
            "M46 99C46 86 154 86 154 99C154 112 46 112 46 99Z",
            "M47 104C48 116 54 121 57 112C59 105 63 106 66 115C69 126 77 125 78 114C79 107 84 107 88 114C92 121 99 120 101 111"
            "C103 106 108 107 111 117C114 127 122 126 123 115C124 108 129 108 132 114C136 121 144 120 146 111C148 106 151 105 153 104",
            "M76 93L76 62L84 62L84 94M97 97L97 55L105 55L105 97M118 94L118 62L126 62L126 93",
            "M80 52C74 46 78 39 80 34C83 40 87 46 80 52ZM101 45C95 39 99 32 101 27C104 33 108 39 101 45ZM122 52C116 46 120 39 122 34C125 40 129 46 122 52Z",
        ],
        "accent": [heart(100, 138, 0.62)],
    },
    "nachinki": {
        "line": [
            "M18 172C70 182 140 180 184 166",
            "M34 93L36 160L122 162L120 93Z",
            "M34 93L120 93L170 62L84 62Z",
            "M120 93L170 62L171 130L122 162",
            "M35 116C50 111 62 121 78 115C94 109 106 120 121 114M35 139C50 134 62 144 78 138C94 132 106 143 122 137",
            "M121 114L170 84M122 137L171 108",
            "M84 80C76 74 82 64 92 68C94 58 110 58 112 68C122 64 128 76 118 82C108 86 94 86 84 80Z",
            "M104 50C106 40 112 34 121 32",
        ],
        "accent": ["M102 46m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"],
    },
    "vazhno": {
        "line": [
            "M48 47L154 41L160 161L54 166Z",
            "M70 82C92 79 118 81 140 77M70 104C96 101 116 104 140 100M70 126C84 124 96 126 108 123",
        ],
        "tape": ["M80 31L125 28L127 53L82 56Z"],
        "accent": [heart(134, 138, 0.62)],
    },
    "deserty": {
        "line": [
            "M38 87L162 86",
            "M46 87L62 168C82 174 118 174 138 168L154 87",
            "M51 113C70 107 88 119 104 113C120 107 136 117 151 111M56 141C72 135 90 147 106 141C122 135 136 145 146 139",
            dots([(72, 125), (92, 129), (122, 126), (84, 154), (112, 157), (128, 151), (66, 98), (98, 99), (134, 97)]),
            "M50 86C42 74 56 64 68 70C66 56 84 50 96 58C106 48 128 54 126 68C140 64 156 74 150 86",
            "M72 79C82 73 92 75 98 81M106 70C114 66 121 68 125 74",
            "M101 31C104 22 112 16 122 14",
        ],
        "accent": ["M100 41m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"],
    },
    "nadpisi": {
        "line": [
            scallop(100, 102, 74, 18),
            "M100 102m-56 0a56 56 0 1 0 112 0a56 56 0 1 0 -112 0",
            "M66 92C72 82 78 100 84 90C90 80 96 100 102 90C108 80 114 100 120 90C125 84 130 86 134 90",
            "M76 114C82 104 88 122 94 112C100 102 106 122 112 112C116 106 121 108 124 112",
        ],
        "accent": [heart(100, 138, 0.5)],
    },
}

COVERS = [
    ("Otzyvy", "otzyvy", "Отзывы"),
    ("Raboty", "raboty", "Работы"),
    ("Nachinki", "nachinki", "Начинки"),
    ("Vazhno", "vazhno", "Важно"),
    ("Deserty", "deserty", "Десерты"),
    ("Nadpisi", "nadpisi", "Надписи"),
]

STYLES = {
    # name: background, ring + line colour, accent fill, tape fill, confetti on/off
    "Cream": (CREAM, CARAMEL, CHERRY, "rgba(173,122,79,0.32)", True),
    "Caramel": (CARAMEL, "#FBF5EC", "#FBF5EC", "rgba(251,245,236,0.38)", False),
}


def icon_svg(key, line, accent, tape, size, x, y, stroke=5.5, label=""):
    ic = ICONS[key]
    parts = []
    for d in ic.get("tape", []):
        parts.append(f'<path d="{d}" fill="{tape}" stroke="none"></path>')
    for d in ic["line"]:
        parts.append(f'<path d="{d}"></path>')
    for d in ic["accent"]:
        parts.append(f'<path d="{d}" fill="{accent}" stroke="{accent}" stroke-width="2"></path>')
    return (
        f'<svg role="img" aria-label="{label}" viewBox="0 0 200 200" width="{size}" height="{size}" '
        f'style="position: absolute; left: {x}px; top: {y}px" fill="none" stroke="{line}" stroke-width="{stroke}" '
        f'stroke-linecap="round" stroke-linejoin="round">{"".join(parts)}</svg>'
    )


def cover(slug, key, label, style):
    bg, line, accent, tape, confetti = STYLES[style]
    confetti_svg = ""
    if confetti:
        confetti_svg = (
            '<svg aria-hidden="true" width="1080" height="1080" style="position: absolute; left: 0; top: 0">'
            f'<circle cx="232" cy="330" r="11" fill="{CONFETTI["y"]}"></circle>'
            f'<circle cx="852" cy="276" r="10" fill="{CONFETTI["b"]}"></circle>'
            f'<circle cx="846" cy="800" r="11" fill="{CONFETTI["g"]}"></circle>'
            f'<circle cx="226" cy="772" r="9" fill="{CONFETTI["r"]}"></circle></svg>'
        )
    body = f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {bg}">
{paper_noise(1080, 1080)}
<svg aria-hidden="true" width="1080" height="1080" style="position: absolute; left: 0; top: 0"><circle cx="540" cy="540" r="468" fill="none" stroke="{line}" stroke-width="5" stroke-dasharray="16 18" stroke-linecap="round"></circle></svg>
{confetti_svg}
{icon_svg(key, line, accent, tape, 700, 190, 186, stroke=6, label=label)}
</div>"""
    return page(f"Обложка — {label}", 1080, 1080, body)


def build_covers():
    for slug, key, label in COVERS:
        for style in STYLES:
            (PROJECT / f"Cover-{slug}-{style}.dc.html").write_text(cover(slug, key, label, style))


if __name__ == "__main__":
    import build_fillings
    import build_profile
    import build_stories

    build_covers()
    build_fillings.build_fillings()
    build_stories.build_stories()
    build_profile.build_profile()
    print("covers and fillings written to", PROJECT)
