"""The menu set: a feed carousel (1080×1350) and price stories (1080×1920) in a framed «menu card» style,
in the wine and beige of the original avatar, with its heart-cake drawing as a watermark.

Run `python3 tools/build.py` (it calls this module). Fillings come from tools/fillings.json: a new filling with
a photo and a "circle" crop centre shows up in the lists and the circle grid; past six the grid gets another slide.
"""
import json

from build import CARAMEL, CARAMEL_TEXT, COCOA, PAPER, PROJECT, ROOT, heart, page, paper_noise
from build_stories import cake_doodle

WINE = "#791626"
WINE_DEEP = "#5A0E1B"
BEIGE = "#EFE6DC"
MARK = "/_blob/f09b420efa8dd89f4f49c8dcad68c2db"       # the original avatar without its background
DRAWING = "/_blob/632a6eb56cd5275a5a901ad230dd9337"    # its heart-cake drawing alone
VELVET = "/_blob/aa09a6fc09ca924ef383f077895fb3af"     # red velvet slice, cut out
SERIF = "font-family: 'Cormorant Garamond', serif"
VIBES = "font-family: 'Great Vibes', cursive"
MONT = "font-family: 'Montserrat', sans-serif"

FILL = json.loads((ROOT / "tools" / "fillings.json").read_text())
CAKES = [FILL["fillings"][k] for k in FILL["cakes"]]
TRIFLES = [FILL["fillings"][k]["name"].lower() for k in FILL["trifles"]]

# Prices as in the old price list (see build_stories.py).
BENTO = [("Бенто мини", "размер S · 400 г · Ø 10 см", "40 р"), ("Бенто макси", "размер M · 700 г · Ø 12 см", "50 р")]
DECOR = "ягоды, шоколадные подтёки, рисунки кремом и другой декор оплачиваются отдельно"


def doodle_tile():
    """One tile of the border pattern: the bakery's own little doodles in thin wine lines."""
    bow = ("M-4 0C-30 -30 -70 -22 -62 2C-56 20 -24 12 -4 0ZM4 0C30 -30 70 -22 62 2C56 20 24 12 4 0Z"
           "M-4 4C-14 24 -26 46 -40 62M4 4C12 26 22 46 36 64")
    return (f'<path d="{heart(40, 40, 0.9)}"></path>'
            '<g transform="translate(140 46) rotate(-12)"><path d="M-22 0L-17 30L17 30L22 0Z"></path>'
            '<path d="M-26 0C-30 -20 -8 -22 0 -30C8 -22 30 -20 26 0Z"></path><circle cx="0" cy="-36" r="6"></circle>'
            '<path d="M-11 4L-9 26M0 4L0 26M11 4L9 26"></path></g>'
            f'<g transform="translate(52 142) scale(0.36) rotate(10)"><path d="{bow}"></path></g>'
            '<g transform="translate(150 150) rotate(14)"><circle cx="-12" cy="14" r="10"></circle><circle cx="12" cy="18" r="10"></circle>'
            '<path d="M-12 4C-10 -10 -2 -20 6 -26M12 8C10 -6 8 -16 6 -26M6 -26C14 -32 24 -30 28 -24C20 -20 12 -22 6 -26Z"></path></g>'
            '<g transform="translate(100 100)"><path d="M-8 0L8 0M0 -8L0 8"></path></g>')


def card(w, h, inner):
    """Beige card: a doodle pattern round the edge and a thin wine frame inside, as on a printed menu."""
    pattern = (f'<svg aria-hidden="true" width="{w}" height="{h}" style="position: absolute; left: 0; top: 0">'
               '<defs><pattern id="doodles" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">'
               f'<g fill="none" stroke="{WINE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.32">{doodle_tile()}</g>'
               '</pattern></defs><rect width="100%" height="100%" fill="url(#doodles)"></rect></svg>')
    return f"""<div style="position: relative; width: {w}px; height: {h}px; overflow: hidden; background: {BEIGE}; {SERIF}; color: {COCOA}">
{pattern}
<div style="position: absolute; left: 46px; top: 46px; right: 46px; bottom: 46px; border-radius: 30px; background: {BEIGE}; box-shadow: 0 10px 30px rgba(90,14,27,0.10)"></div>
{paper_noise(w, h, "0.07")}
<div style="position: absolute; left: 66px; top: 66px; right: 66px; bottom: 66px; border: 3px solid {WINE}; border-radius: 22px"></div>
{inner}
</div>"""


