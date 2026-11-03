"""The menu set in soft browns, after the client's two references:
- the feed carousel (1080×1350) follows the «menu card» reference: a framed cover, cakes and desserts lists, a «Начинки»
  cover with a flying slice, fillings in cut-through circles and desserts on photos, signed «by Diana» at the top;
- the price stories (1080×1920) follow the price-card reference: a Latin script word over a caps title, centred lists,
  size icons and a portion guide, the logo at the bottom.

Run `python3 tools/build.py` (it calls this module). Fillings and desserts come from tools/fillings.json: a new filling
with a photo and a "circle" crop centre shows up in the lists and the circle grid; past six the grid gets another slide.
"""
import json

from build import CARAMEL, COCOA, PROJECT, ROOT, heart, page, paper_noise
from build_stories import cake_doodle

BEIGE = "#EFE6DC"
LATTE = "#CDB4A2"
MOCHA = "#8A6450"
CHOC = "#5C3B2B"
GOLD = "#C4A27F"
MARK = "/_blob/c983769c94974b17c618d7d6891b1a1d"       # the original avatar in brown, no background
DRAWING = "/_blob/7065785caaf3c4a338b728754059f4bd"    # its heart-cake drawing alone, brown
BANANA = "/_blob/d67acf0d705c6ffc2d5a67853c319c83"     # banana-caramel slice, cut out
SIGN = "by Diana"
ALT = "font-family: 'Montserrat Alternates', sans-serif"   # only for «Меню»: its Cyrillic т and д look like m and g
SERIF = "font-family: 'Cormorant Garamond', serif"
VIBES = "font-family: 'Great Vibes', cursive"
MARCK = "font-family: 'Marck Script', cursive"
MONT = "font-family: 'Montserrat', sans-serif"

FILL = json.loads((ROOT / "tools" / "fillings.json").read_text())
CAKES = [FILL["fillings"][k] for k in FILL["cakes"]]
TRIFLES = [FILL["fillings"][k]["name"].lower() for k in FILL["trifles"]]
DESSERTS = FILL["desserts"]

# Prices as in the old price list (see build_stories.py).
DECOR = "ягоды, шоколадные подтёки, рисунки кремом и другой декор оплачиваются отдельно"


def doodle_tile():
    """One tile of the border pattern: the bakery's own little doodles in thin lines."""
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


def framed(w, h, inner):
    """Beige card: a doodle pattern round the edge and a thin brown frame inside, as on a printed menu."""
    pattern = (f'<svg aria-hidden="true" width="{w}" height="{h}" style="position: absolute; left: 0; top: 0">'
               '<defs><pattern id="doodles" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">'
               f'<g fill="none" stroke="{MOCHA}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.4">{doodle_tile()}</g>'
               '</pattern></defs><rect width="100%" height="100%" fill="url(#doodles)"></rect></svg>')
    return f"""<div style="position: relative; width: {w}px; height: {h}px; overflow: hidden; background: {BEIGE}; color: {COCOA}">
{pattern}
<div style="position: absolute; left: 46px; top: 46px; right: 46px; bottom: 46px; border-radius: 30px; background: {BEIGE}; box-shadow: 0 10px 30px rgba(74,46,36,0.12)"></div>
{paper_noise(w, h, "0.07")}
<div style="position: absolute; left: 66px; top: 66px; right: 66px; bottom: 66px; border: 3px solid {MOCHA}; border-radius: 22px"></div>
{inner}
</div>"""


def vignette(w, h, inner):
    """Soft beige centre fading to latte at the edges, as on the reference's photo slides."""
    return f"""<div style="position: relative; width: {w}px; height: {h}px; overflow: hidden; background: radial-gradient(75% 70% at 50% 48%, #F4EDE5 0%, {BEIGE} 45%, #DCC8B8 78%, #B8957F 100%); color: {COCOA}">
{paper_noise(w, h, "0.07")}
{inner}
</div>"""


