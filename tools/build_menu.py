"""The menu set in layered browns and beiges, after the client's two references:
- the feed carousel (1080×1350) follows the «menu card» reference, opening on the «Начинки» cover: fillings in
  cut-through circles, cakes and desserts lists in a framed card, desserts on photos, signed «by Diana» at the top;
- the price stories (1080×1920) follow the price-card reference: a gilded Latin signature over a caps title, centred
  lists, line icons of the cake sizes, a portion guide and a faded logo at the bottom.

Run `python3 tools/build.py` (it calls this module). Everything on the slides comes from the "menu" part of
tools/fillings.json: a cake listed there with a photo and a "circle" crop centre shows up in the lists and the circle
grid (eight circles to a slide, then another slide).
"""
import json

from build import PROJECT, ROOT, heart, page, paper_noise

# Browns and beiges, darkest to lightest.
ESPRESSO = "#3B2419"
CHOC = "#5C3B2B"
MILK = "#7A5444"
MOCHA = "#8E6A55"
TAUPE = "#A88B78"
CARAMEL = "#B07F55"
LATTE = "#CDB4A2"
SAND = "#DDCBB9"
BEIGE = "#EDE3D8"
CREAM = "#F7F1EA"
# Gold foil: bronze on light backgrounds, pale gold on dark ones.
BRONZE = "linear-gradient(105deg, #6E4C2C 0%, #A9814F 16%, #E2C796 28%, #B8925E 40%, #7E5A35 56%, #CBA977 70%, #9A7344 86%, #6E4C2C 100%)"
GILT = "linear-gradient(100deg, #B48C58 0%, #EED9B0 18%, #FFF4DC 28%, #D3AF77 44%, #F2DDB4 60%, #B68D57 80%, #E8CF9E 100%)"

MARK = "/_blob/c983769c94974b17c618d7d6891b1a1d"       # the original avatar in brown, no background
DRAWING = "/_blob/7065785caaf3c4a338b728754059f4bd"    # its heart-cake drawing alone, brown
BANANA = "/_blob/d67acf0d705c6ffc2d5a67853c319c83"     # banana-caramel slice, cut out
SIGN = "by Diana"
TENOR = "font-family: 'Tenor Sans', sans-serif"
PARIS = "font-family: 'Parisienne', cursive"           # «by Diana», as «by Lilia» on the reference
MADI = "font-family: 'Ms Madi', cursive"               # thin signature words over the story titles
VIBES = "font-family: 'Great Vibes', cursive"
MARCK = "font-family: 'Marck Script', cursive"
MONT = "font-family: 'Montserrat', sans-serif"

FILL = json.loads((ROOT / "tools" / "fillings.json").read_text())
MENU = FILL["menu"]
CAKES = [FILL["fillings"][k] for k in MENU["cakes"]]
CLASSIC = MENU["classic"]
TRIFLES = [t.lower() for t in MENU["trifles"]]
CUPCAKES = MENU["cupcakes"]
ASSORTMENT = MENU["assortment"]



def no_widow(text):
    """Glues the last two words, so a composition never ends on a line of one word."""
    head, sep, tail = text.rpartition(" ")
    return f"{head}&#160;{tail}" if sep else text


def gold(text, css, foil=BRONZE):
    """Gilded text: the gradient is clipped to the letters; the padding keeps script swashes inside the gilt."""
    return (f'<span style="display: inline-block; padding: 0.3em 0.45em; margin: -0.3em -0.45em; background: {foil}; '
            f'-webkit-background-clip: text; background-clip: text; color: transparent; white-space: nowrap; {css}">{text}</span>')


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
    """A cream card with a double brown frame on a sand border of doodles, as on a printed menu."""
    pattern = (f'<svg aria-hidden="true" width="{w}" height="{h}" style="position: absolute; left: 0; top: 0">'
               '<defs><pattern id="doodles" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">'
               f'<g fill="none" stroke="{MILK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.38">{doodle_tile()}</g>'
               '</pattern></defs><rect width="100%" height="100%" fill="url(#doodles)"></rect></svg>')
    return f"""<div style="position: relative; width: {w}px; height: {h}px; overflow: hidden; background: linear-gradient(160deg, {SAND} 0%, {LATTE} 100%); color: {ESPRESSO}">
{pattern}
<div style="position: absolute; left: 46px; top: 46px; right: 46px; bottom: 46px; border-radius: 30px; background: radial-gradient(90% 75% at 50% 40%, {CREAM} 0%, {BEIGE} 70%, #E4D6C8 100%); box-shadow: 0 14px 34px rgba(59,36,25,0.22)"></div>
{paper_noise(w, h, "0.07")}
<div style="position: absolute; left: 64px; top: 64px; right: 64px; bottom: 64px; border: 3px solid {MOCHA}; border-radius: 22px"></div>
<div style="position: absolute; left: 76px; top: 76px; right: 76px; bottom: 76px; border: 1.5px solid {CARAMEL}; border-radius: 14px; opacity: 0.7"></div>
{inner}
</div>"""


