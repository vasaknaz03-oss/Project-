"""Filling stories: the cakes overview, one story per cake filling and the trifles overview.

Data lives in tools/fillings.json. Run `python3 tools/build.py` (it calls this module).
"""
import json
import math
import random

from build import (CARAMEL, CARAMEL_TEXT, CHERRY, COCOA, CREAM, HAND, INK, PAPER, PROJECT, ROOT, RULE,
                   page, paper_noise)

DATA = json.loads((ROOT / "tools" / "fillings.json").read_text())
F = DATA["fillings"]

SPONGE = {"vanilla": "#EDC98A", "chocolate": "#6A3E2B", "red": "#A8262F", "poppy": "#EAD9A8"}
FILL = {"caramel": "#C98A3C", "cherry": "#7A1622", "berry": "#C73A52", "lemon": "#F0C43F", "strawberry": "#D2405A"}
FROST = "#FFF6E8"
SHADOW = "0 18px 40px rgba(74,46,36,0.16), 0 3px 8px rgba(74,46,36,0.10)"

# Slice geometry, viewBox 0 0 300 262: front cut face A..B, side cut face B..C, top A-B-C.
TOP, X0, X1, DX, DY = 96, 30, 190, 72, 48
BANDS = [("frost", 10), ("sponge1", 28), ("cream1", 9), ("filling1", 11),
         ("sponge2", 28), ("cream2", 9), ("filling2", 11), ("sponge3", 26)]


def band_rows():
    y, rows = TOP, []
    for name, h in BANDS:
        rows.append((name, y, y + h))
        y += h
    return rows


def band_color(f, name):
    if name.startswith("sponge"):
        return SPONGE[f["sponge"]]
    if name.startswith("filling"):
        return FILL[f["filling"]]
    return FROST


def band_center(name):
    for n, y1, y2 in band_rows():
        if n == name:
            return (y1 + y2) / 2
    raise KeyError(name)


def inclusion(kind, x, y):
    if kind == "banana":
        return f'<ellipse cx="{x}" cy="{y}" rx="8" ry="5" fill="#F7EDB4" stroke="#CDB262" stroke-width="1.4"></ellipse>'
    if kind == "cherry":
        return f'<circle cx="{x}" cy="{y}" r="6" fill="#4E0C14"></circle>'
    if kind == "peanut":
        return f'<ellipse cx="{x}" cy="{y}" rx="6" ry="4" fill="#D9A86C" stroke="#A8763F" stroke-width="1.2" transform="rotate(-20 {x} {y})"></ellipse>'
    if kind == "berry":
        return f'<circle cx="{x}" cy="{y}" r="4.5" fill="#9E1F35"></circle>'
    return ""


def dollop():
    return (f'<path d="M124 84C116 76 124 64 134 68C134 56 152 52 158 62C166 54 182 62 178 74C186 78 182 88 172 88'
            f'C156 92 138 92 124 84Z" fill="{FROST}"></path>')


def strawberry(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M0 14C-12 6 -14 -6 -6 -10C-2 -12 2 -12 6 -10'
            'C14 -6 12 6 0 14Z" fill="#D2405A"></path><path d="M-6 -10C-4 -16 4 -16 6 -10M0 -11L0 -17" fill="none" stroke="#5E8C2E"></path>'
            '<path d="M-4 -2l0 0M3 -3l0 0M-1 4l0 0M4 4l0 0" stroke="#FBE3A0" stroke-width="2.4"></path></g>')