def watermark(cx, cy, width, opacity=0.12):
    return (f'<img src="{DRAWING}" alt="" style="position: absolute; left: {cx - width // 2}px; top: {cy - round(width * 0.367)}px; '
            f'width: {width}px; opacity: {opacity}">')


def sign(top=96):
    return f'<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center; {VIBES}; font-size: 64px; line-height: 1; color: {CARAMEL}">{SIGN}</div>'


def divider(top, height):
    return f'<div style="position: absolute; left: 539px; top: {top}px; width: 2px; height: {height}px; background: {MOCHA}; opacity: 0.45"></div>'


def carousel(title, body):
    return page(title, 1080, 1350, body)


def cover():
    inner = f"""<div style="position: absolute; left: 150px; right: 150px; top: 140px; display: flex; justify-content: space-between; {MONT}; font-size: 32px; letter-spacing: 0.04em; color: {MOCHA}"><div>торты</div><div>&amp;</div><div>десерты</div></div>
{watermark(540, 690, 860, 0.16)}
<div style="position: absolute; left: 0; right: 0; top: 560px; text-align: center; {ALT}; font-style: italic; font-weight: 700; font-size: 196px; line-height: 1; letter-spacing: -0.01em; color: {CHOC}">Меню</div>
<div style="position: absolute; left: 590px; top: 740px; {VIBES}; font-size: 84px; line-height: 1; color: {CARAMEL}; transform: rotate(-4deg)">{SIGN}</div>"""
    return carousel("Меню — обложка карусели", framed(1080, 1350, inner))


def title(word, top=128):
    return f'<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center; {MONT}; font-weight: 500; font-size: 108px; line-height: 1; color: {CHOC}">{word}</div>'


def menu_list(items, top, gap):
    rows = "".join(f"""<div>
<div style="{MARCK}; font-size: 54px; line-height: 1.05; color: {CHOC}">{name}</div>
<div style="margin-top: 4px; {MONT}; font-size: 22px; line-height: 1.35; color: {MOCHA}">{desc}</div></div>""" for name, desc in items)
    return f'<div style="position: absolute; left: 140px; right: 150px; top: {top}px; display: flex; flex-direction: column; gap: {gap}px">{rows}</div>'


def cakes():
    inner = f"""{watermark(540, 720, 820, 0.11)}
{title("Торты")}
{menu_list([(f["name"].lower(), f["desc"]) for f in CAKES], 300, 30)}"""
    return carousel("Меню — торты", framed(1080, 1350, inner))


def desserts():
    items = [(d["name"], d["desc"]) for d in DESSERTS] + [("вкусы трайфлов", " · ".join(TRIFLES))]
    inner = f"""{watermark(540, 720, 820, 0.11)}
{title("Десерты")}
{menu_list(items, 400, 150)}"""
    return carousel("Меню — десерты", framed(1080, 1350, inner))


def fillings_cover():
    crumbs = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#E2B877" opacity="0.9"></circle>' for x, y, r in [
        (180, 980, 9), (240, 1060, 6), (860, 400, 8), (930, 480, 5), (820, 1120, 10), (300, 1180, 5), (960, 900, 7), (130, 760, 5),
        (720, 330, 4), (380, 1250, 7)])
    body = f"""<div style="position: relative; width: 1080px; height: 1350px; overflow: hidden; background: radial-gradient(90% 70% at 50% 100%, #D9C1AE 0%, #A57F68 34%, #6E4A39 66%, #4A2E24 100%)">
{paper_noise(1080, 1350, "0.10")}
<svg aria-hidden="true" width="1080" height="1350" style="position: absolute; left: 0; top: 0">{crumbs}</svg>
<img src="{BANANA}" alt="Кусок торта «Банан-карамель» в полёте" style="position: absolute; left: 360px; top: 400px; width: 470px; transform: rotate(-16deg); filter: drop-shadow(0 40px 46px rgba(46,28,20,0.5))">
<div style="position: absolute; left: 80px; top: 110px; {VIBES}; font-size: 232px; line-height: 1; color: #FBF3EA; text-shadow: 0 6px 24px rgba(46,28,20,0.35)">Начинки</div>
</div>"""
    return carousel("Меню — обложка «Начинки»", body)