def watermark(cx, cy, width, opacity=0.11):
    return (f'<img src="{DRAWING}" alt="" style="position: absolute; left: {cx - width // 2}px; top: {cy - round(width * 0.367)}px; '
            f'width: {width}px; opacity: {opacity}">')


def heading(word, script, top, size=150, script_size=124):
    """A serif title with a Latin script word written over its top-left corner."""
    return f"""<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center">
<div style="position: relative; display: inline-block">
<div style="position: absolute; left: -64px; top: -{round(script_size * 0.42)}px; {VIBES}; font-size: {script_size}px; line-height: 1; color: {CARAMEL}; opacity: 0.75; white-space: nowrap">{script}</div>
<div style="position: relative; {SERIF}; font-weight: 600; font-size: {size}px; line-height: 1; color: {WINE}">{word}</div>
</div></div>"""


def footer_mark(w, h):
    return (f'<img src="{MARK}" alt="Dessertopia" style="position: absolute; left: {w - 204}px; top: {h - 186}px; width: 104px">')


def carousel(title, inner):
    return page(title, 1080, 1350, card(1080, 1350, inner))


def story(title, inner):
    return page(title, 1080, 1920, card(1080, 1920, inner))


def cover():
    inner = f"""<div style="position: absolute; left: 120px; right: 120px; top: 132px; display: flex; justify-content: space-between; {MONT}; font-weight: 500; font-size: 24px; letter-spacing: 0.32em; color: {WINE}"><div>ТОРТЫ</div><div>·</div><div>БЕНТО</div><div>·</div><div>ТРАЙФЛЫ</div></div>
{watermark(540, 690, 880, 0.12)}
<div style="position: absolute; left: 0; right: 0; top: 452px; text-align: center; {SERIF}; font-style: italic; font-weight: 600; font-size: 300px; line-height: 1; color: {WINE}">Меню</div>
<div style="position: absolute; left: 520px; top: 712px; {VIBES}; font-size: 112px; line-height: 1; color: {CARAMEL}; transform: rotate(-6deg)">dessertopia</div>
<div style="position: absolute; left: 0; right: 0; top: 1150px; text-align: center; {MONT}; font-weight: 500; font-size: 24px; letter-spacing: 0.3em; color: {COCOA}">МИНСК · ЗАКАЗ ЗА 3–4 ДНЯ</div>
<div style="position: absolute; right: 128px; top: 1200px; {VIBES}; font-size: 48px; color: {CARAMEL_TEXT}">листайте →</div>"""
    return carousel("Меню — обложка карусели", inner)


def cakes():
    rows = "".join(f"""<div>
<div style="{VIBES}; font-size: 58px; line-height: 1.02; color: {WINE}">{f["name"]}</div>
<div style="margin-top: 2px; {MONT}; font-size: 22px; line-height: 1.35; color: {COCOA}">{f["desc"]}</div></div>""" for f in CAKES)
    inner = f"""{watermark(540, 760, 800, 0.08)}
{heading("Торты", "cakes", 136)}
<div style="position: absolute; left: 0; right: 0; top: 308px; text-align: center; {MONT}; font-weight: 500; font-size: 24px; letter-spacing: 0.24em; color: {CARAMEL_TEXT}">ОТ 55 Р / КГ · ДО 2 КГ</div>
<div style="position: absolute; left: 130px; right: 130px; top: 356px; display: flex; flex-direction: column; gap: 14px">{rows}</div>
{footer_mark(1080, 1350)}"""
    return carousel("Меню — торты", inner)