def topping(kind):
    if kind == "cherry":
        return (f'<circle cx="152" cy="54" r="10" fill="{CHERRY}"></circle>'
                '<path d="M147 50C148 48 150 47 152 47" stroke="#FBF5EC" stroke-width="2.4" fill="none"></path>'
                '<path d="M155 44C157 34 165 28 175 26" fill="none"></path>'
                '<path d="M92 86l0 0M104 80l0 0M206 70l0 0M222 64l0 0M118 90l0 0" stroke="#4A2E24" stroke-width="4"></path>')
    if kind == "banana":
        return ('<path d="M48 92C78 84 100 95 126 86M184 84C204 74 222 72 244 58" fill="none" stroke="#C98A3C" stroke-width="4.5"></path>'
                '<ellipse cx="143" cy="60" rx="12" ry="7" fill="#F7EDB4" stroke="#CDB262" stroke-width="1.6" transform="rotate(-12 143 60)"></ellipse>'
                '<ellipse cx="164" cy="62" rx="12" ry="7" fill="#F7EDB4" stroke="#CDB262" stroke-width="1.6" transform="rotate(14 164 62)"></ellipse>')
    if kind == "crumbs":
        pts = [(140, 62), (153, 57), (165, 63), (132, 71), (177, 71), (100, 86), (212, 72), (232, 60), (80, 90), (196, 80), (60, 92)]
        return "".join(f'<circle cx="{x}" cy="{y}" r="3.6" fill="#A8262F"></circle>' for x, y in pts)
    if kind == "lemon":
        segs = "".join(
            f'M154 63L{154 + 15 * math.cos(math.radians(a)):.1f} {63 - 15 * math.sin(math.radians(a)):.1f}' for a in (30, 60, 90, 120, 150))
        return ('<path d="M135 63A19 19 0 0 1 173 63Z" fill="#F6D45A" stroke="#C99A1E" stroke-width="1.6"></path>'
                f'<path d="{segs}" fill="none" stroke="#FFF6D2" stroke-width="1.6"></path>'
                '<path d="M96 86l0 0M110 82l0 0M210 72l0 0M226 64l0 0M80 90l0 0M196 80l0 0" stroke="#2E2019" stroke-width="3"></path>')
    if kind == "berries":
        rasp = "".join(f'<circle cx="{168 + dx}" cy="{58 + dy}" r="3.6" fill="#C73A52" stroke="#8E1F35" stroke-width="0.8"></circle>'
                       for dx, dy in [(0, 0), (6, 1), (3, 5), (-3, 5), (9, 6), (3, -4)])
        return strawberry(144, 58, 1.0) + rasp
    if kind == "peanuts":
        pts = [(140, 60, -20), (156, 56, 25), (170, 63, -10), (100, 86, 30), (214, 72, -25), (120, 90, 10)]
        nuts = "".join(f'<ellipse cx="{x}" cy="{y}" rx="7" ry="4.6" fill="#D9A86C" stroke="#A8763F" stroke-width="1.3" transform="rotate({r} {x} {y})"></ellipse>'
                       for x, y, r in pts)
        return '<path d="M50 92C78 84 100 95 126 86M184 84C204 74 222 72 244 58" fill="none" stroke="#C98A3C" stroke-width="4.5"></path>' + nuts
    if kind == "strawberry":
        return strawberry(146, 56, 1.1) + '<ellipse cx="168" cy="64" rx="11" ry="6.5" fill="#F7EDB4" stroke="#CDB262" stroke-width="1.6"></ellipse>'
    return ""


