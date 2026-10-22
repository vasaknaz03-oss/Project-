"""Highlight covers, 1080×1080. Each cover has its own treatment (photo + serif caps, photo + calligraphy,
pure typography, a paper note) while the palette and the photo grade stay shared — like the original
covers, in the new colours. A is the main set, B the alternatives.

Photos are prepared by tools/prep_highlights.py. Run `python3 tools/build.py` (it calls this module).
"""
from build import CARAMEL, CHERRY, COCOA, CREAM, INK, PAPER, PROJECT, heart, page, paper_noise
from build_fillings import SHADOW, tape

PHOTO = {
    "konvert": "/_blob/23c8227ac8f5b2c968803f184130d819", "malina": "/_blob/42ff652bec7317e0f5da246604b68ee7",
    "srez": "/_blob/eeb6e6ac56f7e93341d9edf0b2f273a9", "banan": "/_blob/26ac863bc173c05db3700b6fb2d9575e",
    "barkhat": "/_blob/eb59f671dcac12037384dff876e16bfe", "chai": "/_blob/e97602acf1ee5fdd98de349ce63eb2b0",
    "trifl": "/_blob/94598f6c024ff2a56c775044f5c86057", "karamel": "/_blob/35410bb8b3df9688bdc8dacc443c3e8f",
}
VIBES = "font-family: 'Great Vibes', cursive"
CAPS = "font-family: 'Playfair Display SC', serif"
SERIF = "font-family: 'Cormorant Garamond', serif"
LIGHT = "#FBF5EC"
DARK_BG = "#3B2620"
GLOW = "text-shadow: 0 0 22px rgba(251,245,236,1), 0 0 10px rgba(251,245,236,0.95), 0 0 3px rgba(251,245,236,0.9)"
SHADE = "text-shadow: 0 3px 16px rgba(46,32,25,0.55), 0 1px 3px rgba(46,32,25,0.35)"