def price_row(name, note, price):
    return f"""<div style="display: flex; align-items: flex-end; gap: 18px">
<div style="flex: none"><div style="{VIBES}; font-size: 68px; line-height: 1.05; color: {WINE}">{name}</div>
<div style="{MONT}; font-size: 24px; line-height: 1.3; color: {COCOA}">{note}</div></div>
<div style="flex: 1; margin-bottom: 14px; border-bottom: 3px dotted {CARAMEL}"></div>
<div style="flex: none; {SERIF}; font-style: italic; font-weight: 600; font-size: 64px; line-height: 1; color: {WINE}">{price}</div></div>"""


def desserts():
    rows = "".join(price_row(*b) for b in BENTO) + price_row("Трайфлы", "от 4 штук", "9 р")
    inner = f"""{watermark(540, 760, 800, 0.08)}
{heading("Десерты", "desserts", 136)}
<div style="position: absolute; left: 0; right: 0; top: 308px; text-align: center; {MONT}; font-weight: 500; font-size: 24px; letter-spacing: 0.24em; color: {CARAMEL_TEXT}">БЕНТО · ТРАЙФЛЫ</div>
<div style="position: absolute; left: 130px; right: 130px; top: 400px; display: flex; flex-direction: column; gap: 46px">{rows}</div>
<div style="position: absolute; left: 130px; right: 130px; top: 920px">
<div style="{MONT}; font-weight: 500; font-size: 22px; letter-spacing: 0.24em; color: {CARAMEL_TEXT}">ВКУСЫ ТРАЙФЛОВ</div>
<div style="margin-top: 10px; {SERIF}; font-style: italic; font-size: 38px; line-height: 1.25; color: {COCOA}">{" · ".join(TRIFLES)}</div></div>
<div style="position: absolute; left: 130px; width: 560px; top: 1150px; {MONT}; font-size: 21px; line-height: 1.4; color: {COCOA}">{DECOR}</div>
{footer_mark(1080, 1350)}"""
    return carousel("Меню — десерты", inner)


def fillings_cover():
    crumbs = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#9E2236"></circle>' for x, y, r in [
        (180, 980, 9), (240, 1060, 6), (860, 400, 8), (930, 480, 5), (820, 1120, 10), (300, 1180, 5), (960, 900, 7), (130, 760, 5)])
    body = f"""<div style="position: relative; width: 1080px; height: 1350px; overflow: hidden; background: radial-gradient(120% 90% at 60% 55%, #8E1E31 0%, {WINE} 45%, {WINE_DEEP} 100%); {SERIF}">
{paper_noise(1080, 1350, "0.10")}
<svg aria-hidden="true" width="1080" height="1350" style="position: absolute; left: 0; top: 0">{crumbs}</svg>
<div style="position: absolute; left: 0; right: 0; top: 1240px; height: 110px; background: linear-gradient(180deg, rgba(90,14,27,0), rgba(60,8,18,0.45))"></div>
<img src="{VELVET}" alt="Кусок торта «Красный бархат» в полёте" style="position: absolute; left: 330px; top: 420px; width: 470px; transform: rotate(-14deg); filter: drop-shadow(0 40px 50px rgba(30,4,10,0.55))">
<div style="position: absolute; left: 86px; top: 120px; {VIBES}; font-size: 230px; line-height: 1; color: #FBF1E6; text-shadow: 0 6px 24px rgba(30,4,10,0.35)">Начинки</div>
<div style="position: absolute; left: 100px; top: 1214px; {MONT}; font-weight: 500; font-size: 24px; letter-spacing: 0.3em; color: #F3DCCB">{len(CAKES)} ВКУСОВ · ЛИСТАЙТЕ →</div>
<div style="position: absolute; right: 86px; top: 1190px; {VIBES}; font-size: 60px; color: #F3DCCB">dessertopia</div>
</div>"""
    return page("Меню — обложка «Начинки»", 1080, 1350, body)