def slice_svg(f, width, label):
    rnd = random.Random(f["name"])
    rows = band_rows()
    parts = ['<path d="M8 236C70 244 160 246 200 238C240 228 270 206 292 186" fill="none" stroke="#AD7A4F" stroke-width="3"></path>']
    for name, y1, y2 in rows:
        c = band_color(f, name)
        parts.append(f'<rect x="{X0}" y="{y1}" width="{X1 - X0}" height="{y2 - y1}" fill="{c}" stroke="none"></rect>')
        parts.append(f'<polygon points="{X1},{y1} {X1 + DX},{y1 - DY} {X1 + DX},{y2 - DY} {X1},{y2}" fill="{c}" stroke="none"></polygon>')
    # sponge crumb texture
    texture = []
    for name, y1, y2 in rows:
        if not name.startswith("sponge"):
            continue
        poppy = f["sponge"] == "poppy"
        for _ in range(26 if poppy else 12):
            x, y = rnd.uniform(X0 + 10, X1 - 6), rnd.uniform(y1 + 4, y2 - 4)
            texture.append(f"M{x:.1f} {y:.1f}l0 0")
        colour = "#2E2019" if poppy else "rgba(46,32,25,0.22)"
        parts.append(f'<path d="{"".join(texture)}" stroke="{colour}" stroke-width="{2.6 if poppy else 3.2}"></path>')
        texture = []
    kind = f.get("inclusion", "none")
    if kind != "none":
        for name in ("filling1", "filling2") if kind == "cherry" else ("filling2",):
            y = band_center(name)
            parts += [inclusion(kind, x, y) for x in (54, 86, 118, 150, 176)]
    parts.append(f'<rect x="{X0}" y="{TOP}" width="8" height="132" fill="{FROST}" stroke="none"></rect>')
    parts.append(f'<polygon points="{X1},{TOP} {X1 + DX},{TOP - DY} {X1 + DX},{TOP + 132 - DY} {X1},{TOP + 132}" fill="#2E2019" opacity="0.10" stroke="none"></polygon>')
    parts.append(f'<path d="M{X0} {TOP}L{X1} {TOP}L{X1 + DX} {TOP - DY}Q110 30 {X0} {TOP}Z" fill="{FROST}"></path>')
    parts.append(f'<path d="M{X0} {TOP}L{X1} {TOP}L{X1} {TOP + 132}L{X0} {TOP + 132}Z M{X1} {TOP}L{X1 + DX} {TOP - DY}L{X1 + DX} {TOP + 132 - DY}L{X1} {TOP + 132}" fill="none"></path>')
    parts.append(dollop())
    parts.append(topping(f["topping"]))
    h = round(width * 262 / 300)
    return (f'<svg role="img" aria-label="{label}" viewBox="0 0 300 262" width="{width}" height="{h}" '
            f'stroke="{COCOA}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">{"".join(parts)}</svg>')


def cup_svg(f, slug, width, label):
    """A trifle cup, viewBox 0 0 140 196: layers clipped to the cup shape, cream swirl and topping above."""
    cid = f"cup-{slug.lower()}"
    bands = [("sponge", 24), ("cream", 13), ("filling", 10), ("sponge", 22), ("cream", 13), ("filling", 10), ("cream", 30)]
    y, rects = 182, []
    for name, h in bands:
        y -= h
        c = SPONGE[f["sponge"]] if name == "sponge" else FILL[f["filling"]] if name == "filling" else FROST
        rects.append(f'<rect x="0" y="{y}" width="140" height="{h}" fill="{c}"></rect>')
    rnd = random.Random(slug)
    poppy = f["sponge"] == "poppy"
    crumbs = "".join(f"M{rnd.uniform(26, 114):.1f} {rnd.uniform(160, 178) if i % 2 else rnd.uniform(113, 133):.1f}l0 0" for i in range(18 if poppy else 10))
    crumb_colour = "#2E2019" if poppy else "rgba(46,32,25,0.22)"
    kind = f.get("inclusion", "none")
    inc = "".join(inclusion(kind, x, 141) for x in (40, 70, 100)) if kind != "none" else ""
    top = {
        "cherry": f'<circle cx="72" cy="30" r="8" fill="{CHERRY}"></circle><path d="M74 22C76 14 82 9 90 8" fill="none"></path>',
        "banana": '<ellipse cx="62" cy="34" rx="10" ry="6" fill="#F7EDB4" stroke="#CDB262" stroke-width="1.4"></ellipse><ellipse cx="80" cy="34" rx="10" ry="6" fill="#F7EDB4" stroke="#CDB262" stroke-width="1.4"></ellipse><path d="M30 52C50 44 70 54 92 46C102 42 110 44 116 48" fill="none" stroke="#C98A3C" stroke-width="3.5"></path>',
        "crumbs": "".join(f'<circle cx="{x}" cy="{yy}" r="3" fill="#A8262F"></circle>' for x, yy in [(60, 34), (72, 30), (84, 36), (50, 44), (94, 44), (70, 42)]),
        "lemon": '<path d="M54 38A16 16 0 0 1 86 38Z" fill="#F6D45A" stroke="#C99A1E" stroke-width="1.4"></path>',
        "berries": '<g transform="translate(-74 -24)">' + strawberry(140, 58, 0.9) + "</g>" + "".join(
            f'<circle cx="{82 + dx}" cy="{36 + dy}" r="3.2" fill="#C73A52" stroke="#8E1F35" stroke-width="0.7"></circle>' for dx, dy in [(0, 0), (5, 1), (2, 5), (-3, 4)]),
        "peanuts": "".join(f'<ellipse cx="{x}" cy="{yy}" rx="6" ry="4" fill="#D9A86C" stroke="#A8763F" stroke-width="1.2" transform="rotate({r} {x} {yy})"></ellipse>'
                           for x, yy, r in [(60, 36, -20), (74, 32, 20), (86, 38, -10)]) + '<path d="M30 52C50 44 70 54 92 46C102 42 110 44 116 48" fill="none" stroke="#C98A3C" stroke-width="3.5"></path>',
        "strawberry": '<g transform="translate(-80 -22)">' + strawberry(140, 56, 0.95) + '</g><ellipse cx="82" cy="36" rx="9" ry="5.5" fill="#F7EDB4" stroke="#CDB262" stroke-width="1.4"></ellipse>',
    }[f["topping"]]
    h = round(width * 196 / 140)
    return (f'<svg role="img" aria-label="{label}" viewBox="0 0 140 196" width="{width}" height="{h}" stroke="{COCOA}" stroke-width="2.4" '
            f'stroke-linecap="round" stroke-linejoin="round"><clipPath id="{cid}"><path d="M14 60L30 180C54 186 86 186 110 180L126 60Z"></path></clipPath>'
            f'<g clip-path="url(#{cid})" stroke="none">{"".join(rects)}<path d="{crumbs}" stroke="{crumb_colour}" stroke-width="3"></path></g>'
            f'<g clip-path="url(#{cid})">{inc}</g>'
            f'<path d="M16 60C8 46 24 36 36 42C36 26 56 20 68 30C80 18 104 24 102 40C116 34 132 46 124 60Z" fill="{FROST}"></path>'
            '<path d="M38 52C48 46 58 48 64 54M74 42C82 38 90 40 94 46" fill="none"></path>'
            f'{top}<path d="M10 60L130 60M14 60L30 180C54 186 86 186 110 180L126 60" fill="none"></path>'
            '<path d="M26 74L38 168" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.6"></path></svg>')