def vignette(w, h, inner):
    """Cream in the middle fading through beige and sand to latte and mocha at the edges, as on the reference's photo slides."""
    return f"""<div style="position: relative; width: {w}px; height: {h}px; overflow: hidden; background: radial-gradient(72% 66% at 50% 48%, {CREAM} 0%, {BEIGE} 40%, {SAND} 66%, {LATTE} 84%, {MOCHA} 112%); color: {ESPRESSO}">
{paper_noise(w, h, "0.08")}
{inner}
</div>"""


def watermark(cx, cy, width, opacity=0.12):
    return (f'<img src="{DRAWING}" alt="" style="position: absolute; left: {cx - width // 2}px; top: {cy - round(width * 0.367)}px; '
            f'width: {width}px; opacity: {opacity}">')


def sign(top=88):
    return (f'<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center">'
            f'{gold(SIGN, f"{PARIS}; font-size: 76px; line-height: 1")}</div>')


def divider(top, height):
    return (f'<div style="position: absolute; left: 539px; top: {top}px; width: 2px; height: {height}px; '
            f'background: linear-gradient(180deg, rgba(142,106,85,0) 0%, {MOCHA} 14%, {CARAMEL} 50%, {MOCHA} 86%, rgba(142,106,85,0) 100%)"></div>')


def carousel(title, body):
    return page(title, 1080, 1350, body)


def fillings_cover():
    crumbs = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" opacity="0.9"></circle>' for x, y, r, c in [
        (180, 980, 9, "#E2B877"), (240, 1060, 6, "#C99A5E"), (860, 400, 8, "#E2B877"), (930, 480, 5, "#F0D3A0"), (820, 1120, 10, "#C99A5E"),
        (300, 1180, 5, "#F0D3A0"), (960, 900, 7, "#E2B877"), (130, 760, 5, "#C99A5E"), (720, 330, 4, "#F0D3A0"), (380, 1250, 7, "#E2B877")])
    body = f"""<div style="position: relative; width: 1080px; height: 1350px; overflow: hidden; background: radial-gradient(95% 72% at 52% 100%, #E6D2C0 0%, #C3A08A 20%, {MOCHA} 40%, #6B4636 62%, #4A2E22 82%, {ESPRESSO} 100%)">
<div style="position: absolute; left: 0; top: 0; width: 1080px; height: 1350px; background: radial-gradient(40% 30% at 62% 52%, rgba(240,211,160,0.28) 0%, rgba(240,211,160,0) 100%)"></div>
{paper_noise(1080, 1350, "0.10")}
<svg aria-hidden="true" width="1080" height="1350" style="position: absolute; left: 0; top: 0">{crumbs}</svg>
<img src="{BANANA}" alt="Кусок торта «Банан-карамель» в полёте" style="position: absolute; left: 360px; top: 410px; width: 470px; transform: rotate(-16deg); filter: drop-shadow(0 40px 46px rgba(40,22,14,0.55))">
<div style="position: absolute; left: 80px; top: 104px; filter: drop-shadow(0 6px 18px rgba(40,22,14,0.45))">{gold("Начинки", f"{VIBES}; font-size: 236px; line-height: 1", GILT)}</div>
</div>"""
    return carousel("Начинки — обложка карусели", body)


def circle(f, d):
    cx, cy = f["circle"]
    size = d / 0.30                       # the slice is about a third of the AI collage
    return (f'<div style="padding: 6px; border-radius: 50%; background: {GILT}; box-shadow: 0 16px 32px rgba(59,36,25,0.25)">'
            f'<div style="position: relative; width: {d}px; height: {d}px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 4px {CREAM}">'
            f'<img src="{f["photo"]}" alt="{f["name"]} в разрезе" style="position: absolute; left: {d / 2 - cx * size:.0f}px; '
            f'top: {d / 2 - cy * size:.0f}px; width: {size:.0f}px; height: {size:.0f}px; max-width: none"></div></div>')


