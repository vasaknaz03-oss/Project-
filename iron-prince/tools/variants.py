"""Richer directions of the Iron Prince profile in the same palette.

Called from build.py: every artboard here is written next to the main set and
rendered into export/05-varianty/. Three directions, same content:

    V1 «Коллаж»  — stickers, tape, polaroids, stamps, the mascot all over
    V2 «Контраст» — ink and paper blocks, big type, running lines, crest pattern
    V3 «Журнал»  — magazine grid, issue numbers, a labelled PC blueprint
"""
import build as b
from build import PAPER, CARD, INK, SOFT, MUTED, RED, HAIR, LINE, PHONE, HANDLE, NAME, BIO
from build import mascot, monogram, crest, icon, wordmark, FAN_BODY, FAN_BLADE, GOLD

DEEP = "#E2D7CC"      # a darker paper for blocks
CHEEK = "#EFA3AE"
INKSOFT = "#3A3632"

FONTS = (
    '<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400'
    '&amp;family=Poppins:wght@300;400&amp;family=Manrope:wght@400;600;800'
    '&amp;family=Unbounded:wght@400;600;800&amp;display=swap" rel="stylesheet">'
)
SERIF = "font-family: 'Lora', serif"
SANS = "font-family: 'Manrope', sans-serif"
WIDE = "font-family: 'Unbounded', sans-serif"

SERVICES = [
    ("sborka", "Сборка ПК", "Подбор под задачу и бюджет, аккуратные кабели, стресс-тесты"),
    ("chistka", "Чистка", "Пыль, термопаста, прокладки. ПК, ноутбуки, видеокарты"),
    ("nastroyka", "Настройка", "Windows, драйверы, BIOS, тихие кривые вентиляторов"),
]
CHIPS = ["SSD", "память", "термопаста", "Windows", "апгрейд", "ноутбуки", "BIOS", "кабель-менеджмент"]
STEPS = [
    ("Пишете в директ", "Рассказываете задачу. Консультация бесплатная."),
    ("Договариваемся", "Называю стоимость и срок до начала работ."),
    ("Делаю работу", "Фото при приёме, всё согласую по ходу."),
    ("Забираете", "Фотоотчёт, температуры, гарантия 1 месяц."),
]
SIGNS = [
    ("Шумит", "вентиляторы воют даже в простое"),
    ("Греется", "корпус горячий, в играх за 85°"),
    ("Тормозит в играх", "просадки FPS из-за перегрева"),
    ("Выключается сам", "срабатывает защита от температуры"),
    ("Не чистили больше года", "пыль и сухая паста — точно пора"),
]
FACTS = [("60+", "отзывов 5★<br>на Kufar"), ("1 мес", "гарантия<br>на работу"), ("0", "скрытых<br>доплат"), ("100%", "фотоотчёт<br>о работе")]
PARTS = [("Процессор", "sborka"), ("Видеокарта", "gpu"), ("Память", "ram"), ("SSD", "ssd"),
         ("Охлаждение", "chistka"), ("Блок питания", "psu"), ("Мат. плата", "plata"), ("Корпус", "korpus")]
HIGHLIGHTS = b.HIGHLIGHTS
PW, PH = 1080, 1440
SW, SH = 1080, 1920

_ids = [0]


def uid(p="u"):
    _ids[0] += 1
    return f"{p}{_ids[0]}"


def page(title, w, h, body):
    return b.page(title, w, h, body).replace(b.FONTS, FONTS)


def P(x, y, w=None, h=None, extra=""):
    s = f"position: absolute; left: {x}px; top: {y}px;"
    if w is not None:
        s += f" width: {w}px;"
    if h is not None:
        s += f" height: {h}px;"
    return s + " " + extra


def box(x, y, w, h, inner="", extra=""):
    return f'<div style="{P(x, y, w, h, extra)}">{inner}</div>'


def t(text, size, color=INK, font=SANS, weight=400, extra=""):
    return f'<div style="{font}; font-weight: {weight}; font-size: {size}px; line-height: 1.25; color: {color}; {extra}">{text}</div>'


def head(text, size, color=INK, extra=""):
    return f'<div style="{SERIF}; font-style: italic; font-weight: 400; font-size: {size}px; line-height: 1.02; letter-spacing: -0.01em; color: {color}; {extra}">{text}</div>'


def caps(text, size=22, color=MUTED, extra="", spacing=0.28):
    return f'<div style="{SANS}; font-weight: 800; font-size: {size}px; letter-spacing: {spacing}em; color: {color}; {extra}">{text}</div>'


def mark(word, color=GOLD):
    """Marker highlight under a word in a heading."""
    return f'<span style="background: linear-gradient(transparent 58%, {color} 58%, {color} 92%, transparent 92%); padding: 0 6px">{word}</span>'


def rot(deg):
    return f"transform: rotate({deg}deg);"


# ---------- decorative pieces ----------

def dots(color="rgba(36,33,30,0.13)", step=34, r=2.2):
    return (f'<div style="position: absolute; inset: 0; background-image: radial-gradient({color} {r}px, transparent {r + 0.6}px); '
            f'background-size: {step}px {step}px"></div>')


def grid_bg(color="rgba(36,33,30,0.07)", step=60):
    return (f'<div style="position: absolute; inset: 0; background-image: linear-gradient({color} 1.5px, transparent 1.5px), '
            f'linear-gradient(90deg, {color} 1.5px, transparent 1.5px); background-size: {step}px {step}px"></div>')


def pattern(color="rgba(237,230,223,0.07)", size=120, keys=("sborka", "chistka", "nastroyka", "garantiya")):
    """Wallpaper of the four crest fields."""
    cells = "".join(f'<g transform="translate({(i % 2) * size} {(i // 2) * size}) translate({size * 0.25} {size * 0.25}) scale({size * 0.5 / 100})">{b.ICONS[k].replace("BG", "none").replace("SW2", "10")}</g>'
                    for i, k in enumerate(keys))
    pid = uid("pt")
    return (f'<svg aria-hidden="true" width="100%" height="100%" style="position: absolute; inset: 0"><defs>'
            f'<pattern id="{pid}" width="{size * 2}" height="{size * 2}" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">'
            f'<g fill="none" stroke="{color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">{cells}</g></pattern></defs>'
            f'<rect width="100%" height="100%" fill="url(#{pid})"></rect></svg>')


def sparkle(x, y, s, color=GOLD, outline=INK):
    return (f'<svg aria-hidden="true" width="{s}" height="{s}" viewBox="0 0 100 100" style="{P(x, y)}">'
            f'<path d="M50 4 C54 38 62 46 96 50 C62 54 54 62 50 96 C46 62 38 54 4 50 C38 46 46 38 50 4 Z" fill="{color}" stroke="{outline}" stroke-width="5" stroke-linejoin="round"></path></svg>')


def bolt(x, y, s, color=GOLD, deg=0):
    return (f'<svg aria-hidden="true" width="{s}" height="{s * 1.4}" viewBox="0 0 100 140" style="{P(x, y, extra=rot(deg))}">'
            f'<path d="M62 4 L14 78 H48 L36 136 L88 56 H54 Z" fill="{color}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"></path></svg>')


def arrow(x, y, w, h, d, color=INK, deg=0, sw=5):
    """Hand-drawn arrow; d is the path of the shaft in a w×h box, the head is drawn at its end."""
    return (f'<svg aria-hidden="true" width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="{P(x, y, extra=rot(deg))}" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"><defs><marker id="{(m := uid("ah"))}" viewBox="0 0 10 10" refX="6" refY="5" '
            f'markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="none" stroke="{color}" stroke-width="2"></path></marker></defs>'
            f'<path d="{d}" marker-end="url(#{m})"></path></svg>')