# ---------------------------------------------------------------- shared story chrome

def header(left, right):
    return (f'<div style="position: absolute; left: 70px; right: 70px; top: 246px; display: flex; justify-content: space-between; '
            f"font-family: 'Montserrat', sans-serif; font-weight: 500; font-size: 24px; letter-spacing: 0.28em; color: #6B4A3A\">"
            f'<div>{left}</div><div>{right}</div></div>'
            f'<div style="position: absolute; left: 70px; right: 70px; top: 296px; height: 2px; background: {RULE}"></div>')


def footer(text, y=1648):
    return ('<svg aria-hidden="true" width="1080" height="1920" style="position: absolute; left: 0; top: 0" fill="none">'
            f'<path d="M-10 {y + 96}C120 {y + 66} 240 {y + 118} 380 {y + 96}C520 {y + 74} 640 {y + 46} 780 {y + 68}C880 {y + 84} 960 {y + 106} 1090 {y + 78}" stroke="#AD7A4F" '
            'stroke-width="4" stroke-dasharray="0.1 14" stroke-linecap="round"></path>'
            f'<path d="M902 {y + 30}C930 {y + 16} 966 {y + 16} 992 {y + 30}M978 {y + 18}L994 {y + 30}L976 {y + 40}" stroke="#5C3B2B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
            f"<div style=\"position: absolute; right: 196px; top: {y}px; font-family: 'Marck Script', cursive; font-size: 46px; line-height: 1.2; color: {HAND}\">{text}</div>")


def tape(x, y, w=150, rot=-4):
    return (f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: 44px; background: rgba(217,195,165,0.72); '
            f'transform: rotate({rot}deg); box-shadow: 0 1px 2px rgba(74,46,36,0.08)"></div>')