def fillings_grid(items, part, parts):
    d, gap = (236, 34) if len(items) <= 6 else (186, 22)
    cells = "".join(f"""<div style="display: flex; flex-direction: column; align-items: center; gap: {gap - 4}px">
{circle(f, d)}
<div style="{MONT}; font-weight: 500; font-size: {34 if d > 200 else 31}px; line-height: 1; color: {CHOC}">{f["name"].lower()}</div></div>""" for f in items)
    inner = f"""{watermark(540, 700, 900, 0.08)}
{sign()}
{divider(196, 1080)}
<div style="position: absolute; left: 90px; right: 90px; top: 206px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: {gap}px">{cells}</div>"""
    return carousel("Начинки в разрезе" + (f" {part}/{parts}" if parts > 1 else ""), vignette(1080, 1350, inner))


def title(word, top=126):
    return (f'<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center">'
            f'{gold(word, f"{MONT}; font-weight: 500; font-size: 108px; line-height: 1")}</div>')


def menu_list(items, top, gap, name_size=54, desc_size=22):
    rows = "".join(f"""<div>
<div style="{MARCK}; font-size: {name_size}px; line-height: 1.05; color: {CHOC}">{name}</div>
<div style="margin-top: 4px; {MONT}; font-size: {desc_size}px; line-height: 1.35; color: {MILK}">{no_widow(desc)}</div></div>""" for name, desc in items)
    return f'<div style="position: absolute; left: 140px; right: 150px; top: {top}px; display: flex; flex-direction: column; gap: {gap}px">{rows}</div>'


def assortment(top):
    return f'<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center; {MONT}; font-weight: 500; font-size: 23px; letter-spacing: 0.04em; color: {CARAMEL}">{ASSORTMENT}</div>'


def cakes():
    inner = f"""{watermark(540, 720, 820, 0.10)}
{title("Торты", 112)}
{assortment(236)}
{menu_list([(f["name"].lower(), f["desc"]) for f in CAKES], 288, 12, 46, 20)}"""
    return carousel("Торты — начинки и состав", framed(1080, 1350, inner))


def classic():
    inner = f"""{watermark(540, 720, 820, 0.10)}
{title("Классические", 112)}
{assortment(236)}
{menu_list([(c["name"].lower(), c["desc"]) for c in CLASSIC], 400, 104)}"""
    return carousel("Классические торты", framed(1080, 1350, inner))


def desserts():
    cupcakes = "".join(f"""<div><div style="{MONT}; font-weight: 500; font-size: 31px; line-height: 1.2; color: {CHOC}">{c["name"]}</div>
{f'<div style="margin-top: 4px; {MONT}; font-size: 23px; line-height: 1.35; color: {MILK}">{no_widow(c["desc"])}</div>' if c["desc"] else ""}</div>""" for c in CUPCAKES)
    inner = f"""{watermark(540, 720, 820, 0.10)}
{title("Десерты")}
<div style="position: absolute; left: 140px; right: 150px; top: 330px; display: flex; flex-direction: column; gap: 18px">
<div style="{MARCK}; font-size: 66px; line-height: 1.05; color: {CHOC}">капкейки</div>
<div style="display: flex; flex-direction: column; gap: 26px">{cupcakes}</div>
<div style="margin-top: 96px; {MARCK}; font-size: 66px; line-height: 1.05; color: {CHOC}">трайфлы</div>
<div style="{MONT}; font-size: 23px; line-height: 1.35; color: {MILK}">{MENU["trifle_desc"]}</div>
<div style="margin-top: 10px; {MONT}; font-weight: 500; font-size: 28px; line-height: 1.6; color: {CHOC}">{" · ".join(TRIFLES)}</div>
</div>"""
    return carousel("Десерты — капкейки и трайфлы", framed(1080, 1350, inner))


def tile(img, alt, note, pos="center"):
    return f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 22px">