def circle(f, d):
    cx, cy = f["circle"]
    size = d / 0.30                       # the slice is about a third of the AI collage
    return (f'<div style="position: relative; width: {d}px; height: {d}px; border-radius: 50%; overflow: hidden; '
            f'box-shadow: 0 14px 30px rgba(74,46,36,0.22)">'
            f'<img src="{f["photo"]}" alt="{f["name"]} в разрезе" style="position: absolute; left: {d / 2 - cx * size:.0f}px; '
            f'top: {d / 2 - cy * size:.0f}px; width: {size:.0f}px; height: {size:.0f}px; max-width: none"></div>')


def fillings_grid(items, part, parts):
    cells = "".join(f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 22px">
{circle(f, 250)}
<div style="{MONT}; font-weight: 500; font-size: 34px; line-height: 1; color: {CHOC}">{f["name"].lower()}</div></div>""" for f in items)
    inner = f"""{watermark(540, 700, 900, 0.07)}
{sign()}
{divider(196, 1080)}
<div style="position: absolute; left: 90px; right: 90px; top: 200px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 40px">{cells}</div>"""
    return carousel("Меню — начинки в разрезе" + (f" {part}/{parts}" if parts > 1 else ""), vignette(1080, 1350, inner))


def tile(img, alt, note, pos="center"):
    return f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 22px">
<div style="width: 330px; height: 330px; border-radius: 30px; overflow: hidden; background: #E3CFC0; box-shadow: 0 14px 30px rgba(74,46,36,0.2)">
<img src="{img}" alt="{alt}" style="display: block; width: 100%; height: 100%; object-fit: cover; object-position: {pos}"></div>
<div style="width: 400px; text-align: center; {MONT}; font-size: 24px; line-height: 1.3; color: {CHOC}">{note}</div></div>"""


def desserts_photos():
    tiles = [
        tile("/_blob/339c8b88aa959a2aa969a1ba936be3d5", "Капкейк в разрезе с начинкой", "капкейки с начинкой<br>и кремовой шапочкой", "40% 50%"),
        tile("/_blob/7bfc792d91b16db231881b96670c73e8", "Трайфл «Сникерс»", "трайфл «сникерс» —<br>шоколад, карамель, арахис", "75% 60%"),
        tile("/_blob/e7f5be81caaf56665d59f4c94ec359e5", "Трайфлы с карамелью в коробке", "трайфлы в коробке —<br>от 4 штук"),
        tile("/_blob/aeea293c74e4515e46d893fc34334706", "Трайфл в стаканчике", f"{len(TRIFLES)} вкусов на выбор"),
    ]
    inner = f"""{watermark(540, 700, 900, 0.07)}
{sign()}
{divider(196, 1080)}
<div style="position: absolute; left: 90px; right: 90px; top: 250px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 60px">{"".join(tiles)}</div>"""
    return carousel("Меню — десерты на фото", vignette(1080, 1350, inner))


# ——— Price stories, after the price-card reference ———

def story(title_text, inner):
    body = f"""<div style="position: relative; width: 1080px; height: 1920px; overflow: hidden; background: linear-gradient(180deg, #F2EBE4 0%, {BEIGE} 100%); color: {COCOA}">
{paper_noise(1080, 1920, "0.06")}
{inner}
</div>"""
    return page(title_text, 1080, 1920, body)


def heading(word, script, top, size=96, script_size=150):
    """A thin caps title with a Latin script word in pale gold written over its top-left corner."""
    return f"""<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center">
<div style="position: relative; display: inline-block">
<div style="position: absolute; left: -70px; top: -{round(script_size * 0.62)}px; {VIBES}; font-size: {script_size}px; line-height: 1; color: {GOLD}; opacity: 0.75; white-space: nowrap">{script}</div>
<div style="position: relative; {SERIF}; font-weight: 500; font-size: {size}px; letter-spacing: 0.04em; line-height: 1; color: {CHOC}">{word}</div>
</div></div>"""


def sub(text, top):
    return f'<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center; {MONT}; font-weight: 500; font-size: 34px; letter-spacing: 0.06em; color: {CHOC}">{text}</div>'


def logo(top):
    return f'<img src="{MARK}" alt="Dessertopia" style="position: absolute; left: 455px; top: {top}px; width: 170px">'


def centred_list(items, top, gap, name_size=34):
    rows = "".join(f"""<div style="text-align: center">
<div style="{MONT}; font-weight: 500; font-size: {name_size}px; letter-spacing: 0.08em; line-height: 1.15; color: {CHOC}">{n.upper()}</div>
{f'<div style="margin: 8px auto 0; max-width: 760px; {MONT}; font-size: 24px; line-height: 1.35; color: {MOCHA}">{d}</div>' if d else ""}</div>""" for n, d in items)
    return f'<div style="position: absolute; left: 120px; right: 120px; top: {top}px; display: flex; flex-direction: column; gap: {gap}px">{rows}</div>'


def story_cakes():
    inner = f"""{watermark(890, 1440, 620, 0.08)}
{heading("КАРТА ТОРТОВ", "cakes", 250)}
{sub("(ОТ 55 Р / КГ)", 370)}
{centred_list([(f["name"], f["desc"]) for f in CAKES], 500, 46)}
{logo(1680)}"""
    return story("Меню — карта тортов (история)", inner)


def person(cx, cy):
    return (f'<g transform="translate({cx} {cy})"><circle cx="0" cy="-34" r="30"></circle>'
            '<path d="M-54 52C-54 10 -30 -2 0 -2C30 -2 54 10 54 52Z"></path></g>')


def slice_icon(cx, cy):
    return (f'<g transform="translate({cx} {cy})"><path d="M-70 40L-70 -4L64 -36L70 -4L70 40Z"></path>'
            '<path d="M-70 -4L70 -4M-70 18L70 18"></path><circle cx="40" cy="-44" r="9"></circle></g>')


def story_sizes():
    sizes = [(196, 560, 52, 14, 58, "бенто S", "400 г · Ø 10 см", "40 р"), (414, 546, 62, 16, 70, "бенто M", "700 г · Ø 12 см", "50 р"),
             (642, 530, 74, 19, 84, "1 кг", "Ø 14 см", "60 р"), (872, 512, 88, 22, 100, "1,5–2 кг", "Ø 16–18 см", "55 р / кг")]
    doodles = "".join(cake_doodle(cx, top, rx, ry, h) for cx, top, rx, ry, h, *_r in sizes)
    labels = "".join(f"""<div style="position: absolute; left: {cx - 120}px; top: 730px; width: 240px; text-align: center">
<div style="{MONT}; font-weight: 500; font-size: 26px; letter-spacing: 0.06em; color: {CHOC}">{a.upper()}</div>
<div style="margin-top: 6px; {MONT}; font-size: 21px; color: {MOCHA}">{b}</div>
<div style="margin-top: 6px; {SERIF}; font-style: italic; font-weight: 500; font-size: 38px; color: {CHOC}">{p}</div></div>""" for cx, _t, _x, _y, _h, a, b, p in sizes)
    icons = (f'{person(330, 1250)}<path d="M500 1234C514 1222 526 1222 540 1234C554 1246 566 1246 580 1234'
             f'M500 1258C514 1246 526 1246 540 1258C554 1270 566 1270 580 1258"></path>{slice_icon(760, 1250)}')
    stroke = f'fill="none" stroke="{MOCHA}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"'
    inner = f"""{heading("РАЗМЕРЫ", "sizes", 230)}
<svg role="img" aria-label="Бенто 400 и 700 граммов, торты 1 кг и 1,5–2 кг" width="1080" height="1920" style="position: absolute; left: 0; top: 0" {stroke}>{doodles}</svg>
{labels}
<div style="position: absolute; left: 150px; right: 150px; top: 930px; text-align: center; {MONT}; font-size: 25px; line-height: 1.4; color: {MOCHA}">максимальный вес торта — 2 кг,<br>начинку можно выбрать любую из карты тортов</div>
<div style="position: absolute; left: 0; right: 0; top: 1060px; text-align: center; {MONT}; font-weight: 500; font-size: 34px; letter-spacing: 0.06em; line-height: 1.3; color: {CHOC}">СКОЛЬКО ТОРТА НУЖНО?</div>
<svg aria-hidden="true" width="1080" height="1920" style="position: absolute; left: 0; top: 0" {stroke}>{icons}</svg>
<div style="position: absolute; left: 230px; top: 1326px; width: 200px; text-align: center; {MONT}; font-size: 23px; color: {MOCHA}">один гость</div>
<div style="position: absolute; left: 660px; top: 1326px; width: 200px; text-align: center; {MONT}; font-size: 23px; color: {MOCHA}">150–200 г</div>
<div style="position: absolute; left: 150px; right: 150px; top: 1400px; text-align: center; {MONT}; font-size: 24px; line-height: 1.4; color: {MOCHA}">например, 8 гостей × 200 г = 1,6 кг</div>
<div style="position: absolute; left: 350px; top: 1490px; width: 380px; height: 88px; border-radius: 999px; background: {MOCHA}; display: flex; align-items: center; justify-content: center; {MONT}; font-weight: 500; font-size: 32px; letter-spacing: 0.08em; color: #FBF3EA">ОТ 55 Р / КГ</div>
<div style="position: absolute; left: 150px; right: 150px; top: 1610px; text-align: center; {MONT}; font-size: 22px; line-height: 1.4; color: {MOCHA}">декор оплачивается отдельно<br>самовывоз: м. Аэродромная (Минск Мир)</div>
{logo(1720)}"""
    return story("Меню — размеры и сколько торта (история)", inner)


def story_desserts():
    cupcakes, trifles = DESSERTS
    inner = f"""{watermark(890, 1440, 620, 0.08)}
{heading("КАПКЕЙКИ", "cupcakes", 250)}
{sub(f"({cupcakes['price'].upper()})", 370) if cupcakes["price"] else ""}
<div style="position: absolute; left: 150px; right: 150px; top: {470 if cupcakes['price'] else 400}px; text-align: center; {MONT}; font-size: 26px; line-height: 1.4; color: {MOCHA}">{cupcakes["desc"]}</div>
{heading("ТРАЙФЛЫ", "trifles", 720)}
{sub(f"({trifles['price'].upper()})", 840)}
<div style="position: absolute; left: 150px; right: 150px; top: 920px; text-align: center; {MONT}; font-size: 26px; line-height: 1.4; color: {MOCHA}">{trifles["desc"]}</div>
{centred_list([(t, "") for t in TRIFLES], 1040, 22, 30)}
<div style="position: absolute; left: 150px; right: 150px; top: 1560px; text-align: center; {MONT}; font-size: 22px; line-height: 1.4; color: {MOCHA}">{DECOR}</div>
{logo(1680)}"""
    return story("Меню — капкейки и трайфлы (история)", inner)


def build_menu():
    out = {"Menu-1-Oblozhka": cover(), "Menu-2-Torty": cakes(), "Menu-3-Deserty": desserts(), "Menu-4-Nachinki": fillings_cover()}
    with_photo = [f for f in CAKES if "circle" in f]
    parts = [with_photo[i:i + 6] for i in range(0, len(with_photo), 6)]
    for i, items in enumerate(parts, 1):
        out[f"Menu-5{'abcdefgh'[i - 1] if len(parts) > 1 else ''}-Nachinki-krugi"] = fillings_grid(items, i, len(parts))
    out["Menu-6-Deserty-foto"] = desserts_photos()
    out["Menu-S1-Karta-tortov"] = story_cakes()
    out["Menu-S2-Razmery"] = story_sizes()
    out["Menu-S3-Kapkejki-traifly"] = story_desserts()
    for name, html in out.items():
        (PROJECT / f"{name}.dc.html").write_text(html)
    return list(out)


if __name__ == "__main__":
    build_menu()