def story(title, body):
    return page(title, 1080, 1920, f"""<div style="position: relative; width: 1080px; height: 1920px; overflow: hidden; background: {CREAM}; font-family: 'Cormorant Garamond', serif; color: {INK}">
{paper_noise(1080, 1920)}
{body}
</div>""")


# ---------------------------------------------------------------- cakes overview

def cakes_overview():
    rows = []
    y = 600
    for i, slug in enumerate(DATA["cakes"]):
        f = F[slug]
        rows.append(f"""<div style="position: absolute; left: 70px; right: 70px; top: {y}px; height: 160px; display: flex; align-items: center; gap: 34px">
<div style="position: relative; flex: none; width: 160px">{slice_svg(f, 160, f["name"])}
<div style="position: absolute; left: -12px; top: -8px; width: 50px; height: 50px; border-radius: 50%; background: {CARAMEL}; display: flex; align-items: center; justify-content: center; font-family: 'Montserrat', sans-serif; font-weight: 600; font-size: 20px; letter-spacing: 0.04em; color: #FBF5EC">{i + 1:02d}</div></div>
<div style="flex: 1; min-width: 0">
<div style="font-family: 'Marck Script', cursive; font-size: 54px; line-height: 1.05; color: {INK}">{f["name"]}</div>
<div style="margin-top: 4px; font-weight: 500; font-size: 30px; line-height: 1.14; color: {HAND}">{f["desc"]}</div>
</div>
</div>""")
        if i < len(DATA["cakes"]) - 1:
            rows.append(f'<div style="position: absolute; left: 264px; right: 70px; top: {y + 165}px; border-top: 3px dotted rgba(173,122,79,0.55)"></div>')
        y += 170
    body = f"""{header("DESSERTOPIA", "НАЧИНКИ · ТОРТЫ")}
<div style="position: absolute; left: 62px; top: 318px; font-style: italic; font-size: 168px; line-height: 1">Начинки</div>
<div style="position: absolute; left: 72px; top: 476px; font-size: 96px; line-height: 1">для тортов</div>
<div style="position: absolute; right: 74px; top: 372px; width: 330px; transform: rotate(-5deg); text-align: center; font-family: 'Marck Script', cursive; font-size: 46px; line-height: 1.15; color: {CARAMEL_TEXT}">выбирайте любимую</div>
<svg aria-hidden="true" width="1080" height="1920" style="position: absolute; left: 0; top: 0"><path d="M884 488C878 478 866 474 862 484C858 474 846 478 848 490C850 500 862 508 866 514C872 506 886 498 884 488Z" fill="{CHERRY}"></path></svg>
{"".join(rows)}
{footer("подробнее — листайте")}"""
    return story("Начинки для тортов", body)


# ---------------------------------------------------------------- one cake filling