<div style="padding: 12px; border-radius: 36px; background: linear-gradient(150deg, {CREAM} 0%, {SAND} 55%, {LATTE} 100%); box-shadow: 0 16px 32px rgba(59,36,25,0.22)">
<div style="width: 310px; height: 310px; border-radius: 26px; overflow: hidden">
<img src="{img}" alt="{alt}" style="display: block; width: 100%; height: 100%; object-fit: cover; object-position: {pos}"></div></div>
<div style="width: 400px; text-align: center; {MONT}; font-size: 24px; line-height: 1.3; color: {CHOC}">{note}</div></div>"""


def desserts_photos():
    tiles = [
        tile("/_blob/339c8b88aa959a2aa969a1ba936be3d5", "Капкейк в разрезе с начинкой", "капкейки с начинкой<br>и кремовой шапочкой", "40% 50%"),
        tile("/_blob/7bfc792d91b16db231881b96670c73e8", "Трайфл «Сникерс»", "трайфл «сникерс» —<br>шоколад, карамель, арахис", "75% 60%"),
        tile("/_blob/e7f5be81caaf56665d59f4c94ec359e5", "Трайфлы с карамелью в коробке", "трайфлы в коробке —<br>от 4 штук"),
        tile("/_blob/aeea293c74e4515e46d893fc34334706", "Трайфл в стаканчике", f"{len(TRIFLES)} вкусов на выбор"),
    ]
    inner = f"""{watermark(540, 700, 900, 0.08)}
{sign()}
{divider(196, 1080)}
<div style="position: absolute; left: 90px; right: 90px; top: 240px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 50px">{"".join(tiles)}</div>"""
    return carousel("Десерты на фото", vignette(1080, 1350, inner))


# ——— Price stories, after the price-card reference ———

WORN = ('<svg aria-hidden="true" width="0" height="0" style="position: absolute"><filter id="worn" x="0" y="0" width="1" height="1">'
        '<feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="7" result="noise"></feTurbulence>'
        '<feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.3" result="keep"></feColorMatrix>'
        '<feComposite in="SourceGraphic" in2="keep" operator="in"></feComposite></filter></svg>')


def story(title_text, inner):
    body = f"""<div style="position: relative; width: 1080px; height: 1920px; overflow: hidden; background: linear-gradient(180deg, {CREAM} 0%, {BEIGE} 55%, #E3D4C5 100%); color: {ESPRESSO}">
<div style="position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; background: radial-gradient(80% 60% at 50% 30%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)"></div>
{paper_noise(1080, 1920, "0.06")}
{WORN}
{inner}
</div>"""
    return page(title_text, 1080, 1920, body)


def heading(word, script, top, size=86, script_size=170):
    """A caps title with a gilded signature word above its left half, as on the price-card reference."""
    return f"""<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center">
<div style="position: relative; display: inline-block">
<div style="position: absolute; left: -30px; top: -{round(script_size * 0.82)}px; opacity: 0.9">{gold(script, f"{MADI}; font-size: {script_size}px; line-height: 1")}</div>
<div style="position: relative; {TENOR}; font-size: {size}px; letter-spacing: 0.03em; line-height: 1; color: {ESPRESSO}">{word}</div>
</div></div>"""


def sub(text, top):
    return f'<div style="position: absolute; left: 0; right: 0; top: {top}px; text-align: center; {MONT}; font-weight: 600; font-size: 32px; letter-spacing: 0.06em; color: {CHOC}">{text}</div>'


def logo(top):
    """The logo small and faded, as if partly rubbed off."""
    return (f'<img src="{MARK}" alt="Dessertopia" style="position: absolute; left: 460px; top: {top}px; width: 160px; '
            f'opacity: 0.72; filter: url(#worn)">')


def corner_drawing():
    """The heart-cake drawing very faint, cut by the bottom-right corner."""
    return f'<img src="{DRAWING}" alt="" style="position: absolute; left: 560px; top: 1400px; width: 720px; opacity: 0.07; transform: rotate(-8deg)">'


def centred_list(items, top, gap, name_size=34):
    rows = "".join(f"""<div style="text-align: center">
