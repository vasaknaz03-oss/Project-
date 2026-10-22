"""Logo variants after the user's references: «Vanilla» (bold script + flourishes, two colourways),
«Caramel» (large calligraphy over the drawing) and the line set («ТарталеТ», «Сластье»).

Run `python3 tools/build.py` (it calls this module).
"""
from build import CARAMEL, CARAMEL_TEXT, CHERRY, COCOA, CREAM, INK, PAPER, PROJECT, heart, page, paper_noise

HEART_CAKE = {"cocoa": "/_blob/a9eac0041f17fa83168692c9ca4fcb63", "cream": "/_blob/f3cc0a5bb36c0a6556f55a3d77c27ec6",
              "caramel": "/_blob/53faed3def2f0d707b81709e4657d424", "wine": "/_blob/5a7db666bf8bf369e43fba989e1270e6"}
VIBES = "font-family: 'Great Vibes', cursive"
TENOR = "font-family: 'Tenor Sans', sans-serif"

# One half of a calligraphic flourish, drawn rightwards from the centre (0, 0); mirrored for the left half.
SWASH = ("M0 0C30 0 52 -20 82 -20C112 -20 122 2 106 12C92 20 80 4 94 -6C112 -20 152 -14 182 0"
         "C212 14 252 16 292 -2C312 -11 324 -26 320 -36C316 -46 302 -44 302 -32C302 -20 322 -16 338 -24")


def flourish(cx, cy, scale, colour, centre_heart=True):
    half = f'<path d="{SWASH}"></path>'
    mark = f'<path d="{heart(0, 0, 0.5)}" fill="{CHERRY}" stroke="none"></path>' if centre_heart else ""
    return (f'<g transform="translate({cx} {cy}) scale({scale})" fill="none" stroke="{colour}" stroke-width="{5.5 / scale:.1f}" stroke-linecap="round">'
            f'{half}<g transform="scale(-1 1)">{half}</g>{mark}</g>')