def filling_story(slug, index, total):
    f = F[slug]
    scale, sx, sy = 2.1, 362, 662
    labels, arrows, prev_bottom = [], [], 0
    for text, target in f["labels"]:
        ty = sy + (band_center(target) if target != "frost" else TOP + 5) * scale
        lines = math.ceil(len(text) / 15)
        top = max(ty - 24, prev_bottom + 18)
        prev_bottom = top + lines * 42
        text = text.replace("крем-чиз", '<span style="white-space: nowrap">крем-чиз</span>')
        labels.append(f"<div style=\"position: absolute; left: 40px; top: {top:.0f}px; width: 312px; text-align: right; font-family: 'Marck Script', cursive; "
                      f'font-size: 38px; line-height: 1.1; color: {HAND}">{text}</div>')
        ay = top + 22
        arrows.append(f'<path d="M362 {ay:.0f}C392 {ay:.0f} 404 {ty:.0f} 428 {ty:.0f}M416 {ty - 9:.0f}L429 {ty:.0f}L416 {ty + 9:.0f}"></path>')
    tags = []
    if slug in DATA["cakes"]:
        tags.append("в тортах")
    if slug in DATA["trifles"]:
        tags.append("в трайфлах")
    tag_html = "".join(
        f"<div style=\"padding: 10px 24px; border: 2px solid {CARAMEL}; border-radius: 999px; font-family: 'Montserrat', sans-serif; font-weight: 500; "
        f'font-size: 22px; letter-spacing: 0.2em; color: {CARAMEL_TEXT}">{t.upper()}</div>' for t in tags)
    title2 = f'<div style="position: absolute; left: 72px; top: 500px; font-size: 112px; line-height: 1">{f["title"][1]}</div>' if f["title"][1] else ""
    body = f"""{header("DESSERTOPIA", f"НАЧИНКИ · {index} / {total}")}
<div style="position: absolute; left: 62px; top: 322px; font-style: italic; font-size: 176px; line-height: 1">{f["title"][0]}</div>
{title2}
<div style="position: absolute; right: 70px; top: 548px; width: 400px; transform: rotate(-4deg); text-align: right; font-family: 'Marck Script', cursive; font-size: 44px; line-height: 1.15; color: {CARAMEL_TEXT}">{f["mood"]}</div>
<div style="position: absolute; left: {sx}px; top: {sy}px">{slice_svg(f, round(300 * scale), "Разрез: " + f["name"])}</div>
{"".join(labels)}
<svg aria-hidden="true" width="1080" height="1920" style="position: absolute; left: 0; top: 0" fill="none" stroke="{CARAMEL}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">{"".join(arrows)}</svg>
<div style="position: absolute; left: 70px; right: 70px; top: 1262px; padding: 44px 52px 40px; background: {PAPER}; box-shadow: {SHADOW}; transform: rotate(-1deg)">
<div style="font-family: 'Montserrat', sans-serif; font-weight: 500; font-size: 22px; letter-spacing: 0.3em; color: {CARAMEL_TEXT}">СОСТАВ</div>
<div style="margin-top: 12px; font-weight: 500; font-size: 40px; line-height: 1.16; color: {HAND}">{f["desc"]}</div>
<div style="margin-top: 22px; display: flex; gap: 14px">{tag_html}</div>
</div>
{tape(465, 1240)}
{footer("выбрали? пишите мне")}"""
    return story(f"Начинка — {f['name']}", body)


# ---------------------------------------------------------------- one cake filling, layers «в разлёте»

def lighten(hex_colour, k):
    r, g, b = (int(hex_colour[i:i + 2], 16) for i in (1, 3, 5))
    return "#%02X%02X%02X" % tuple(round(c + (255 - c) * k) for c in (r, g, b))


def disc(f, kind, y, h, cx=700, rx=250, ry=20, seed=0):
    """One floating layer: a short cylinder seen slightly from above, its top face at y."""
    rnd = random.Random(f["name"] + str(seed))
    side = lambda y1, y2, c: (f'<path d="M{cx - rx} {y1}L{cx - rx} {y2}A{rx} {ry} 0 0 0 {cx + rx} {y2}L{cx + rx} {y1}'
                              f'A{rx} {ry} 0 0 1 {cx - rx} {y1}Z" fill="{c}" stroke="none"></path>')
    parts = []
    if kind == "sponge":
        c = SPONGE[f["sponge"]]
        parts.append(side(y, y + h, c))
        poppy = f["sponge"] == "poppy"
        pts = "".join(f"M{rnd.uniform(cx - rx + 14, cx + rx - 14):.0f} {rnd.uniform(y + ry * 0.5 + 6, y + h + ry * 0.4):.0f}l0 0" for _ in range(40 if poppy else 22))
        parts.append(f'<path d="{pts}" stroke="{"#2E2019" if poppy else "rgba(46,32,25,0.22)"}" stroke-width="{3 if poppy else 4}"></path>')
        top = lighten(c, 0.18)
    elif kind == "top":
        parts.append(side(y, y + h, FROST))
        top = "#FFFBF4"
    else:
        fill = FILL[f["filling"]]
        parts.append(side(y, y + h, FROST))
        parts.append(f'<path d="M{cx - rx} {y}L{cx - rx} {y + 18}A{rx} {ry} 0 0 0 {cx + rx} {y + 18}L{cx + rx} {y}Z" fill="{fill}" stroke="none"></path>')
        for x, ln in [(-180, 14), (-110, 24), (-40, 12), (34, 22), (104, 16), (170, 20)]:
            yy = y + 18 + ry * (1 - (x / rx) ** 2) ** 0.5 - 4
            parts.append(f'<path d="M{cx + x} {yy:.0f}L{cx + x} {yy + ln:.0f}A6 6 0 0 0 {cx + x + 12} {yy + ln:.0f}L{cx + x + 12} {yy:.0f}Z" fill="{fill}" stroke="none"></path>')
        top = lighten(fill, 0.12)
    parts.append(f'<ellipse cx="{cx}" cy="{y}" rx="{rx}" ry="{ry}" fill="{top}"></ellipse>')
    parts.append(f'<path d="M{cx - rx} {y}L{cx - rx} {y + h}A{rx} {ry} 0 0 0 {cx + rx} {y + h}L{cx + rx} {y}" fill="none"></path>')
    # inclusions sit on the layer labelled «filling2» (disc 4); cherries go into both filling layers
    if kind == "mixed" and f.get("inclusion", "none") != "none" and (seed == 4 or f["inclusion"] == "cherry"):
        for dx, dy in [(-160, 2), (-90, -12), (-20, 8), (54, -10), (124, 6), (180, -2), (-130, 14), (20, -16), (90, 14)]:
            parts.append(inclusion(f["inclusion"], cx + dx, y + dy))
    if kind == "top":
        s = 2.0
        parts.append(f'<g transform="translate({cx - 152 * s:.0f} {y - 74 * s:.0f}) scale({s})" stroke-width="1.6">{dollop()}{topping(f["topping"])}</g>')
    return "".join(parts)


