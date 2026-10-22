"""Highlight covers, 1080×1080, after the original covers: a light clean background, the food cut out on it,
thin high-contrast editorial type. Each cover keeps its original idea —
«Отзывы»: word on top, berries below; «Работы»: the DESS/ERTO/PIA letter stack; «Начинки»: desserts only;
«Важно»: a red velvet slice with the word piped on it — in the new palette.

Cut-outs come from tools/cutouts.py. Run `python3 tools/build.py` (it calls this module).
"""
import math

from build import COCOA, PROJECT, page

CUT = {
    "malina": "/_blob/6e337375aa197f5ae76500d2a2c56f08", "barkhat": "/_blob/aa09a6fc09ca924ef383f077895fb3af",
    "banan": "/_blob/d67acf0d705c6ffc2d5a67853c319c83", "trifl": "/_blob/1b632c4ee3f7a61c0409caf9cd45dc04",
    "bento": "/_blob/458622d8f8bc36bd55cb9fe424af4ed3",
}
IVORY = "#FAF7F2"
CONDENSED = "font-family: 'Oranienbaum', 'Playfair Display', serif"
BODONI = "'Bodoni Moda', 'Playfair Display', serif"
SHADOW = "filter: drop-shadow(0 22px 26px rgba(74,46,36,0.20)) drop-shadow(0 4px 6px rgba(74,46,36,0.12))"