def circle(f, d):
    cx, cy = f["circle"]
    size = d / 0.30                       # the slice is about a third of the AI collage
    return (f'<div style="position: relative; width: {d}px; height: {d}px; border-radius: 50%; overflow: hidden; '
            f'box-shadow: 0 0 0 7px {PAPER}, 0 14px 30px rgba(90,14,27,0.22)">'
            f'<img src="{f["photo"]}" alt="{f["name"]} в разрезе" style="position: absolute; left: {d / 2 - cx * size:.0f}px; '
            f'top: {d / 2 - cy * size:.0f}px; width: {size:.0f}px; height: {size:.0f}px; max-width: none"></div>')


def fillings_grid(items, part, parts):
    cells = "".join(f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 18px">
{circle(f, 236)}
<div style="text-align: center"><div style="{SERIF}; font-style: italic; font-weight: 600; font-size: 44px; line-height: 1; color: {WINE}">{f["name"].lower()}</div>
<div style="margin-top: 6px; {MONT}; font-size: 20px; color: {CARAMEL_TEXT}">{f["mood"]}</div></div></div>""" for f in items)
    counter = f" · {part} / {parts}" if parts > 1 else ""
    inner = f"""<div style="position: absolute; left: 0; right: 0; top: 104px; text-align: center; {VIBES}; font-size: 64px; line-height: 1; color: {CARAMEL}">начинки{counter}</div>
<div style="position: absolute; left: 539px; top: 214px; width: 2px; height: 1010px; background: {WINE}; opacity: 0.35"></div>
<div style="position: absolute; left: 110px; right: 110px; top: 214px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 34px">{cells}</div>"""
    return carousel("Меню — начинки в разрезе" + (f" {part}/{parts}" if parts > 1 else ""), inner)


def tile(img, alt, name, note, pos="center"):
    return f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 16px">
<div style="width: 360px; height: 400px; border-radius: 34px; overflow: hidden; box-shadow: 0 0 0 7px {PAPER}, 0 16px 34px rgba(90,14,27,0.22)">
<img src="{img}" alt="{alt}" style="display: block; width: 100%; height: 100%; object-fit: cover; object-position: {pos}"></div>
<div style="text-align: center"><div style="{SERIF}; font-style: italic; font-weight: 600; font-size: 42px; line-height: 1; color: {WINE}">{name}</div>
<div style="margin-top: 6px; {MONT}; font-size: 20px; color: {CARAMEL_TEXT}">{note}</div></div></div>"""


def desserts_photos():
    tiles = [
        tile("/_blob/e7f5be81caaf56665d59f4c94ec359e5", "Трайфлы с карамелью в коробке", "трайфлы", "9 р · от 4 штук"),
        tile("/_blob/aeea293c74e4515e46d893fc34334706", "Ванильный трайфл", "в стаканчиках", "7 вкусов на выбор"),
        tile("/_blob/43c87a7532c29142ce5b92c4407abf10", "Бенто с котом и надписью", "бенто мини", "400 г · 40 р"),
        tile("/_blob/b86bd47934a448385ca390fc4c721a0d", "Бенто с надписью «Будь счастлива»", "бенто макси", "700 г · 50 р"),
    ]
    inner = f"""<div style="position: absolute; left: 0; right: 0; top: 104px; text-align: center; {VIBES}; font-size: 64px; line-height: 1; color: {CARAMEL}">десерты</div>
<div style="position: absolute; left: 539px; top: 214px; width: 2px; height: 1010px; background: {WINE}; opacity: 0.35"></div>
<div style="position: absolute; left: 110px; right: 110px; top: 214px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 40px">{"".join(tiles)}</div>"""
    return carousel("Меню — десерты на фото", inner)


def story_cakes():
    rows = "".join(f"""<div style="text-align: center">
<div style="{SERIF}; font-weight: 600; font-size: 46px; letter-spacing: 0.08em; line-height: 1.1; color: {WINE}">{f["name"].upper()}</div>
<div style="margin: 8px auto 0; max-width: 760px; {MONT}; font-size: 25px; line-height: 1.35; color: {COCOA}">{f["desc"]}</div></div>""" for f in CAKES)
    inner = f"""{watermark(540, 1500, 900, 0.07)}
{heading("КАРТА ТОРТОВ", "cakes", 200, 104, 130)}
<div style="position: absolute; left: 0; right: 0; top: 330px; text-align: center; {SERIF}; font-weight: 500; font-size: 50px; color: {WINE}">(от 55 р / кг)</div>
<div style="position: absolute; left: 110px; right: 110px; top: 470px; display: flex; flex-direction: column; gap: 40px">{rows}</div>
<img src="{MARK}" alt="Dessertopia" style="position: absolute; left: 450px; top: 1650px; width: 180px">"""
    return story("Меню — карта тортов (история)", inner)


def person(cx, cy):
    return (f'<g transform="translate({cx} {cy})"><circle cx="0" cy="-34" r="30"></circle>'
            '<path d="M-54 52C-54 10 -30 -2 0 -2C30 -2 54 10 54 52Z"></path></g>')


def slice_icon(cx, cy):
    return (f'<g transform="translate({cx} {cy})"><path d="M-70 40L-70 -4L64 -36L70 -4L70 40Z"></path>'
            '<path d="M-70 -4L70 -4M-70 18L70 18"></path><circle cx="40" cy="-44" r="9"></circle></g>')


def story_sizes():
    sizes = [(196, 480, 52, 14, 58, "бенто S", "400 г · Ø 10 см"), (414, 466, 62, 16, 70, "бенто M", "700 г · Ø 12 см"),
             (642, 450, 74, 19, 84, "1 кг", "Ø 14 см"), (872, 432, 88, 22, 100, "1,5–2 кг", "Ø 16–18 см")]
    doodles = "".join(cake_doodle(cx, top, rx, ry, h, cherries=(i == 3)) for i, (cx, top, rx, ry, h, *_r) in enumerate(sizes))
    labels = "".join(f"""<div style="position: absolute; left: {cx - 120}px; top: 650px; width: 240px; text-align: center">
<div style="{SERIF}; font-style: italic; font-weight: 600; font-size: 44px; line-height: 1; color: {WINE}">{a}</div>
<div style="margin-top: 6px; {MONT}; font-size: 21px; color: {COCOA}">{b}</div></div>""" for cx, _t, _x, _y, _h, a, b in sizes)
    icons = (f'{person(330, 1130)}<path d="M500 1114C514 1102 526 1102 540 1114C554 1126 566 1126 580 1114'
             f'M500 1138C514 1126 526 1126 540 1138C554 1150 566 1150 580 1138"></path>{slice_icon(760, 1130)}')
    inner = f"""{heading("РАЗМЕРЫ", "sizes", 170, 104, 130)}
<svg role="img" aria-label="Бенто 400 и 700 граммов, торты 1 кг и 1,5–2 кг" width="1080" height="1920" style="position: absolute; left: 0; top: 0" fill="none" stroke="{WINE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">{doodles}</svg>
{labels}
<div style="position: absolute; left: 130px; right: 130px; top: 790px; text-align: center; {MONT}; font-size: 26px; line-height: 1.4; color: {COCOA}">торт 1 кг — 60 р · от 1,5 кг — 55 р за кг<br>максимальный вес — 2 кг</div>
<div style="position: absolute; left: 0; right: 0; top: 920px; text-align: center; {SERIF}; font-weight: 600; font-size: 50px; letter-spacing: 0.06em; line-height: 1.15; color: {WINE}">СКОЛЬКО ТОРТА<br>НУЖНО?</div>
<svg aria-hidden="true" width="1080" height="1920" style="position: absolute; left: 0; top: 0" fill="none" stroke="{WINE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">{icons}</svg>
<div style="position: absolute; left: 230px; top: 1206px; width: 200px; text-align: center; {MONT}; font-size: 24px; color: {COCOA}">один гость</div>
<div style="position: absolute; left: 660px; top: 1206px; width: 200px; text-align: center; {MONT}; font-size: 24px; color: {COCOA}">150–200 г</div>
<div style="position: absolute; left: 150px; right: 150px; top: 1290px; text-align: center; {MONT}; font-size: 25px; line-height: 1.4; color: {COCOA}">например, 8 гостей × 200 г = 1,6 кг.<br>Больше 2 кг — возьмите торт и трайфлы к нему</div>
<div style="position: absolute; left: 340px; top: 1470px; width: 400px; height: 96px; border-radius: 999px; background: {WINE}; display: flex; align-items: center; justify-content: center; {MONT}; font-weight: 600; font-size: 34px; letter-spacing: 0.08em; color: #FBF1E6">ОТ 55 Р / КГ</div>
<div style="position: absolute; left: 150px; right: 150px; top: 1600px; text-align: center; {MONT}; font-size: 23px; line-height: 1.4; color: {COCOA}">декор оплачивается отдельно · самовывоз: м. Аэродромная</div>
<img src="{MARK}" alt="Dessertopia" style="position: absolute; left: 465px; top: 1690px; width: 150px">"""
    return story("Меню — размеры и сколько торта (история)", inner)


def story_desserts():
    rows = "".join(f"""<div style="text-align: center">
<div style="{SERIF}; font-weight: 600; font-size: 50px; letter-spacing: 0.08em; line-height: 1.1; color: {WINE}">{n.upper()}</div>
<div style="margin-top: 6px; {MONT}; font-size: 25px; color: {COCOA}">{note}</div>
<div style="margin-top: 4px; {SERIF}; font-style: italic; font-weight: 600; font-size: 50px; color: {CARAMEL_TEXT}">{p}</div></div>""" for n, note, p in BENTO)
    inner = f"""{watermark(540, 1480, 900, 0.07)}
{heading("БЕНТО", "bento", 200, 104, 130)}
<div style="position: absolute; left: 110px; right: 110px; top: 380px; display: flex; flex-direction: column; gap: 44px">{rows}</div>
{heading("ТРАЙФЛЫ", "trifles", 900, 104, 130)}
<div style="position: absolute; left: 0; right: 0; top: 1040px; text-align: center; {SERIF}; font-weight: 500; font-size: 50px; color: {WINE}">(9 р / шт · от 4 штук)</div>
<div style="position: absolute; left: 140px; right: 140px; top: 1140px; text-align: center; {SERIF}; font-style: italic; font-size: 42px; line-height: 1.3; color: {COCOA}">{"<br>".join(TRIFLES)}</div>
<div style="position: absolute; left: 150px; right: 150px; top: 1560px; text-align: center; {MONT}; font-size: 23px; line-height: 1.4; color: {COCOA}">{DECOR}</div>
<img src="{MARK}" alt="Dessertopia" style="position: absolute; left: 465px; top: 1680px; width: 150px">"""
    return story("Меню — бенто и трайфлы (история)", inner)


def build_menu():
    out = {"Menu-1-Oblozhka": cover(), "Menu-2-Torty": cakes(), "Menu-3-Deserty": desserts(), "Menu-4-Nachinki": fillings_cover()}
    with_photo = [f for f in CAKES if "circle" in f]
    parts = [with_photo[i:i + 6] for i in range(0, len(with_photo), 6)]
    for i, items in enumerate(parts, 1):
        out[f"Menu-5{'abcdefgh'[i - 1] if len(parts) > 1 else ''}-Nachinki-krugi"] = fillings_grid(items, i, len(parts))
    out["Menu-6-Deserty-foto"] = desserts_photos()
    out["Menu-S1-Karta-tortov"] = story_cakes()
    out["Menu-S2-Razmery"] = story_sizes()
    out["Menu-S3-Bento-traifly"] = story_desserts()
    for name, html in out.items():
        (PROJECT / f"{name}.dc.html").write_text(html)
    return list(out)


if __name__ == "__main__":
    build_menu()