def filling_story_layers(slug, index, total):
    f = F[slug]
    layout = [("top", 24), ("sponge", 52), ("mixed", 46), ("sponge", 52), ("mixed", 46), ("sponge", 52)]
    cx, rx, ry, gap = 690, 230, 32, 16
    labels = {t: text for text, t in f["labels"]}
    targets = {0: labels.get("frost"), 2: labels.get("filling1"), 4: labels.get("filling2"), 5: labels.get("sponge3")}
    y, discs, notes, leaders = 730, [], [], []
    for i, (kind, h) in enumerate(layout):
        discs.append(disc(f, kind, y, h, cx, rx, ry, seed=i))
        text = targets.get(i)
        if text:
            mid = y + h / 2 + 4
            lines = math.ceil(len(text) / 15)
            text = text.replace("крем-чиз", '<span style="white-space: nowrap">крем-чиз</span>')
            notes.append(f"<div style=\"position: absolute; left: 34px; top: {mid - lines * 21:.0f}px; width: 300px; text-align: right; font-family: 'Marck Script', cursive; "
                         f'font-size: 38px; line-height: 1.1; color: {HAND}">{text}</div>')
            leaders.append(f'<path d="M352 {mid:.0f}L{cx - rx - 10} {mid:.0f}"></path><circle cx="{cx - rx - 6}" cy="{mid:.0f}" r="5" fill="{CARAMEL}" stroke="none"></circle>')
        last_bottom = y + h + ry
        y += h + 2 * ry + gap
    shadow = f'<ellipse cx="{cx}" cy="{last_bottom + 6}" rx="{rx - 10}" ry="18" fill="rgba(46,32,25,0.10)" stroke="none"></ellipse>'
    tags = "".join(
        f"<div style=\"padding: 10px 24px; border: 2px solid {CARAMEL}; border-radius: 999px; font-family: 'Montserrat', sans-serif; font-weight: 500; "
        f'font-size: 22px; letter-spacing: 0.2em; color: {CARAMEL_TEXT}">{t}</div>'
        for t, ok in (("В ТОРТАХ", slug in DATA["cakes"]), ("В ТРАЙФЛАХ", slug in DATA["trifles"])) if ok)
    title2 = f'<div style="position: absolute; left: 72px; top: 500px; font-size: 112px; line-height: 1">{f["title"][1]}</div>' if f["title"][1] else ""
    body = f"""{header("DESSERTOPIA", f"НАЧИНКИ · {index} / {total}")}
<div style="position: absolute; left: 62px; top: 322px; font-style: italic; font-size: 176px; line-height: 1">{f["title"][0]}</div>
{title2}
<div style="position: absolute; right: 70px; top: 352px; width: 140px; height: 140px; border-radius: 50%; background: {CARAMEL}; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 500; font-size: 76px; color: #FBF5EC">{index:02d}</div>
<div style="position: absolute; right: 70px; top: 548px; width: 400px; transform: rotate(-4deg); text-align: right; font-family: 'Marck Script', cursive; font-size: 44px; line-height: 1.15; color: {CARAMEL_TEXT}">{f["mood"]}</div>
<svg role="img" aria-label="Слои начинки {f["name"]} в разлёте" width="1080" height="1920" style="position: absolute; left: 0; top: 0" stroke="{COCOA}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">{shadow}{"".join(discs)}</svg>
<svg aria-hidden="true" width="1080" height="1920" style="position: absolute; left: 0; top: 0" fill="none" stroke="{CARAMEL}" stroke-width="3.5" stroke-dasharray="0.1 9" stroke-linecap="round">{"".join(leaders)}</svg>
{"".join(notes)}
<div style="position: absolute; left: 70px; right: 70px; top: 1540px; display: flex; justify-content: center; gap: 14px">{tags}</div>
{footer("выбрали? пишите мне")}"""
    return story(f"Начинка в разлёте — {f['name']}", body)