def cover(title, bg, body, noise=True):
    return page(title, 1080, 1080, f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {bg}">
{paper_noise(1080, 1080) if noise else ""}
{body}
</div>""")


def photo(key, alt):
    return f'<img src="{PHOTO[key]}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 1080px; height: 1080px; object-fit: cover">'


def text(top, content, style, rot=0):
    turn = f"; transform: rotate({rot}deg)" if rot else ""
    return f'<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center; line-height: 1; {style}{turn}">{content}</div>'


def cherry_heart(cx, cy, s, colour=CHERRY):
    return (f'<svg aria-hidden="true" width="1080" height="1080" style="position: absolute; left: 0; top: 0">'
            f'<path d="{heart(cx, cy, s)}" fill="{colour}"></path></svg>')


# ---------------------------------------------------------------- main set (A)

def otzyvy_a():
    body = f"""{photo("konvert", "Конверт с сургучной печатью и вишнями")}
{text(156, "ОТЗЫВЫ", f"{CAPS}; font-size: 128px; letter-spacing: 0.06em; color: {INK}")}
{text(812, "спасибо за тёплые слова", f"{VIBES}; font-size: 74px; color: #6B4A3A")}"""
    return cover("Обложка — Отзывы, конверт", CREAM, body, noise=False)


def raboty_a():
    body = f"""{text(158, "DESS<br>ERTO<br>PIA", f"{SERIF}; font-weight: 600; font-size: 214px; line-height: 0.8; letter-spacing: -0.01em; color: {COCOA}")}
<div style="position: absolute; left: 330px; right: 330px; top: 700px; height: 3px; background: {CARAMEL}"></div>
{text(722, "работы", f"{VIBES}; font-size: 170px; color: {CARAMEL}", -4)}
{cherry_heart(786, 236, 1.4)}"""
    return cover("Обложка — Работы, типографика", CREAM, body)


def nachinki_a():
    body = f"""{photo("srez", "Срез торта с вишней и карамелью")}
<div style="position: absolute; left: 190px; top: 456px; width: 700px; box-sizing: border-box; padding: 34px 0 30px; background: {PAPER}; box-shadow: {SHADOW}; transform: rotate(-3deg); text-align: center">
<div style="{CAPS}; font-size: 104px; line-height: 1; letter-spacing: 0.06em; color: {INK}">НАЧИНКИ</div></div>
{tape(468, 428, 150, -6)}"""
    return cover("Обложка — Начинки, срез", CREAM, body, noise=False)


def vazhno_a():
    body = f"""{photo("barkhat", "Срез красного бархата")}
{text(372, "Важно", f"{VIBES}; font-size: 290px; color: {LIGHT}; {SHADE}", -6)}"""
    return cover("Обложка — Важно, красный бархат", CREAM, body, noise=False)


def deserty_a():
    body = f"""{photo("trifl", "Трайфл со сливочным кремом")}
<div style="position: absolute; left: 230px; right: 230px; top: 770px; height: 150px; border-radius: 75px; background: rgba(255,252,246,0.9); box-shadow: {SHADOW}"></div>
{text(780, "десерты", f"{VIBES}; font-size: 130px; color: {COCOA}")}"""
    return cover("Обложка — Десерты, трайфл", CREAM, body, noise=False)


def ceny_a():
    ring = (f'<svg aria-hidden="true" width="1080" height="1080" style="position: absolute; left: 0; top: 0">'
            f'<circle cx="540" cy="540" r="420" fill="none" stroke="{CARAMEL}" stroke-width="4" stroke-dasharray="14 16" stroke-linecap="round"></circle></svg>')
    body = f"""{ring}
{text(312, "ТОРТЫ · БЕНТО · ТРАЙФЛЫ", f"{CAPS}; font-size: 34px; letter-spacing: 0.16em; color: #DDB08A")}
{text(380, "цены", f"{VIBES}; font-size: 250px; color: {LIGHT}")}
{text(660, "от 9 р", f"{SERIF}; font-style: italic; font-weight: 500; font-size: 104px; color: #DDB08A")}"""
    return cover("Обложка — Цены", DARK_BG, body)


# ---------------------------------------------------------------- alternatives (B)

def otzyvy_b():
    body = f"""{photo("malina", "Малина со сливками в винтажной пиале")}
{text(96, "отзывы", f"{VIBES}; font-size: 176px; color: {COCOA}; {GLOW}")}"""
    return cover("Обложка — Отзывы, малина", CREAM, body, noise=False)


def raboty_b():
    body = f"""{photo("chai", "Торт «время пить чай» с бантами")}
{text(86, "работы", f"{VIBES}; font-size: 168px; color: {COCOA}; {GLOW}")}"""
    return cover("Обложка — Работы, торт", CREAM, body, noise=False)


def nachinki_b():
    body = f"""{photo("banan", "Срез торта банан-карамель")}
<div style="position: absolute; left: 150px; right: 150px; top: 474px; height: 132px; border-radius: 66px; background: rgba(46,32,25,0.86); display: flex; align-items: center; justify-content: center">
<div style="{CAPS}; font-size: 92px; line-height: 1; letter-spacing: 0.08em; color: {LIGHT}">НАЧИНКИ</div></div>"""
    return cover("Обложка — Начинки, банан-карамель", CREAM, body, noise=False)


def vazhno_b():
    body = f"""<div style="position: absolute; left: 200px; top: 300px; width: 680px; box-sizing: border-box; padding: 70px 0 64px; background: {PAPER}; box-shadow: {SHADOW}; transform: rotate(-4deg); text-align: center">
<div style="{CAPS}; font-size: 128px; line-height: 1; letter-spacing: 0.06em; color: {INK}">ВАЖНО</div>
<div style="margin-top: 22px; {VIBES}; font-size: 78px; line-height: 1; color: #8A5634">перед заказом</div></div>
{tape(470, 270, 160, 3)}
{cherry_heart(820, 760, 2.0)}"""
    return cover("Обложка — Важно, записка", CARAMEL, body)


def deserty_b():
    body = f"""{photo("karamel", "Трайфлы с карамелью в коробке")}
<div style="position: absolute; left: 330px; top: 330px; width: 420px; height: 420px; border-radius: 50%; background: {PAPER}; box-shadow: {SHADOW}"></div>
<svg aria-hidden="true" width="1080" height="1080" style="position: absolute; left: 0; top: 0"><circle cx="540" cy="540" r="186" fill="none" stroke="{CARAMEL}" stroke-width="3" stroke-dasharray="10 11" stroke-linecap="round"></circle></svg>
{text(468, "десерты", f"{VIBES}; font-size: 116px; color: {COCOA}")}"""
    return cover("Обложка — Десерты, трайфлы", CREAM, body, noise=False)


def ceny_b():
    stamp = f"""<div style="position: absolute; left: 290px; top: 380px; width: 500px; height: 500px; border-radius: 50%; background: {CARAMEL}; transform: rotate(-6deg); display: flex; flex-direction: column; align-items: center; justify-content: center; color: {LIGHT}">
<svg aria-hidden="true" width="500" height="500" style="position: absolute; left: 0; top: 0"><circle cx="250" cy="250" r="226" fill="none" stroke="{LIGHT}" stroke-width="4" stroke-dasharray="14 15" stroke-linecap="round"></circle></svg>
<div style="{VIBES}; font-size: 76px; line-height: 1">от</div>
<div style="{SERIF}; font-style: italic; font-weight: 500; font-size: 190px; line-height: 0.9">40 р</div>
<div style="{VIBES}; font-size: 64px; line-height: 1">за бенто</div></div>"""
    body = f"""{text(150, "цены", f"{VIBES}; font-size: 220px; color: {COCOA}")}
{stamp}"""
    return cover("Обложка — Цены, штамп", CREAM, body)


SET_A = [("Otzyvy", otzyvy_a), ("Raboty", raboty_a), ("Nachinki", nachinki_a), ("Vazhno", vazhno_a), ("Ceny", ceny_a), ("Deserty", deserty_a)]
SET_B = [("Otzyvy", otzyvy_b), ("Raboty", raboty_b), ("Nachinki", nachinki_b), ("Vazhno", vazhno_b), ("Ceny", ceny_b), ("Deserty", deserty_b)]


def build_highlights():
    for old in PROJECT.glob("Cover-*.dc.html"):
        old.unlink()
    for i, (slug, fn) in enumerate(SET_A, 1):
        (PROJECT / f"Hl-A{i}-{slug}.dc.html").write_text(fn())
    for i, (slug, fn) in enumerate(SET_B, 1):
        (PROJECT / f"Hl-B{i}-{slug}.dc.html").write_text(fn())


if __name__ == "__main__":
    build_highlights()