def logo(title, bg, body):
    return page(title, 1080, 1080, f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {bg}; font-family: 'Cormorant Garamond', serif">
{paper_noise(1080, 1080)}
{body}
</div>""")


def vanilla(dark):
    ink, accent, cake = ("#FBF5EC", "#FBF5EC", HEART_CAKE["cream"]) if dark else (COCOA, CARAMEL, HEART_CAKE["cocoa"])
    svg = (f'<svg aria-hidden="true" width="1080" height="1080" style="position: absolute; left: 0; top: 0">'
           f'{flourish(540, 520, 1.2, accent, not dark)}{flourish(540, 850, 0.8, accent, False)}</svg>')
    body = f"""<img src="{cake}" alt="Торт-сердце" style="position: absolute; left: 380px; top: 150px; width: 320px">
{svg}
<div style="position: absolute; left: 0; right: 0; top: 528px; text-align: center; font-family: 'Lobster', cursive; font-size: 176px; line-height: 1; color: {ink}">Dessertopia</div>
<div style="position: absolute; left: 0; right: 0; top: 740px; text-align: center; {VIBES}; font-size: 76px; line-height: 1; color: {accent}">сладкая страна чудес</div>"""
    return logo("Логотип — Vanilla, " + ("карамельный фон" if dark else "светлый фон"), CARAMEL if dark else PAPER, body)


def caramel():
    body = f"""<img src="{HEART_CAKE["cocoa"]}" alt="Торт-сердце" style="position: absolute; left: 330px; top: 92px; width: 420px">
<div style="position: absolute; left: 0; right: 0; top: 392px; text-align: center; {VIBES}; font-size: 250px; line-height: 1; color: {COCOA}">Dessertopia</div>
<div style="position: absolute; left: 0; right: 0; top: 640px; text-align: center; {VIBES}; font-size: 66px; line-height: 1; color: {CARAMEL_TEXT}">кондитерская · Минск</div>
<div style="position: absolute; left: 290px; right: 290px; top: 770px; height: 2px; background: rgba(74,46,36,0.18)"></div>
<div style="position: absolute; left: 0; right: 0; top: 820px; text-align: center; {VIBES}; font-size: 96px; line-height: 1; color: {COCOA}">Dessertopia</div>
<div style="position: absolute; left: 0; right: 0; top: 916px; text-align: center; {VIBES}; font-size: 40px; line-height: 1; color: {CARAMEL_TEXT}">сладкая страна чудес</div>"""
    return logo("Логотип — Caramel", CREAM, body)


def line_cake(cx, cy, s, colour, fill=PAPER, sw=6):
    """A minimal line cake with drips and a cherry, centred at (cx, cy)."""
    return (f'<g transform="translate({cx} {cy}) scale({s})" fill="none" stroke="{colour}" stroke-width="{sw / s:.1f}" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="M-170 0L-170 170A170 40 0 0 0 170 170L170 0" fill="{fill}"></path>'
            '<path d="M-170 0A170 40 0 0 1 170 0A170 40 0 0 1 -170 0Z" fill="#FFFBF4"></path>'
            '<path d="M-168 10C-160 44 -140 44 -132 20C-120 62 -96 62 -86 28C-76 48 -56 48 -46 24C-34 66 -10 66 0 30'
            'C10 52 30 52 40 26C52 64 76 64 86 32C96 50 116 50 126 22C138 58 160 58 168 10"></path>'
            '<path d="M-236 206C-120 240 120 240 236 206"></path>'
            '<path d="M6 -66C12 -98 32 -116 54 -120"></path>'
            f'<circle cx="0" cy="-46" r="22" fill="{CHERRY}" stroke="none"></circle></g>')


def tartalet():
    body = f"""<svg role="img" aria-label="Линейный торт с вишней" width="1080" height="1080" style="position: absolute; left: 0; top: 0">{line_cake(540, 300, 1.0, COCOA)}</svg>
<div style="position: absolute; left: 0; right: 0; top: 600px; text-align: center; {TENOR}; font-size: 104px; letter-spacing: 0.08em; line-height: 1; color: {INK}">DESSERTOPIA</div>
<div style="position: absolute; left: 0; right: 0; top: 740px; display: flex; align-items: center; justify-content: center; gap: 26px; {TENOR}; font-size: 38px; letter-spacing: 0.22em; color: {CARAMEL_TEXT}">
<div style="width: 120px; height: 2px; background: {CARAMEL}"></div>кондитерская<div style="width: 120px; height: 2px; background: {CARAMEL}"></div></div>
<div style="position: absolute; left: 0; right: 0; top: 820px; text-align: center; {VIBES}; font-size: 56px; color: {CARAMEL_TEXT}">Минск</div>"""
    return logo("Логотип — линейный", PAPER, body)


def word_in_cake():
    body = f"""<svg role="img" aria-label="Торт с надписью Dessertopia" width="1080" height="1080" style="position: absolute; left: 0; top: 0">{line_cake(540, 390, 1.65, COCOA, sw=7)}</svg>
<div style="position: absolute; left: 0; right: 0; top: 486px; text-align: center; {VIBES}; font-size: 128px; line-height: 1; color: {COCOA}">Dessertopia</div>
<div style="position: absolute; left: 0; right: 0; top: 820px; text-align: center; {TENOR}; font-size: 36px; letter-spacing: 0.3em; color: {CARAMEL_TEXT}">КОНДИТЕРСКАЯ · МИНСК</div>"""
    return logo("Логотип — надпись в торте", CREAM, body)


def build_logos():
    out = {"Logo-9-Vanilla": vanilla(False), "Logo-10-Vanilla-karamel": vanilla(True), "Logo-11-Caramel": caramel(),
           "Logo-12-Line": tartalet(), "Logo-13-Word-in-cake": word_in_cake()}
    for name, html in out.items():
        (PROJECT / f"{name}.dc.html").write_text(html)


if __name__ == "__main__":
    build_logos()