# ---------------------------------------------------------------- trifles overview

def trifles_overview():
    cells = []
    for slug in DATA["trifles"]:
        f = F[slug]
        cells.append(f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 10px">
{cup_svg(f, slug, 200, "Трайфл " + f["name"])}
<div style="text-align: center; font-family: 'Marck Script', cursive; font-size: 40px; line-height: 1.05; color: {INK}">{f["name"]}</div>
</div>""")
    first, second = "".join(cells[:4]), "".join(cells[4:])
    body = f"""{header("DESSERTOPIA", "НАЧИНКИ · ТРАЙФЛЫ")}
<div style="position: absolute; left: 62px; top: 318px; font-style: italic; font-size: 168px; line-height: 1">Начинки</div>
<div style="position: absolute; left: 72px; top: 476px; font-size: 92px; line-height: 1">для трайфлов</div>
<div style="position: absolute; left: 76px; top: 600px; font-family: 'Marck Script', cursive; font-size: 46px; color: {CARAMEL_TEXT}">десерты в стаканчиках</div>
<div style="position: absolute; left: 726px; top: 336px; width: 270px; padding: 16px 16px 58px; background: {PAPER}; box-shadow: {SHADOW}; transform: rotate(5deg)">
<img src="/_blob/aeea293c74e4515e46d893fc34334706" alt="Трайфл с кремом в стаканчике" style="display: block; width: 270px; height: 300px; object-fit: cover">
<div style="position: absolute; left: 0; right: 0; bottom: 12px; text-align: center; font-family: 'Marck Script', cursive; font-size: 32px; color: {HAND}">слой за слоем</div>
</div>
{tape(800, 318, 120, 8)}
<div style="position: absolute; left: 60px; right: 60px; top: 760px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 30px 14px">{first}</div>
<div style="position: absolute; left: 190px; right: 190px; top: 1176px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 30px 14px">{second}</div>
{footer("какой берём?")}"""
    return story("Начинки для трайфлов", body)


def build_fillings():
    (PROJECT / "Fill-0-Cakes.dc.html").write_text(cakes_overview())
    cakes = DATA["cakes"]
    for i, slug in enumerate(cakes, 1):
        (PROJECT / f"Fill-{i}-{slug}.dc.html").write_text(filling_story(slug, i, len(cakes)))
        (PROJECT / f"Fill-{i}b-{slug}.dc.html").write_text(filling_story_layers(slug, i, len(cakes)))
    (PROJECT / f"Fill-{len(cakes) + 1}-Trifles.dc.html").write_text(trifles_overview())


if __name__ == "__main__":
    build_fillings()