<div style="{TENOR}; font-size: {name_size}px; letter-spacing: 0.06em; line-height: 1.15; color: {CHOC}">{n.upper()}</div>
{f'<div style="margin: 8px auto 0; max-width: 760px; {MONT}; font-size: 23px; line-height: 1.35; color: {MILK}">{no_widow(d)}</div>' if d else ""}</div>""" for n, d in items)
    return f'<div style="position: absolute; left: 120px; right: 120px; top: {top}px; display: flex; flex-direction: column; gap: {gap}px">{rows}</div>'


def story_cakes():
    inner = f"""{corner_drawing()}
{heading("КАРТА ТОРТОВ", "Cakes", 250)}
{sub("(ОТ 55 Р / КГ)", 362)}
{assortment(418)}
{centred_list([(f["name"], f["desc"]) for f in CAKES], 510, 30)}
{logo(1710)}"""
    return story("Карта тортов (история)", inner)


def story_classic():
    inner = f"""{corner_drawing()}
{heading("КЛАССИЧЕСКИЕ", "Classic", 250)}
{assortment(380)}
{centred_list([(c["name"], c["desc"]) for c in CLASSIC], 560, 80, 40)}
{logo(1710)}"""
    return story("Классические торты (история)", inner)


def line_cake(cx, base, w, h):
    """A plain line cake: piped cream along the top, a slice cut out at the front showing the layers, on a plate."""
    import math
    rx, ry = w / 2, w * 0.13
    top = base - h
    cut, depth = w * 0.16, h * 0.62
    beads = "".join(f'<circle cx="{cx + rx * 0.92 * math.cos(t):.1f}" cy="{top + ry * 0.92 * math.sin(t) + 2:.1f}" r="{max(3.5, w / 34):.1f}"></circle>'
                    for t in [math.pi * k / 10 for k in range(1, 10)])
    layers = "".join(f'<path d="M{cx - cut:.0f} {top + ry + depth * k:.0f}L{cx:.0f} {top + ry + depth * k + 8:.0f}L{cx + cut:.0f} {top + ry + depth * k:.0f}"></path>'
                     for k in (0.35, 0.7))
    return (f'<ellipse cx="{cx}" cy="{base + ry + 8:.0f}" rx="{rx + 24:.0f}" ry="{ry + 7:.0f}" stroke-opacity="0.45"></ellipse>'
            f'<path d="M{cx - rx:.0f} {top}L{cx - rx:.0f} {base}A{rx:.0f} {ry:.0f} 0 0 0 {cx + rx:.0f} {base}L{cx + rx:.0f} {top}"></path>'
            f'<ellipse cx="{cx}" cy="{top}" rx="{rx:.0f}" ry="{ry:.0f}"></ellipse>{beads}'
            f'<path d="M{cx - cut:.0f} {top + ry:.0f}L{cx - cut:.0f} {top + ry + depth:.0f}Q{cx - cut:.0f} {top + ry + depth + 10:.0f} {cx - cut + 10:.0f} {top + ry + depth + 10:.0f}'
            f'L{cx + cut - 10:.0f} {top + ry + depth + 10:.0f}Q{cx + cut:.0f} {top + ry + depth + 10:.0f} {cx + cut:.0f} {top + ry + depth:.0f}L{cx + cut:.0f} {top + ry:.0f}"></path>'
            f'{layers}')


def person(cx, cy):
    return (f'<g transform="translate({cx} {cy})"><circle cx="0" cy="-34" r="30"></circle>'
            '<path d="M-54 52C-54 10 -30 -2 0 -2C30 -2 54 10 54 52Z"></path></g>')


def slice_icon(cx, cy):
    return (f'<g transform="translate({cx} {cy})"><path d="M-70 40L-70 -4L64 -36L70 -4L70 40Z"></path>'
            '<path d="M-70 -4L70 -4M-70 18L70 18"></path></g>')


def story_sizes():
    sizes = [(196, 82, 70, "бенто S", "400 г · Ø 10 см", "40 р"), (414, 100, 82, "бенто M", "700 г · Ø 12 см", "50 р"),
             (642, 122, 96, "1 кг", "Ø 14 см", "60 р"), (872, 148, 112, "1,5–2 кг", "Ø 16–18 см", "55 р / кг")]
    base = 630
    cakes_svg = "".join(line_cake(cx, base, w, h) for cx, w, h, *_r in sizes)
    labels = "".join(f"""<div style="position: absolute; left: {cx - 120}px; top: 700px; width: 240px; text-align: center">