def squiggle(x, y, w, color=RED, sw=6, deg=0):
    n = max(3, w // 40)
    d = "M4 20 " + " ".join(f"Q{4 + i * 40 + 20} {4 if i % 2 == 0 else 36} {4 + (i + 1) * 40} 20" for i in range(n))
    return (f'<svg aria-hidden="true" width="{n * 40 + 8}" height="40" viewBox="0 0 {n * 40 + 8} 40" style="{P(x, y, extra=rot(deg))}">'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round"></path></svg>')


def tape(x, y, w=170, deg=-8, color="rgba(232,184,74,0.78)"):
    return (f'<div style="{P(x, y, w, 46)} background: {color}; {rot(deg)} box-shadow: 0 2px 6px rgba(36,33,30,0.12); '
            f'clip-path: polygon(3% 0, 97% 4%, 100% 50%, 97% 96%, 3% 100%, 0 50%)"></div>')


def hatch(w, h, color="rgba(36,33,30,0.06)"):
    pid = uid("h")
    return (f'<svg aria-hidden="true" width="{w}" height="{h}" style="position: absolute; left: 0; top: 0"><defs><pattern id="{pid}" width="26" height="26" '
            f'patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V26" stroke="{color}" stroke-width="10"></path></pattern></defs>'
            f'<rect width="100%" height="100%" fill="url(#{pid})"></rect></svg>')


def slot(w, h, note="ваше фото", bg=CARD, fg=MUTED, radius=10, border=f"2px dashed {LINE}"):
    """Photo placeholder filling its parent."""
    return (f'<div style="position: relative; width: {w}px; height: {h}px; overflow: hidden; box-sizing: border-box; background: {bg}; border: {border}; border-radius: {radius}px">'
            f'{hatch(w, h)}<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px">'
            f'{icon("foto", min(84, w // 4), fg, bg=bg, stroke=4)}<div style="{SANS}; font-weight: 600; font-size: {max(18, min(26, w // 14))}px; color: {fg}">[{note}]</div></div></div>')


def polaroid(x, y, w, h, deg, note, caption, tape_color="rgba(232,184,74,0.8)", cap_size=34):
    return f"""<div style="{P(x, y, w + 36, h + 110, rot(deg))} background: #FFFFFF; padding: 18px 18px 0; box-sizing: border-box; box-shadow: 0 18px 40px rgba(36,33,30,0.18)">
{slot(w, h, note, border="none", radius=2)}
<div style="{SERIF}; font-style: italic; font-size: {cap_size}px; color: {INK}; text-align: center; margin-top: 18px">{caption}</div>
{tape(w // 2 - 60, -24, 150, -4 if deg > 0 else 5, tape_color)}</div>"""


def stamp(x, y, size, ring_text, center, color=RED, deg=-12, bg="none", fill_center=None):
    pid = uid("c")
    r = 50 - 13
    return f"""<svg aria-hidden="true" width="{size}" height="{size}" viewBox="0 0 100 100" style="{P(x, y, extra=rot(deg))}">
<defs><path id="{pid}" d="M50 50 m-{r} 0 a{r} {r} 0 1 1 {2 * r} 0 a{r} {r} 0 1 1 -{2 * r} 0"></path></defs>
<circle cx="50" cy="50" r="48" fill="{bg}" stroke="{color}" stroke-width="2.6"></circle><circle cx="50" cy="50" r="27" fill="{fill_center or 'none'}" stroke="{color}" stroke-width="1.6"></circle>
<text font-family="Manrope, sans-serif" font-weight="800" font-size="8.6" letter-spacing="2.2" fill="{color}"><textPath href="#{pid}">{ring_text}</textPath></text>
{center}</svg>"""


def stamp_text(txt, color=RED, size=15, y=56):
    return f'<text x="50" y="{y}" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="800" font-size="{size}" fill="{color}">{txt}</text>'


def pill(text, bg=CARD, fg=INK, border=INK, size=26, extra=""):
    return (f'<div style="display: inline-flex; align-items: center; padding: 10px 24px; border-radius: 999px; background: {bg}; color: {fg}; '
            f'border: 3px solid {border}; {SANS}; font-weight: 800; font-size: {size}px; white-space: nowrap; {extra}">{text}</div>')


def ticker(y, text, bg=RED, fg=PAPER, deg=-3, size=40, w=1300, x=-110):
    item = f'<span style="padding: 0 26px">{text}</span><span style="color: {GOLD}">✦</span>'
    return (f'<div style="{P(x, y, w, None, rot(deg))} background: {bg}; color: {fg}; {WIDE}; font-weight: 800; font-size: {size}px; '
            f'letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; padding: 20px 0; border-top: 4px solid {INK}; border-bottom: 4px solid {INK}">{item * 8}</div>')


def brand(color=INK, accent=RED, size=60, word=28, extra=""):
    return (f'<div style="display: flex; align-items: center; gap: 18px; {extra}">{monogram(size, color=color, accent=accent, line=7)}'
            f'{wordmark(word, color=color)}</div>')


def bubble(text, w, size=40, bg="#FFFFFF", tail="left", extra=""):
    tail_css = "left: 60px" if tail == "left" else "right: 60px"
    return f"""<div style="position: relative; width: {w}px; background: {bg}; border: 4px solid {INK}; border-radius: 34px; padding: 30px 38px; box-sizing: border-box; box-shadow: 8px 8px 0 {INK}; {extra}">
{head(text, size)}
<svg aria-hidden="true" width="60" height="44" viewBox="0 0 60 44" style="position: absolute; {tail_css}; bottom: -40px"><path d="M4 0 L30 40 L48 0" fill="{bg}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"></path><path d="M6 -2 H46" stroke="{bg}" stroke-width="6"></path></svg></div>"""


def sticker_icon(key, s, disc=GOLD, x=None, y=None, deg=0):
    """Service icon as a die-cut sticker: coloured disc, ink icon, white outline."""
    pos = P(x, y, extra=rot(deg)) if x is not None else rot(deg)
    return (f'<div style="{pos} width: {s}px; height: {s}px; border-radius: 50%; background: {disc}; border: 4px solid {INK}; '
            f'box-shadow: 0 0 0 {max(6, s // 16)}px #FFFFFF, 0 12px 24px {max(6, s // 16)}px rgba(36,33,30,0.14); display: flex; align-items: center; justify-content: center; box-sizing: border-box">'
            f'{icon(key, int(s * 0.62), INK, bg=disc, stroke=5.5)}</div>')


def card(inner, extra="", bg="#FFFFFF", shadow=True):
    sh = f"box-shadow: 8px 8px 0 {INK};" if shadow else ""
    return f'<div style="background: {bg}; border: 4px solid {INK}; border-radius: 26px; box-sizing: border-box; {sh} {extra}">{inner}</div>'


def stars(n=5, s=44, color=GOLD):
    one = (f'<svg aria-hidden="true" width="{s}" height="{s}" viewBox="0 0 100 100"><path d="M50 6l13 28 30 3-23 21 7 30-27-16-27 16 7-30-23-21 30-3z" '
           f'fill="{color}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"></path></svg>')
    return f'<div style="display: flex; gap: 8px">{one * n}</div>'


def frame_shell(w, h, inner, bg=PAPER):
    return f'<div style="position: relative; width: {w}px; height: {h}px; overflow: hidden; background: {bg}; {SANS}; color: {INK}">{inner}</div>'


# =====================================================================
# V1 «Коллаж»
# =====================================================================

DISCS = [GOLD, RED, FAN_BLADE, CARD, GOLD, RED, FAN_BLADE]


def v1_avatar():
    inner = f"""{dots()}
<div style="{P(90, 90, 900, 900)} border-radius: 50%; background: {GOLD}; border: 6px solid {INK}"></div>
<div style="{P(150, 150, 780, 780)} border-radius: 50%; border: 3px dashed {INK}; opacity: 0.5"></div>
{sparkle(150, 150, 120)}{sparkle(850, 720, 90, color=RED)}{sparkle(820, 170, 60, color="#FFFFFF")}
{mascot(800, x=140, y=150)}"""
    return frame_shell(1080, 1080, inner)


def v1_cover(i, key):
    disc = DISCS[i]
    pid = uid("ring")
    ring = (f'<svg aria-hidden="true" width="1080" height="1080" viewBox="0 0 1080 1080" style="position: absolute; inset: 0">'
            f'<defs><path id="{pid}" d="M540 540 m-400 0 a400 400 0 1 1 800 0 a400 400 0 1 1 -800 0"></path></defs>'
            f'<text font-family="Manrope, sans-serif" font-weight="800" font-size="46" letter-spacing="14" fill="{INK}" opacity="0.5">'
            f'<textPath href="#{pid}">IRON PRINCE ✦ МИНСК ✦ IRON PRINCE ✦ МИНСК ✦ IRON PRINCE ✦</textPath></text></svg>')
    if key == "privet":
        center = f'<div style="{P(150, 150, 780, 780)} border-radius: 50%; background: {GOLD}; border: 6px solid {INK}"></div>{mascot(700, x=190, y=185)}'
    else:
        center = sticker_icon(key, 560, disc, x=260, y=260) + sparkle(700, 230, 130, color=GOLD if disc != GOLD else RED)
    return frame_shell(1080, 1080, f"{dots()}{ring}{center}")


def v1_story_uslugi():
    rows = ""
    for i, (k, name, d) in enumerate(SERVICES):
        rows += card(f"""<div style="display: flex; gap: 30px; align-items: center">
{sticker_icon(k, 150, DISCS[i])}
<div style="display: flex; flex-direction: column; gap: 10px; flex: 1">{t(name, 50, INK, SANS, 800, "line-height: 1")}{t(d, 28, SOFT)}</div></div>""",
                     f"padding: 34px 36px; {rot([-1.2, 1, -0.8][i])}")
    chips = "".join(pill(c, bg=[CARD, GOLD, "#FFFFFF"][i % 3], size=26) for i, c in enumerate(CHIPS))
    inner = f"""{dots()}
{box(0, 130, SW, None, brand(), "display: flex; justify-content: center")}
{box(80, 250, 920, None, caps("ПК И НОУТБУКИ · МИНСК", 24, RED) + head("Чем я " + mark("помогу") + "?", 120, extra="margin-top: 20px"))}
{sparkle(880, 250, 110)}
<div style="{P(80, 560, 920)} display: flex; flex-direction: column; gap: 34px">{rows}</div>
<div style="{P(80, 1340, 920)} display: flex; flex-wrap: wrap; gap: 14px">{chips}</div>
{stamp(80, 1520, 250, "ГАРАНТИЯ НА РАБОТУ ✦ ГАРАНТИЯ НА РАБОТУ ✦ ", stamp_text("1", RED, 22, 54) + stamp_text("МЕС", RED, 10, 67), deg=-10, bg=PAPER)}
{box(360, 1600, 300, None, head("Пишите —<br>подскажу", 54))}
{mascot(380, x=650, y=1440)}"""
    return frame_shell(SW, SH, inner)


def v1_story_zakaz():
    steps = ""
    for i, (s, d) in enumerate(STEPS):
        side = i % 2
        steps += f"""<div style="display: flex; gap: 28px; align-items: center; flex-direction: {'row' if side == 0 else 'row-reverse'}; {rot([-1.5, 1.5, -1, 1.2][i])}">
<div style="width: 140px; height: 140px; flex-shrink: 0; border-radius: 50%; background: {[GOLD, RED, FAN_BLADE, GOLD][i]}; border: 4px solid {INK}; box-shadow: 0 0 0 9px #FFFFFF, 6px 10px 0 9px rgba(36,33,30,0.12); display: flex; align-items: center; justify-content: center; {WIDE}; font-weight: 800; font-size: 64px; color: {INK if i != 1 else '#FFFFFF'}">{i + 1}</div>
{card(t(s, 42, INK, SANS, 800, "line-height: 1.05") + t(d, 28, SOFT, extra="margin-top: 8px"), "padding: 26px 30px; flex: 1")}</div>"""
    inner = f"""{dots()}
{box(0, 130, SW, None, brand(), "display: flex; justify-content: center")}
{box(80, 250, 920, None, caps("4 ПРОСТЫХ ШАГА", 24, RED) + head("Как " + mark("заказать"), 124, extra="margin-top: 20px"))}
{bolt(900, 240, 90, deg=12)}
<div style="{P(80, 540, 920)} display: flex; flex-direction: column; gap: 46px">{steps}</div>
{mascot(380, x=40, y=1420)}
<div style="{P(420, 1470)}">{bubble("Сначала спрошу —<br>потом делаю", 560, 46, tail="left")}</div>
{box(420, 1700, 560, None, pill("Написать в директ ✦", RED, "#FFFFFF", INK, 34, "box-shadow: 6px 6px 0 " + INK), "")}"""
    return frame_shell(SW, SH, inner)


def v1_story_pishite():
    facts = "".join(card(f'<div style="{WIDE}; font-weight: 800; font-size: 42px; white-space: nowrap; line-height: 1; color: {RED}">{n}</div>{t(d, 25, SOFT, extra="margin-top: 10px")}',
                         f"padding: 26px 22px; width: 215px; {rot([-3, 2, -2, 3][i])}", bg=["#FFFFFF", CARD, "#FFFFFF", CARD][i]) for i, (n, d) in enumerate(FACTS))
    inner = f"""{dots()}
{box(0, 130, SW, None, brand(), "display: flex; justify-content: center")}
<div style="{P(-120, 330, 1320, 820)} border-radius: 50%; background: {GOLD}; border: 6px solid {INK}"></div>
{sparkle(120, 360, 110, color="#FFFFFF")}{sparkle(870, 860, 120, color=RED)}{bolt(830, 380, 80, color="#FFFFFF", deg=14)}
{mascot(720, x=180, y=300)}
<div style="{P(80, 1060)}">{bubble("Пишите — подберу,<br>соберу и почищу!", 920, 62, tail="right")}</div>
<div style="{P(70, 1380, 940)} display: flex; justify-content: space-between">{facts}</div>
{box(0, 1690, SW, None, t(PHONE, 40, INK, SANS, 800) + caps("ИЛИ В ДИРЕКТ · МИНСК", 24, MUTED, "margin-top: 6px"), "text-align: center")}"""
    return frame_shell(SW, SH, inner)


def v1_post_privet():
    inner = f"""{dots()}
{polaroid(80, 120, 470, 560, -5, "ваше фото", "это я, Василий", cap_size=36)}
{mascot(360, x=600, y=90)}
{sparkle(940, 80, 80)}
{box(600, 470, 420, None, caps("СБОРКА · ЧИСТКА · НАСТРОЙКА", 18, RED) + head("Привет!<br>Я " + mark("Василий"), 76, extra="margin-top: 16px"))}
{stamp(870, 800, 160, "МИНСК ✦ МИНСК ✦ МИНСК ✦ МИНСК ✦ ", stamp_text("IP", RED, 26, 59), deg=14, bg=PAPER)}
{box(80, 860, 760, None, t("Собираю, чищу и настраиваю компьютеры и ноутбуки. Без лишних слов: показываю, что сделал, и даю гарантию.", 34, SOFT, extra="line-height: 1.4"))}
<div style="{P(80, 1060, 920)} display: flex; gap: 22px">
{''.join(card(f'<div style="{WIDE}; font-weight: 800; font-size: 38px; line-height: 1; white-space: nowrap; color: {RED}">{n}</div>{t(d, 23, SOFT, extra="margin-top: 8px")}', f"padding: 24px; flex: 1; {rot([-2, 1.5, -1.5, 2][i])}", bg=["#FFFFFF", CARD][i % 2]) for i, (n, d) in enumerate(FACTS))}</div>
{box(80, 1300, 920, None, brand(size=56, word=26), "display: flex; justify-content: space-between")}{box(700, 1312, 300, None, caps("@" + HANDLE, 22, INK, spacing=0.06), "text-align: right")}"""
    return frame_shell(PW, PH, inner)


def v1_post_sborka():
    tags = [(70, 230, "Процессор", -6, GOLD), (760, 200, "Видеокарта", 5, "#FFFFFF"), (60, 820, "Память", 4, "#FFFFFF"),
            (800, 780, "Охлаждение", -4, RED), (420, 140, "SSD", -3, FAN_BLADE), (430, 860, "Блок питания", 3, GOLD)]
    tag_html = "".join(f'<div style="{P(x, y, extra=rot(d))}">{pill(n, bg, "#FFFFFF" if bg == RED else INK, INK, 28, "box-shadow: 5px 5px 0 " + INK)}</div>' for x, y, n, d, bg in tags)
    inner = f"""{grid_bg()}
<div style="{P(140, 230, 800, 620)} transform: rotate(2deg); background: {INK}; border-radius: 16px"></div>
<div style="{P(150, 220, 780, 600)} background: #FFFFFF; border: 4px solid {INK}; border-radius: 16px; padding: 16px; box-sizing: border-box; {rot(-1.5)}">{slot(740, 560, "фото готовой сборки", radius=8)}</div>
{tape(110, 200, 170, -30)}{tape(820, 790, 170, -30)}
{tag_html}
{sparkle(950, 380, 80)}{sparkle(70, 600, 60, color=RED)}
{box(80, 990, 640, None, caps("СБОРКА ПОД КЛЮЧ", 22, RED) + head("Что " + mark("внутри") + "?", 86, extra="margin-top: 14px; white-space: nowrap"))}
{box(80, 1200, 600, None, t("Подбираю каждую деталь под задачу и бюджет. Модели — в описании поста.", 30, SOFT, extra="line-height: 1.4"))}
{mascot(320, x=700, y=1060)}"""
    return frame_shell(PW, PH, inner)


def v1_post_doposle():
    inner = f"""{dots()}
{box(80, 90, 920, None, caps("ЧИСТКА ПК ОТ ПЫЛИ", 22, RED) + head("До и " + mark("после"), 100, extra="margin-top: 14px"))}
{polaroid(60, 330, 430, 560, -4, "фото до", "до: пыль и 92°")}
{polaroid(560, 360, 430, 560, 4, "фото после", "после: чисто и 68°", tape_color="rgba(201,69,79,0.7)")}
{arrow(430, 280, 220, 110, "M10 90 Q110 -10 210 60", RED, sw=7)}
{sparkle(930, 290, 100)}{bolt(40, 230, 60, deg=-14)}
<div style="{P(80, 1150, 920)} display: flex; align-items: center; justify-content: space-between">
{card(f'<div style="display: flex; align-items: center; gap: 20px">{icon("termo", 70, RED, bg="#FFFFFF", stroke=5)}<div style="{WIDE}; font-weight: 800; font-size: 54px">[92]° → [68]°</div></div>', "padding: 22px 30px")}
{stamp(0, 0, 180, "ЧИСТО ✦ ТИХО ✦ ПРОХЛАДНО ✦ ", stamp_text("OK", RED, 24, 59), deg=10, bg=PAPER).replace("position: absolute; left: 0px; top: 0px;", "")}</div>
{box(80, 1340, 920, None, t("[вставьте свои фото и реальные температуры]", 24, MUTED))}"""
    return frame_shell(PW, PH, inner)


def v1_post_priznaki():
    rows = ""
    for i, (s, d) in enumerate(SIGNS):
        rows += card(f"""<div style="display: flex; align-items: center; gap: 24px">
<div style="{WIDE}; font-weight: 800; font-size: 54px; color: {RED}; width: 60px">{i + 1}</div>
<div>{t(s, 38, INK, SANS, 800, "line-height: 1.05")}{t(d, 25, SOFT, extra="margin-top: 4px")}</div></div>""",
                     f"padding: 20px 28px; {rot([-1, 1, -0.6, 0.8, -1][i])}; margin-left: {[0, 60, 20, 80, 30][i]}px; width: 760px", bg=["#FFFFFF", CARD][i % 2])
    inner = f"""{dots()}
{box(80, 90, 920, None, caps("ПОЛЕЗНОЕ · СОХРАНИТЕ", 22, RED) + head("5 признаков,<br>что пора " + mark("чистить"), 74, extra="margin-top: 14px"))}
{mascot(260, x=790, y=50)}
<div style="{P(70, 420, 940)} display: flex; flex-direction: column; gap: 22px">{rows}</div>
{sparkle(950, 560, 70)}{bolt(960, 900, 50, color=RED, deg=10)}
{box(80, 1270, 920, None, bubble("Узнали свой ПК? Пишите в директ", 760, 40, tail="left"))}"""
    return frame_shell(PW, PH, inner)


def v1_post_otzyv():
    inner = f"""{dots()}
{box(80, 90, 920, None, caps("ОТЗЫВЫ · KUFAR", 22, RED) + head("Что " + mark("говорят") + "<br>клиенты", 96, extra="margin-top: 14px"))}
{stamp(800, 70, 210, "ОТЗЫВОВ НА KUFAR ✦ ОТЗЫВОВ НА KUFAR ✦ ", stamp_text("60+", RED, 20, 58), deg=12, bg=GOLD)}
<div style="{P(80, 420, 860)} {rot(-2)}">{card(f'{stars()}{head("[Текст отзыва: что сделали и как теперь работает компьютер]", 52, extra="margin-top: 24px")}<div style="display: flex; align-items: center; gap: 16px; margin-top: 30px"><div style="width: 70px; height: 70px; border-radius: 50%; background: {FAN_BLADE}; border: 3px solid {INK}"></div><div>{t("[Имя клиента]", 30, INK, SANS, 800)}{t("[услуга] · Kufar", 24, MUTED)}</div></div>', "padding: 44px 48px")}</div>
<div style="{P(140, 970, 760)} {rot(2.5)}">{card(f'{stars(5, 34)}{t("[Ещё один короткий отзыв: «Быстро, аккуратно, всё объяснил»]", 30, SOFT, extra="margin-top: 14px")}', "padding: 28px 34px", bg=CARD)}</div>
{mascot(280, x=780, y=1120)}{sparkle(60, 960, 70)}"""
    return frame_shell(PW, PH, inner)


def v1_post_pishite():
    inner = f"""{dots()}
<div style="{P(-60, 200, 1200, 900)} border-radius: 50%; background: {GOLD}; border: 6px solid {INK}"></div>
{ticker(110, "СБОРКА ✦ ЧИСТКА ✦ НАСТРОЙКА", RED, "#FFFFFF", -4, 38)}
{mascot(700, x=190, y=270)}
{sparkle(120, 420, 110, color="#FFFFFF")}{sparkle(880, 760, 100, color=RED)}
<div style="{P(80, 980)}">{bubble("Пишите — подберу,<br>соберу и почищу!", 920, 66, tail="right")}</div>
<div style="{P(80, 1290, 920)} display: flex; gap: 20px; justify-content: center">{pill("✉ Директ", RED, "#FFFFFF", INK, 32, "box-shadow: 5px 5px 0 " + INK)}{pill("☎ " + PHONE, "#FFFFFF", INK, INK, 32, "box-shadow: 5px 5px 0 " + INK)}</div>"""
    return frame_shell(PW, PH, inner)


# =====================================================================
# V2 «Контраст»
# =====================================================================

def big_num(n, size, color=RED, extra=""):
    return f'<div style="{WIDE}; font-weight: 800; font-size: {size}px; line-height: 0.9; color: {color}; {extra}">{n}</div>'


def v2_avatar():
    inner = f"""<div style="position: absolute; inset: 0; background: {INK}">{pattern(size=110)}</div>
<div style="{P(120, 120, 840, 840)} border-radius: 50%; background: {PAPER}"></div>
<div style="{P(100, 100, 880, 880)} border-radius: 50%; border: 6px solid {RED}"></div>
{mascot(760, x=160, y=170)}"""
    return frame_shell(1080, 1080, inner, INK)


def v2_cover(i, key):
    dark = i % 2 == 0
    bg, fg = (INK, PAPER) if dark else (PAPER, INK)
    if key == "privet":
        center = f'<div style="{P(170, 170, 740, 740)} border-radius: 50%; background: {RED}"></div>{mascot(700, x=190, y=180)}'
    else:
        center = (f'<div style="{P(190, 190, 700, 700)} border-radius: 50%; background: {RED if dark else INK}"></div>'
                  f'{icon(key, 420, PAPER, bg=RED if dark else INK, stroke=4.4, x=330, y=330)}')
    inner = (f'<div style="position: absolute; inset: 0; background: {bg}">{pattern("rgba(237,230,223,0.08)" if dark else "rgba(36,33,30,0.07)", 100)}</div>'
             f'<div style="{P(140, 140, 800, 800)} border-radius: 50%; border: 5px solid {fg}; opacity: 0.85"></div>{center}')
    return frame_shell(1080, 1080, inner, bg)


def v2_marquee(y, text, bg=RED, fg=PAPER, size=34, deg=0, w=1080, x=0):
    item = f'<span style="padding: 0 22px">{text}</span><span>●</span>'
    return (f'<div style="{P(x, y, w, None, rot(deg))} background: {bg}; color: {fg}; {WIDE}; font-weight: 600; font-size: {size}px; '
            f'letter-spacing: 0.06em; white-space: nowrap; overflow: hidden; padding: 18px 0">{item * 10}</div>')


def v2_story_uslugi():
    blocks = ""
    for i, (k, name, d) in enumerate(SERVICES):
        dark = i % 2 == 0
        bg, fg, sub = (INK, PAPER, "#BDB3A9") if dark else ("#FFFFFF", INK, SOFT)
        blocks += f"""<div style="display: flex; align-items: stretch; background: {bg}; border-radius: 22px; overflow: hidden">
<div style="width: 210px; flex-shrink: 0; background: {RED if dark else GOLD}; display: flex; align-items: center; justify-content: center; position: relative">
{big_num(f"0{i + 1}", 34, PAPER if dark else INK, "position: absolute; left: 20px; top: 20px")}{icon(k, 130, PAPER if dark else INK, bg=RED if dark else GOLD, stroke=4.4)}</div>
<div style="padding: 34px 36px; display: flex; flex-direction: column; gap: 12px">{t(name, 52, fg, SANS, 800, "line-height: 1")}{t(d, 29, sub)}</div></div>"""
    inner = f"""<div style="{P(0, 0, SW, 620)} background: {INK}">{pattern(size=110)}</div>
{box(0, 140, SW, None, brand(PAPER), "display: flex; justify-content: center")}
{box(80, 270, 920, None, caps("ПК И НОУТБУКИ · МИНСК", 24, GOLD) + head("Чем я помогу", 132, PAPER, "margin-top: 22px"))}
{v2_marquee(560, "СБОРКА · ЧИСТКА · НАСТРОЙКА · АПГРЕЙД", RED, PAPER, 32, -3, 1300, -110)}
<div style="{P(70, 720, 940)} display: flex; flex-direction: column; gap: 26px">{blocks}</div>
<div style="{P(70, 1440, 940, 300)} background: {GOLD}; border-radius: 22px; overflow: hidden">
{box(44, 50, 560, None, head("Стоимость — до начала работ", 54) + t("В конце — фотоотчёт и тесты", 30, INK, SANS, 800, "margin-top: 16px"))}
{mascot(340, x=610, y=-10)}</div>"""
    return frame_shell(SW, SH, inner)


def v2_story_zakaz():
    steps = "".join(f"""<div style="display: flex; gap: 30px; align-items: flex-start; padding: 34px 0; border-bottom: 3px solid {'rgba(237,230,223,0.2)' if i < 3 else 'transparent'}">
{big_num(f"0{i + 1}", 110, RED if i % 2 == 0 else GOLD, "width: 220px; flex-shrink: 0")}
<div style="padding-top: 6px">{t(s, 46, PAPER, SANS, 800, "line-height: 1.05")}{t(d, 30, "#BDB3A9", extra="margin-top: 10px")}</div></div>""" for i, (s, d) in enumerate(STEPS))
    inner = f"""<div style="position: absolute; inset: 0; background: {INK}">{pattern(size=110)}</div>
{box(0, 140, SW, None, brand(PAPER), "display: flex; justify-content: center")}
{box(80, 270, 920, None, caps("ПОРЯДОК РАБОТЫ", 24, GOLD) + head("Как заказать", 132, PAPER, "margin-top: 22px"))}
<div style="{P(80, 560, 920)}">{steps}</div>
<div style="{P(0, 1460, SW, 460)} background: {PAPER}"></div>
{mascot(400, x=640, y=1330)}
{box(80, 1520, 560, None, head("Если что-то<br>всплывёт — сначала<br>спрошу вас", 54))}
{box(80, 1740, 600, None, pill("Написать в директ →", RED, PAPER, RED, 32))}"""
    return frame_shell(SW, SH, inner, INK)


def v2_story_pishite():
    facts = "".join(f"""<div style="flex: 1; padding: 30px 24px; background: {['#FFFFFF', GOLD, '#FFFFFF', GOLD][i]}; border-radius: 20px">
{big_num(n, 44, RED if i % 2 == 0 else INK, "white-space: nowrap")}{t(d, 25, SOFT, extra="margin-top: 12px")}</div>""" for i, (n, d) in enumerate(FACTS))
    inner = f"""<div style="{P(0, 0, SW, 1180)} background: {RED}">{pattern("rgba(237,230,223,0.12)", 110)}</div>
{box(0, 140, SW, None, brand(PAPER, GOLD), "display: flex; justify-content: center")}
<div style="{P(190, 300, 700, 700)} border-radius: 50%; background: {PAPER}"></div>
{mascot(740, x=170, y=270)}
{v2_marquee(1100, "ПИШИТЕ · ПОДБЕРУ · СОБЕРУ · ПОЧИЩУ", INK, PAPER, 36, -3, 1300, -110)}
{box(80, 1250, 920, None, head("Пишите — подберу,<br>соберу и почищу", 92))}
<div style="{P(70, 1490, 940)} display: flex; gap: 16px">{facts}</div>
{box(0, 1740, SW, None, t(PHONE, 40, INK, SANS, 800), "text-align: center")}"""
    return frame_shell(SW, SH, inner)


def v2_post_privet():
    inner = f"""<div style="{P(0, 0, 540, PH)} background: {INK}">{pattern(size=100)}</div>
<div style="{P(60, 100)}">{slot(420, 560, "ваше фото", bg="#2E2A27", fg="#BDB3A9", border="3px solid rgba(237,230,223,0.4)", radius=200)}</div>
{box(60, 720, 440, None, caps("МАСТЕР", 22, GOLD) + head("Василий", 100, PAPER, "margin-top: 12px") + t("собираю, чищу и настраиваю ПК и ноутбуки в Минске", 30, "#BDB3A9", extra="margin-top: 16px; line-height: 1.4"))}
{box(60, 1180, 440, None, brand(PAPER, size=56, word=24))}
{box(600, 100, 420, None, big_num("Привет!", 74, RED))}
{box(600, 210, 420, None, t("Делаю как для себя: аккуратно, с фотоотчётом и гарантией 1 месяц.", 32, SOFT, extra="line-height: 1.4"))}
<div style="{P(600, 470, 420)} display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
{''.join(f'<div style="padding: 24px 20px; border-radius: 18px; background: {[GOLD, "#FFFFFF", "#FFFFFF", RED][i]}">{big_num(n, 44, INK if i != 3 else PAPER)}{t(d, 22, SOFT if i != 3 else PAPER, extra="margin-top: 10px")}</div>' for i, (n, d) in enumerate(FACTS))}</div>
{mascot(400, x=610, y=900)}
{v2_marquee(1340, "СБОРКА · ЧИСТКА · НАСТРОЙКА", RED, PAPER, 30)}"""
    return frame_shell(PW, PH, inner)


def v2_post_sborka():
    parts = "".join(f"""<div style="display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 16px; background: {'#2E2A27'}">
{icon(k, 54, GOLD if i % 2 else RED, bg="#2E2A27", stroke=5)}<div>{t(n, 26, PAPER, SANS, 800, "line-height: 1.1")}{t("[модель]", 21, "#9C9188")}</div></div>""" for i, (n, k) in enumerate(PARTS))
    inner = f"""<div style="position: absolute; inset: 0; background: {INK}">{pattern(size=100)}</div>
{box(80, 80, 920, None, caps("СБОРКА ПОД КЛЮЧ", 22, GOLD) + head("Что внутри", 110, PAPER, "margin-top: 12px"))}
<div style="{P(80, 330, 920, 560)} border-radius: 24px; box-shadow: 0 0 0 8px {RED}">{slot(920, 560, "фото готовой сборки", bg="#2E2A27", fg="#BDB3A9", border="none", radius=24)}</div>
{box(820, 300, None, None, pill("ГОТОВО ✓", GOLD, INK, INK, 26), rot(6))}
<div style="{P(80, 940, 920)} display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px">{parts}</div>"""
    return frame_shell(PW, PH, inner, INK)


def v2_post_doposle():
    inner = f"""<div style="{P(0, 0, 540, PH)} background: {INK}"></div><div style="{P(540, 0, 540, PH)} background: {PAPER}"></div>
{box(60, 90, 420, None, big_num("ДО", 96, PAPER))}{box(600, 90, 420, None, big_num("ПОСЛЕ", 96, RED))}
<div style="{P(60, 240)}">{slot(420, 740, "фото до", bg="#2E2A27", fg="#BDB3A9", border="3px solid rgba(237,230,223,0.35)", radius=20)}</div>
<div style="{P(600, 240)}">{slot(420, 740, "фото после", radius=20, border=f"3px solid {INK}")}</div>
<div style="{P(440, 520, 200, 200)} border-radius: 50%; background: {RED}; border: 8px solid {PAPER}; display: flex; align-items: center; justify-content: center; {WIDE}; font-weight: 800; font-size: 70px; color: {PAPER}">→</div>
{box(60, 1040, 420, None, big_num("[92]°", 110, RED, "white-space: nowrap") + caps("БЫЛО ПОД НАГРУЗКОЙ", 20, "#BDB3A9", "margin-top: 14px"))}
{box(600, 1040, 420, None, big_num("[68]°", 110, INK, "white-space: nowrap") + caps("СТАЛО ПОСЛЕ ЧИСТКИ", 20, MUTED, "margin-top: 14px"))}
{v2_marquee(1340, "ЧИСТКА · ТЕРМОПАСТА · ТИШИНА", GOLD, INK, 30)}"""
    return frame_shell(PW, PH, inner)


def v2_post_priznaki():
    rows = "".join(f"""<div style="display: flex; align-items: center; gap: 30px; padding: 22px 0; border-bottom: 3px solid {HAIR}">
{big_num(f"0{i + 1}", 72, RED if i % 2 == 0 else INK, "width: 140px")}
<div>{t(s, 42, INK, SANS, 800, "line-height: 1.05")}{t(d, 27, SOFT, extra="margin-top: 6px")}</div></div>""" for i, (s, d) in enumerate(SIGNS))
    inner = f"""<div style="{P(0, 0, PW, 400)} background: {RED}">{pattern("rgba(237,230,223,0.12)", 100)}</div>
{box(80, 90, 680, None, caps("СОХРАНИТЕ СЕБЕ", 22, PAPER) + head("5 признаков,<br>что пора чистить", 72, PAPER, "margin-top: 14px; white-space: nowrap"))}
{mascot(290, x=770, y=110)}
<div style="{P(80, 440, 920)}">{rows}</div>
<div style="{P(0, 1290, PW, 150)} background: {INK}; display: flex; align-items: center; justify-content: center; gap: 24px">{t("Узнали свой ПК?", 40, PAPER, SANS, 800)}{pill("Пишите →", GOLD, INK, GOLD, 30)}</div>"""
    return frame_shell(PW, PH, inner)


def v2_post_otzyv():
    inner = f"""<div style="position: absolute; inset: 0; background: {INK}">{pattern(size=100)}</div>
{box(80, 80, 920, None, caps("ОТЗЫВ С KUFAR", 22, GOLD) + stars(5, 52) .replace("display: flex", "display: flex; margin-top: 20px"))}
<div style="{P(60, 170, 300, 300)} {SERIF}; font-style: italic; font-size: 420px; line-height: 1; color: {RED}">«</div>
<div style="{P(80, 470, 920, 560)} background: {PAPER}; border-radius: 26px; padding: 54px; box-sizing: border-box">
{head("[Текст отзыва клиента: что сделали и как теперь работает компьютер]", 58)}
<div style="display: flex; align-items: center; gap: 18px; margin-top: 40px"><div style="width: 76px; height: 76px; border-radius: 50%; background: {GOLD}"></div><div>{t("[Имя клиента]", 32, INK, SANS, 800)}{t("[услуга]", 24, MUTED)}</div></div></div>
<div style="{P(80, 1110)} display: flex; align-items: flex-end; gap: 20px">{big_num("60+", 150, GOLD)}{t("отзывов<br>на Kufar", 34, PAPER, SANS, 800, "padding-bottom: 14px")}</div>
{mascot(320, x=700, y=1040)}"""
    return frame_shell(PW, PH, inner, INK)


def v2_post_pishite():
    inner = f"""<div style="{P(0, 0, PW, 900)} background: {RED}">{pattern("rgba(237,230,223,0.12)", 100)}</div>
<div style="{P(210, 140, 660, 660)} border-radius: 50%; background: {PAPER}"></div>
{mascot(700, x=190, y=110)}
{v2_marquee(830, "СБОРКА · ЧИСТКА · НАСТРОЙКА", INK, PAPER, 32, -3, 1300, -110)}
{box(80, 990, 920, None, head("Пишите — подберу,<br>соберу и почищу", 96, extra="text-align: center"))}
<div style="{P(80, 1250, 920)} display: flex; gap: 20px; justify-content: center">{pill("Директ →", INK, PAPER, INK, 32)}{pill(PHONE, PAPER, INK, INK, 32)}</div>"""
    return frame_shell(PW, PH, inner)


# =====================================================================
# V3 «Журнал»
# =====================================================================

def v3_top(n, section, dark=False, w=PW):
    c = PAPER if dark else INK
    return (f'<div style="{P(70, 60, w - 140)} display: flex; justify-content: space-between; align-items: center; padding-bottom: 18px; border-bottom: 3px solid {c}">'
            f'{wordmark(24, color=c)}{caps(section, 20, c, spacing=0.22)}{caps("№ " + n, 20, RED, spacing=0.12)}</div>')


def v3_bottom(dark=False, w=PW, h=PH):
    c = PAPER if dark else INK
    return (f'<div style="{P(70, h - 110, w - 140)} display: flex; justify-content: space-between; align-items: center; padding-top: 18px; border-top: 1.5px solid {c}">'
            f'{caps("@" + HANDLE, 18, c, spacing=0.12)}{caps("СБОРКА · ЧИСТКА · НАСТРОЙКА", 18, c)}</div>')


def blueprint(w, h, color=INK, accent=RED, labels=True, label_bg=PAPER):
    """Line drawing of an open PC case with the parts called out."""
    s = w / 900
    def L(x, y, text, lx, ly, anchor="start"):
        if not labels:
            return ""
        return (f'<path d="M{x} {y} L{lx} {ly}" stroke="{accent}" stroke-width="2.4" fill="none"></path><circle cx="{x}" cy="{y}" r="7" fill="{accent}"></circle>'
                f'<rect x="{lx - (0 if anchor == "start" else 196)}" y="{ly - 26}" width="196" height="44" rx="22" fill="{label_bg}" stroke="{color}" stroke-width="2.4"></rect>'
                f'<text x="{lx + (98 if anchor == "start" else -98)}" y="{ly + 4}" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="21" fill="{color}">{text}</text>')
    fan = lambda cx, cy, r: (f'<circle cx="{cx}" cy="{cy}" r="{r}"></circle><circle cx="{cx}" cy="{cy}" r="{r * 0.22}"></circle>'
                             + "".join(f'<path d="M{cx} {cy} m0 -{r * 0.22} q{r * 0.5} -{r * 0.35} {r * 0.15} -{r * 0.75}" transform="rotate({a} {cx} {cy})"></path>' for a in range(0, 360, 60)))
    return f"""<svg aria-hidden="true" width="{w}" height="{h}" viewBox="0 0 900 {h / s}">
<g fill="none" stroke="{color}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">
<rect x="230" y="40" width="440" height="620" rx="18"></rect><rect x="250" y="60" width="400" height="580" rx="10" stroke-dasharray="2 10"></rect>
<rect x="290" y="90" width="300" height="340" rx="6"></rect>
<rect x="390" y="140" width="90" height="90" rx="6"></rect>{fan(435, 185, 36)}
<rect x="505" y="120" width="14" height="140" rx="3"></rect><rect x="527" y="120" width="14" height="140" rx="3"></rect>
<rect x="280" y="300" width="330" height="70" rx="8"></rect>{fan(345, 335, 26)}{fan(445, 335, 26)}{fan(545, 335, 26)}
<rect x="300" y="390" width="70" height="22" rx="4"></rect>
<rect x="270" y="520" width="200" height="100" rx="8"></rect>{fan(370, 570, 34)}
{fan(620, 140, 38)}{fan(620, 240, 38)}
<path d="M500 520 H630 V620 H500 Z M520 545 H610 M520 570 H610 M520 595 H580"></path>
</g>
{L(435, 185, "Процессор", 30, 150)}{L(534, 160, "Память", 870, 70, "end")}{L(445, 335, "Видеокарта", 30, 300)}
{L(335, 401, "SSD", 30, 420)}{L(370, 570, "Блок питания", 30, 590)}{L(620, 240, "Охлаждение", 870, 300, "end")}{L(565, 570, "Кабели", 870, 560, "end")}
</svg>"""


def v3_avatar():
    inner = f"""{grid_bg(step=54)}
<div style="{P(110, 110, 860, 860)} border-radius: 50%; border: 3px solid {INK}"></div>
<div style="{P(150, 150, 780, 780)} border-radius: 50%; background: {CARD}; border: 2px dashed {LINE}"></div>
{mascot(720, x=180, y=170)}
{caps("EST. MINSK", 26, RED, f"{P(420, 70)} background: {PAPER}; padding: 6px 18px")}"""
    return frame_shell(1080, 1080, inner)


def v3_cover(i, key):
    inner = f"""{grid_bg(step=54)}
<div style="{P(160, 160, 760, 760)} border-radius: 50%; border: 3px solid {INK}; background: {CARD}"></div>
<div style="{P(200, 200, 680, 680)} border-radius: 50%; border: 2px dashed {LINE}"></div>
{mascot(640, x=220, y=210) if key == "privet" else icon(key, 440, INK, bg=CARD, stroke=3.4, x=320, y=320)}
<div style="{P(470, 120, 140, 80)} background: {RED}; color: {PAPER}; {WIDE}; font-weight: 800; font-size: 44px; display: flex; align-items: center; justify-content: center; border-radius: 8px">0{i + 1}</div>"""
    return frame_shell(1080, 1080, inner)


def v3_story_uslugi():
    cols = "".join(f"""<div style="padding: 34px 0; border-bottom: 2px solid {INK}; display: flex; gap: 30px">
<div style="{WIDE}; font-weight: 800; font-size: 30px; color: {RED}; width: 70px; padding-top: 10px">0{i + 1}</div>
<div style="flex: 1">{head(name, 70)}{t(d, 29, SOFT, extra="margin-top: 12px; line-height: 1.4")}</div>
{icon(k, 120, INK, stroke=3.6)}</div>""" for i, (k, name, d) in enumerate(SERVICES))
    inner = f"""{v3_top("01", "УСЛУГИ", w=SW)}
{box(70, 200, 940, None, head("Чем я<br>" + mark("помогу"), 170) + caps("ПК И НОУТБУКИ · МИНСК · ВЕЧЕРОМ И В ВЫХОДНЫЕ", 22, RED, "margin-top: 30px"))}
{mascot(330, x=690, y=180)}
<div style="{P(70, 700, 940)} border-top: 6px solid {INK}">{cols}</div>
<div style="{P(70, 1450, 940)} display: flex; gap: 30px">
<div style="flex: 1; {SERIF}; font-size: 30px; line-height: 1.5; color: {SOFT}"><span style="float: left; {SERIF}; font-size: 120px; line-height: 0.85; color: {RED}; padding-right: 14px">С</span>тоимость называю до начала работ. В конце — фотоотчёт, температуры и гарантия 1 месяц.</div>
<div style="width: 300px; padding: 26px; background: {GOLD}; border: 3px solid {INK}; border-radius: 12px; {rot(3)}">{caps("ТАКЖЕ", 18, RED)}{t("SSD и память, термопаста, Windows, кабели", 28, INK, SANS, 800, "margin-top: 10px; line-height: 1.35")}</div></div>
{v3_bottom(w=SW, h=SH)}"""
    return frame_shell(SW, SH, inner)


def v3_story_zakaz():
    steps = "".join(f"""<div style="display: grid; grid-template-columns: 200px 1fr; gap: 20px; padding: 30px 0; border-bottom: 2px solid {INK}">
<div style="{SERIF}; font-style: italic; font-size: 150px; line-height: 0.8; color: {RED if i % 2 == 0 else INK}">{i + 1}</div>
<div>{t(s, 44, INK, SANS, 800, "line-height: 1.05")}{t(d, 30, SOFT, extra="margin-top: 10px; line-height: 1.4")}</div></div>""" for i, (s, d) in enumerate(STEPS))
    inner = f"""{v3_top("02", "КАК ЗАКАЗАТЬ", w=SW)}
{box(70, 200, 940, None, head("Четыре шага<br>до " + mark("тихого") + " ПК", 128))}
<div style="{P(70, 520, 940)} border-top: 6px solid {INK}">{steps}</div>
<div style="{P(70, 1420, 940, 330)} background: {INK}; border-radius: 16px; overflow: hidden">
{box(50, 50, 540, None, caps("ЗАМЕТКА МАСТЕРА", 20, GOLD) + head("«Если всплывёт что-то ещё — сначала спрошу вас»", 50, PAPER, "margin-top: 16px"))}
{mascot(330, x=610, y=10)}</div>
{v3_bottom(w=SW, h=SH)}"""
    return frame_shell(SW, SH, inner)


def v3_story_pishite():
    facts = "".join(f"""<div style="padding: 24px 0; border-top: 2px solid {INK}">{big_num(n, 46, RED if i % 2 == 0 else INK, "white-space: nowrap")}{t(d.replace("<br>", " "), 26, SOFT, extra="margin-top: 8px")}</div>""" for i, (n, d) in enumerate(FACTS))
    inner = f"""{v3_top("03", "КОНТАКТЫ", w=SW)}
<div style="{P(70, 190, 940, 860)} background: {CARD}; border: 3px solid {INK}; border-radius: 16px; overflow: hidden">{grid_bg(step=54)}<div style="{P(150, 110, 640, 640)} border-radius: 50%; background: {GOLD}"></div>{sparkle(90, 90, 90, RED)}{sparkle(790, 600, 80)}{mascot(760, x=90, y=60)}
{caps("НА ОБЛОЖКЕ: ГЛАВНЫЙ ПО ВЕНТИЛЯТОРАМ", 18, INK, f"{P(30, 800)} background: {PAPER}; padding: 8px 16px; border: 2px solid {INK}")}</div>
{box(70, 1100, 940, None, head("Пишите — " + mark("подберу") + ",<br>соберу и почищу", 92))}
<div style="{P(70, 1380, 940)} display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px">{facts}</div>
{box(70, 1660, 940, None, t(PHONE, 44, INK, SANS, 800) + caps("ИЛИ В ДИРЕКТ", 20, MUTED, "margin-top: 8px"))}
{v3_bottom(w=SW, h=SH)}"""
    return frame_shell(SW, SH, inner)


def v3_post_privet():
    inner = f"""{v3_top("01", "ЗНАКОМСТВО")}
<div style="{P(70, 170)}">{slot(520, 720, "ваш портрет", radius=4, border=f"3px solid {INK}")}</div>
{caps("ФОТО: МАСТЕРСКАЯ, МИНСК", 16, MUTED, P(70, 905))}
{box(630, 170, 380, None, caps("ИНТЕРВЬЮ", 20, RED) + head("Привет,<br>я " + mark("Василий"), 70, extra="margin-top: 14px"))}
<div style="{P(630, 400, 380)} {SERIF}; font-size: 28px; line-height: 1.5; color: {SOFT}"><span style="float: left; {SERIF}; font-size: 104px; line-height: 0.85; color: {RED}; padding-right: 12px">С</span>обираю, чищу и настраиваю компьютеры и ноутбуки. Работаю вечером и в выходные, поэтому не тороплюсь и делаю аккуратно.</div>
{mascot(220, x=780, y=740)}
<div style="{P(70, 980, 940)} border-top: 6px solid {INK}; padding-top: 30px">{head("«Делаю как для себя: с фотоотчётом и гарантией»", 58)}</div>
<div style="{P(70, 1180, 940)} display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px">
{''.join(f'<div style="border-top: 2px solid {INK}; padding-top: 12px">{big_num(n, 36, RED if i % 2 == 0 else INK, "white-space: nowrap")}{t(d.replace("<br>", " "), 20, SOFT, extra="margin-top: 6px")}</div>' for i, (n, d) in enumerate(FACTS))}</div>
{v3_bottom()}"""
    return frame_shell(PW, PH, inner)


def v3_post_sborka():
    inner = f"""{v3_top("02", "РАЗБОР СБОРКИ")}
{box(70, 160, 940, None, head("Что " + mark("внутри") + "<br>моей сборки", 96))}
<div style="{P(70, 400, 940, 820)} background: {CARD}; border: 3px solid {INK}; border-radius: 16px; overflow: hidden">{grid_bg(step=40)}
<div style="{P(20, 70)}">{blueprint(900, 700)}</div></div>
{box(70, 1250, 600, None, t("Каждую деталь подбираю под задачу. Модели и фото — в карусели →", 28, SOFT, extra="line-height: 1.4"))}
{mascot(190, x=820, y=1180)}
{v3_bottom()}"""
    return frame_shell(PW, PH, inner)


def v3_post_doposle():
    inner = f"""{v3_top("03", "ДО / ПОСЛЕ")}
<div style="{P(70, 160, 940)} display: grid; grid-template-columns: 1fr 1fr; gap: 20px">
<div>{slot(460, 620, "фото до", radius=4, border=f"3px solid {INK}")}{caps("ФИГ. 1 — ДО ЧИСТКИ", 18, INK, "margin-top: 12px")}</div>
<div>{slot(460, 620, "фото после", radius=4, border=f"3px solid {RED}")}{caps("ФИГ. 2 — ПОСЛЕ", 18, RED, "margin-top: 12px")}</div></div>
<div style="{P(70, 880, 940)} border-top: 6px solid {INK}; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; padding-top: 30px">
<div>{caps("БЫЛО", 20, MUTED)}{big_num("[92]°", 80, RED, "margin-top: 10px; white-space: nowrap")}</div>
<div>{caps("СТАЛО", 20, MUTED)}{big_num("[68]°", 80, INK, "margin-top: 10px; white-space: nowrap")}</div>
<div>{caps("РАЗНИЦА", 20, MUTED)}{big_num("[−24]°", 80, GOLD, "margin-top: 10px; white-space: nowrap; -webkit-text-stroke: 2px " + INK)}</div></div>
{box(70, 1110, 700, None, head("Пыль и сухая паста —<br>главные враги тишины", 54))}
{mascot(220, x=800, y=1080)}
{v3_bottom()}"""
    return frame_shell(PW, PH, inner)


def v3_post_priznaki():
    rows = "".join(f"""<div style="display: grid; grid-template-columns: 110px 1fr; gap: 20px; padding: 24px 0; border-bottom: 2px solid {INK}">
<div style="{SERIF}; font-style: italic; font-size: 96px; line-height: 0.8; color: {RED}">{i + 1}</div>
<div>{t(s, 40, INK, SANS, 800, "line-height: 1.05")}{t(d, 27, SOFT, extra="margin-top: 6px")}</div></div>""" for i, (s, d) in enumerate(SIGNS))
    inner = f"""{v3_top("04", "ПОЛЕЗНОЕ")}
{box(70, 170, 720, None, head("5 признаков,<br>что пора " + mark("чистить"), 70, extra="white-space: nowrap"))}
{stamp(800, 150, 210, "СОХРАНИТЕ ✦ СОХРАНИТЕ ✦ СОХРАНИТЕ ✦ ", stamp_text("★", RED, 30, 61), deg=-8, bg=PAPER)}
<div style="{P(70, 420, 940)} border-top: 6px solid {INK}">{rows}</div>
{v3_bottom()}"""
    return frame_shell(PW, PH, inner)


def v3_post_otzyv():
    inner = f"""{v3_top("05", "ОТЗЫВЫ")}
<div style="{P(70, 170, 360)}">{big_num("60+", 170, RED)}{t("отзывов 5★ на Kufar — за годы работы", 30, SOFT, extra="margin-top: 16px; line-height: 1.4")}{mascot(300, x=0, y=330)}</div>
<div style="{P(470, 170, 540)} border-left: 3px solid {INK}; padding-left: 40px; box-sizing: border-box">
{stars(5, 40)}{head("«[Текст отзыва клиента: что сделали и как теперь работает компьютер]»", 54, extra="margin-top: 26px")}
{caps("— [ИМЯ КЛИЕНТА], [УСЛУГА]", 20, RED, "margin-top: 26px")}</div>
<div style="{P(70, 950, 940)} border-top: 6px solid {INK}; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding-top: 30px">
<div>{stars(5, 28)}{t("«[Короткий отзыв №2]»", 32, INK, SERIF, 400, "font-style: italic; margin-top: 14px")}{caps("— [ИМЯ]", 18, MUTED, "margin-top: 12px")}</div>
<div>{stars(5, 28)}{t("«[Короткий отзыв №3]»", 32, INK, SERIF, 400, "font-style: italic; margin-top: 14px")}{caps("— [ИМЯ]", 18, MUTED, "margin-top: 12px")}</div></div>
<div style="{P(70, 1170, 940, 130)} background: {GOLD}; border: 3px solid {INK}; border-radius: 14px; display: flex; align-items: center; padding: 0 36px; box-sizing: border-box; {rot(-1)}">{head("Спасибо всем, кто оставляет отзывы!", 44)}</div>
{v3_bottom()}"""
    return frame_shell(PW, PH, inner)


def v3_post_pishite():
    inner = f"""<div style="position: absolute; inset: 0; background: {INK}"></div>
{v3_top("06", "КОНТАКТЫ", dark=True)}
<div style="{P(70, 170, 940, 760)} background: {PAPER}; border-radius: 16px; overflow: hidden">{grid_bg(step=54)}{mascot(680, x=130, y=40)}</div>
{box(70, 980, 940, None, head("Пишите — подберу,<br>соберу и почищу", 96, PAPER))}
<div style="{P(70, 1220, 940)} display: flex; gap: 20px">{pill("Директ →", RED, PAPER, RED, 30)}{pill(PHONE, "transparent", PAPER, PAPER, 30)}</div>
{v3_bottom(dark=True)}"""
    return frame_shell(PW, PH, inner, INK)


# =====================================================================
# profile mockup and board list
# =====================================================================

DIRECTIONS = [
    ("V1", "Коллаж", v1_avatar, v1_cover, [v1_story_uslugi, v1_story_zakaz, v1_story_pishite],
     [v1_post_pishite, v1_post_sborka, v1_post_privet, v1_post_doposle, v1_post_priznaki, v1_post_otzyv]),
    ("V2", "Контраст", v2_avatar, v2_cover, [v2_story_uslugi, v2_story_zakaz, v2_story_pishite],
     [v2_post_pishite, v2_post_sborka, v2_post_privet, v2_post_doposle, v2_post_priznaki, v2_post_otzyv]),
    ("V3", "Журнал", v3_avatar, v3_cover, [v3_story_uslugi, v3_story_zakaz, v3_story_pishite],
     [v3_post_pishite, v3_post_sborka, v3_post_privet, v3_post_doposle, v3_post_priznaki, v3_post_otzyv]),
]
STORY_NAMES = [("Uslugi", "Услуги"), ("Kak-zakazat", "Как заказать"), ("Pishite", "Пишите")]
POST_NAMES = [("Pishite", "Пишите"), ("Sborka", "Что внутри"), ("Privet", "Знакомство"),
              ("Do-posle", "До / после"), ("Priznaki", "5 признаков"), ("Otzyv", "Отзыв")]
UI = "font-family: -apple-system, 'Segoe UI', Roboto, sans-serif"


def scaled(body, w, scale):
    return f'<div style="transform: scale({scale:.4f}); transform-origin: 0 0; width: {w}px">{body}</div>'


def profile(avatar, covers, posts):
    stats = "".join(f'<div style="display: flex; flex-direction: column"><div style="font-weight: 700; font-size: 40px">{n}</div>'
                    f'<div style="font-size: 28px; color: #555555">{s}</div></div>' for n, s in [("6", "публикаций"), ("0", "подписчики"), ("0", "подписки")])
    bio = "".join(f"<div>{line}</div>" for line in BIO)
    hl = "".join(f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 136px">
<div style="position: relative; width: 128px; height: 128px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 3px #DBDBDB">{scaled(c, 1080, 128 / 1080)}</div>
<div style="font-size: 22px; color: #111111; white-space: nowrap">{label}</div></div>""" for c, (_, label, _) in zip(covers, HIGHLIGHTS))
    tiles = "".join(f'<div style="position: relative; height: 479px; overflow: hidden">{scaled(p, PW, 359 / PW)}</div>' for p in posts)
    return f"""<div style="position: relative; width: 1080px; height: 2140px; overflow: hidden; background: #FFFFFF; {UI}; color: #111111">
<div style="position: absolute; left: 40px; top: 52px; display: flex; align-items: center; gap: 34px">
<svg aria-hidden="true" width="34" height="56" viewBox="0 0 17 28" fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3L3 14L14 25"></path></svg>
<div style="font-weight: 700; font-size: 46px">{HANDLE}</div></div>
<div style="position: absolute; left: 44px; top: 170px; width: 262px; height: 262px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 2px #DBDBDB">{scaled(avatar, 1080, 262 / 1080)}</div>
<div style="position: absolute; left: 350px; top: 178px; right: 40px; font-weight: 700; font-size: 34px; line-height: 1.25">{NAME}</div>
<div style="position: absolute; left: 350px; top: 296px; right: 60px; display: flex; justify-content: space-between">{stats}</div>
<div style="position: absolute; left: 44px; top: 470px; right: 44px; font-size: 31px; line-height: 1.42; color: #222222">{bio}
<div style="margin-top: 4px; font-weight: 700; color: #00376B">t.me/[ваш_ник]</div></div>
<div style="position: absolute; left: 44px; right: 44px; top: 760px; display: flex; gap: 16px">
<div style="flex: 1; height: 84px; border-radius: 18px; background: #0095F6; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 31px">Подписаться</div>
<div style="flex: 1; height: 84px; border-radius: 18px; background: #EFEFEF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 31px">Сообщение</div></div>
<div style="position: absolute; left: 30px; right: 30px; top: 900px; display: flex; justify-content: space-between">{hl}</div>
<div style="position: absolute; left: 0; right: 0; top: 1170px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px">{tiles}</div>
</div>"""


def groups():
    rows = []
    for code, label, avatar_fn, cover_fn, story_fns, post_fns in DIRECTIONS:
        avatar = avatar_fn()
        covers = [cover_fn(i, k) for i, (k, _, _) in enumerate(HIGHLIGHTS)]
        posts = [f() for f in post_fns]
        row = {f"{code}-Profil": (f"{label} — профиль", page(f"{label} — профиль", 1080, 2140, profile(avatar, covers, posts))),
               f"{code}-Avatar": (f"{label} — аватар", page(f"{label} — аватар", 1080, 1080, avatar))}
        for (k, hl_label, slug), c in zip(HIGHLIGHTS, covers):
            row[f"{code}-Cover-{slug}"] = (f"{label} — обложка «{hl_label}»", page(f"{label} — обложка «{hl_label}»", 1080, 1080, c))
        rows.append(row)
        row2 = {}
        for (slug, s_label), f in zip(STORY_NAMES, story_fns):
            row2[f"{code}-Story-{slug}"] = (f"{label} — история «{s_label}»", page(f"{label} — история «{s_label}»", SW, SH, f()))
        for (slug, p_label), html in zip(POST_NAMES, posts):
            row2[f"{code}-Post-{slug}"] = (f"{label} — пост «{p_label}»", page(f"{label} — пост «{p_label}»", PW, PH, html))
        rows.append(row2)
    return rows