def cover(title, bg, body):
    return page(title, 1080, 1080, f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {bg}">
{body}
</div>""")


def cut(key, alt, left, top, width, rot=0):
    turn = f"; transform: rotate({rot}deg)" if rot else ""
    return f'<img src="{CUT[key]}" alt="{alt}" style="position: absolute; left: {left}px; top: {top}px; width: {width}px; max-width: none; {SHADOW}{turn}">'


def word(baseline, text, size, spacing=0):
    """Thin condensed didone, centred, placed by its baseline."""
    return (f'<svg role="img" aria-label="{text}" width="1080" height="1080" style="position: absolute; left: 0; top: 0">'
            f'<text x="540" y="{baseline}" text-anchor="middle" letter-spacing="{spacing}" '
            f'style="{CONDENSED}; font-size: {size}px" fill="{COCOA}">{text}</text></svg>')


def otzyvy():
    body = f"""{cut("malina", "Малина со сливками", -327, 24, 1681)}
<div style="position: absolute; left: 0; top: 0; width: 1080px; height: 520px; background: linear-gradient(180deg, {IVORY} 0%, {IVORY} 62%, rgba(250,247,242,0) 100%)"></div>
{word(376, "ОТЗЫВЫ", 228, 4)}"""
    return cover("Обложка — Отзывы", IVORY, body)


# DESS / ERTO / PIA, as in the original: three rows set letter by letter, a small raised E, the second S lifted,
# the tall T and I reaching into the row above, letters close to touching. Advance widths are Bodoni Moda 800 (units of 2000).
ADVANCE = {"D": 1567, "E": 1292, "S": 1228, "R": 1529, "T": 1399, "O": 1558, "P": 1405, "I": 888, "A": 1609}
ROWS = [
    # baseline, [(char, size, rise)]
    (450, [("D", 380, 0), ("E", 170, 96), ("S", 380, 0), ("S", 380, 30)]),
    (702, [("E", 300, 0), ("R", 300, 0), ("T", 380, -14), ("O", 300, 0)]),
    (966, [("P", 340, 0), ("I", 420, -18), ("A", 340, 0)]),
]
TRACK = -0.045


def raboty():
    glyphs = []
    for base, letters in ROWS:
        widths = [ADVANCE[c] / 2000 * sz + TRACK * sz for c, sz, _ in letters]
        x = 540 - sum(widths) / 2
        for (c, sz, rise), wd in zip(letters, widths):
            glyphs.append(f'<text x="{x:.0f}" y="{base - rise}" style="font-family: {BODONI}; font-weight: 800; font-size: {sz}px">{c}</text>')
            x += wd
    return cover("Обложка — Работы", IVORY,
                 f'<svg role="img" aria-label="DESSERTOPIA" width="1080" height="1080" style="position: absolute; left: 0; top: 0" fill="{COCOA}">{"".join(glyphs)}</svg>')


def nachinki():
    body = f"""{cut("banan", "Срез торта банан-карамель", -30, 70, 560, -6)}
{cut("trifl", "Трайфл со сливочным кремом", 330, 30, 780, 2)}"""
    return cover("Обложка — Начинки", IVORY, body)


def vazhno():
    """A red velvet slice seen from above-right: the photo is the front face, the same photo squeezed and darkened
    is the side face, the top face is drawn with «Важно» piped on it, and the slice sits on a fork."""
    w, h, d, sx = 540, 757, 140, 150          # front width/height, top-face depth, horizontal shift
    skew = math.degrees(math.atan(d / sx))   # the side face rises with the top face's slant
    bg = "radial-gradient(circle at 50% 40%, #F3EEE8 0%, #E3DAD0 58%, #CFC4B8 100%)"
    piped = ("color: #F3E8D7; text-shadow: -2px -2px 0 #FFFDF8, 3px 5px 0 #B49671, 6px 11px 12px rgba(90,50,30,0.40)")
    tines = "".join(f'<div style="position: absolute; left: {w // 2 - 70 + i * 40}px; top: {d + h - 30}px; width: 16px; height: 240px; '
                    f'border-radius: 8px; background: linear-gradient(90deg, #A4803F, #E9D29D 45%, #B38E4C)"></div>' for i in range(4))
    body = f"""<div style="position: absolute; left: 200px; top: 92px; width: {w + sx}px; height: {d + h + 210}px; transform: rotate(-8deg); {SHADOW}">
{tines}
<img src="{CUT["barkhat"]}" alt="" style="position: absolute; left: {w}px; top: {d}px; width: {sx}px; height: {h}px; max-width: none; filter: brightness(0.62) saturate(1.1); transform-origin: 0 0; transform: skewY(-{skew:.1f}deg)">
<img src="{CUT["barkhat"]}" alt="Кусок красного бархата" style="position: absolute; left: 0; top: {d}px; width: {w}px; height: {h}px; max-width: none">
<div style="position: absolute; left: 0; top: 0; width: {w + sx}px; height: {d + 8}px; background: linear-gradient(176deg, #F4ECDF 0%, #FBF6EE 55%, #F1E6D6 100%); clip-path: polygon(0 {d + 8}px, {w}px {d + 8}px, {w + sx}px 0, {sx}px 0)"></div>
<div style="position: absolute; left: {sx // 2}px; top: -4px; width: {w}px; text-align: center; font-family: 'Marck Script', cursive; font-size: 172px; line-height: 1; {piped}; transform-origin: 50% 50%; transform: skewX(-46deg) scaleY(0.62)">Важно</div>
</div>"""
    return cover("Обложка — Важно", bg, body)


def ceny():
    body = f"""{cut("bento", "Бенто-торт с надписью «Будь счастлива»", 90, 430, 900)}
{word(392, "ЦЕНЫ", 270, 8)}"""
    return cover("Обложка — Цены", IVORY, body)


COVERS = [("Otzyvy", otzyvy), ("Raboty", raboty), ("Nachinki", nachinki), ("Vazhno", vazhno), ("Ceny", ceny)]


def build_highlights():
    for old in list(PROJECT.glob("Cover-*.dc.html")) + list(PROJECT.glob("Hl-*.dc.html")):
        old.unlink()
    for i, (slug, fn) in enumerate(COVERS, 1):
        (PROJECT / f"Hl-{i}-{slug}.dc.html").write_text(fn())


if __name__ == "__main__":
    build_highlights()