<div style="{TENOR}; font-size: 27px; letter-spacing: 0.05em; color: {CHOC}">{a.upper()}</div>
<div style="margin-top: 6px; {MONT}; font-size: 21px; color: {MILK}">{b}</div>
<div style="margin-top: 8px; {MONT}; font-weight: 600; font-size: 28px; color: {CARAMEL}">{p}</div></div>""" for cx, _w, _h, a, b, p in sizes)
    icons = (f'{person(330, 1250)}<path d="M500 1234C514 1222 526 1222 540 1234C554 1246 566 1246 580 1234'
             f'M500 1258C514 1246 526 1246 540 1258C554 1270 566 1270 580 1258"></path>{slice_icon(760, 1250)}')
    stroke = f'fill="none" stroke="{MILK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'
    inner = f"""{corner_drawing()}
{heading("РАЗМЕРЫ", "Sizes", 260)}
<svg role="img" aria-label="Бенто 400 и 700 граммов, торты 1 кг и 1,5–2 кг" width="1080" height="1920" style="position: absolute; left: 0; top: 0" {stroke}>{cakes_svg}</svg>
{labels}
<div style="position: absolute; left: 150px; right: 150px; top: 910px; text-align: center; {MONT}; font-size: 25px; line-height: 1.4; color: {MILK}">максимальный вес торта — 2 кг,<br>начинку можно выбрать любую из карты тортов</div>
<div style="position: absolute; left: 0; right: 0; top: 1060px; text-align: center; {TENOR}; font-size: 38px; letter-spacing: 0.05em; line-height: 1.3; color: {ESPRESSO}">СКОЛЬКО ТОРТА НУЖНО?</div>
<svg aria-hidden="true" width="1080" height="1920" style="position: absolute; left: 0; top: 0" {stroke}>{icons}</svg>
<div style="position: absolute; left: 230px; top: 1326px; width: 200px; text-align: center; {MONT}; font-size: 23px; color: {MILK}">один гость</div>
<div style="position: absolute; left: 660px; top: 1326px; width: 200px; text-align: center; {MONT}; font-size: 23px; color: {MILK}">150–200 г</div>
<div style="position: absolute; left: 150px; right: 150px; top: 1400px; text-align: center; {MONT}; font-size: 24px; line-height: 1.4; color: {MILK}">например, 8 гостей × 200 г = 1,6 кг</div>
<div style="position: absolute; left: 350px; top: 1484px; width: 380px; height: 92px; border-radius: 999px; padding: 3px; box-sizing: border-box; background: {GILT}; box-shadow: 0 10px 24px rgba(59,36,25,0.22)">
<div style="width: 100%; height: 100%; border-radius: 999px; background: linear-gradient(180deg, #B39181 0%, {MOCHA} 55%, #7A5646 100%); display: flex; align-items: center; justify-content: center; {MONT}; font-weight: 600; font-size: 32px; letter-spacing: 0.08em; color: {CREAM}">ОТ 55 Р / КГ</div></div>
<div style="position: absolute; left: 150px; right: 150px; top: 1610px; text-align: center; {MONT}; font-size: 22px; line-height: 1.4; color: {MILK}">декор оплачивается отдельно<br>самовывоз: м. Аэродромная (Минск Мир)</div>
{logo(1730)}"""
    return story("Размеры и сколько торта (история)", inner)


def story_desserts():
    price = MENU["cupcake_price"]
    inner = f"""{corner_drawing()}
{heading("КАПКЕЙКИ", "Cupcakes", 250)}
{sub(f"({price.upper()})", 362) if price else ""}
{centred_list([(c["name"], c["desc"]) for c in CUPCAKES], 440 if price else 390, 24, 30)}
{heading("ТРАЙФЛЫ", "Trifles", 900)}
{sub(f"({MENU['trifle_price'].upper()})", 1012)}
<div style="position: absolute; left: 150px; right: 150px; top: 1076px; text-align: center; {MONT}; font-size: 23px; line-height: 1.4; color: {MILK}">{MENU["trifle_desc"]}</div>
{centred_list([(t, "") for t in TRIFLES], 1146, 12, 28)}
{logo(1730)}"""
    return story("Капкейки и трайфлы (история)", inner)


def build_menu():
    out = {"Menu-1-Nachinki": fillings_cover()}
    with_photo = [f for f in CAKES if "circle" in f]
    parts = [with_photo[i:i + 8] for i in range(0, len(with_photo), 8)]
    for i, items in enumerate(parts, 1):
        out[f"Menu-2{'abcdefgh'[i - 1] if len(parts) > 1 else ''}-Nachinki-krugi"] = fillings_grid(items, i, len(parts))
    out["Menu-3-Torty"] = cakes()
    out["Menu-4-Klassicheskie"] = classic()
    out["Menu-5-Deserty"] = desserts()
    out["Menu-6-Deserty-foto"] = desserts_photos()
    out["Menu-S1-Karta-tortov"] = story_cakes()
    out["Menu-S2-Klassicheskie"] = story_classic()
    out["Menu-S3-Razmery"] = story_sizes()
    out["Menu-S4-Kapkejki-traifly"] = story_desserts()
    for name, html in out.items():
        (PROJECT / f"{name}.dc.html").write_text(html)
    return list(out)


if __name__ == "__main__":
    build_menu()
