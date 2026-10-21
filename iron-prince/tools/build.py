"""Generates every artboard of the Iron Prince Instagram canvas.

    python3 iron-prince/tools/build.py
    node iron-prince/tools/render.mjs          # PNG in iron-prince/export/

Texts live in the lists below (BIO, HIGHLIGHTS): edit them, rebuild, re-render.
Light style after the business card: warm paper, dark ink, hairlines, one red accent.
The main mark is the card's monogram (thin shield with «IP» under a crown); the
full «Crest» from the Figma file «Логотип Василия — концепты» is drawn in outline.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT / "canvas" / "project"

# Palette of the business card.
PAPER = "#EDE6DF"
CARD = "#F5F0EA"
INK = "#24211E"
SOFT = "#4A443E"
MUTED = "#6E655D"
RED = "#C9454F"
HAIR = "rgba(36,33,30,0.22)"
LINE = "rgba(36,33,30,0.55)"

FONTS = (
    '<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400'
    '&amp;family=Poppins:wght@300;400&amp;display=swap" rel="stylesheet">'
)
SERIF = "font-family: 'Lora', serif"
POPPINS = "font-family: 'Poppins', sans-serif"

PHONE = "+375 29 946 58 63"
HANDLE = "ironprince.minsk"
NAME = "Iron Prince | сборка и чистка ПК | Минск"
BIO = [
    "Сборка · обслуживание · настройка ПК",
    "Чистка, термопаста, Windows, апгрейд",
    "Минск · гарантия 1 месяц",
    "Консультация бесплатно — пишите ↓",
]


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


def at(x, y):
    return "" if x is None else f' style="position: absolute; left: {x}px; top: {y}px"'


# ---------- logo ----------

def monogram(size, color=INK, accent=RED, x=None, y=None, line=5):
    """The card's monogram: thin shield with serif «IP», a crown with balls on its tips."""
    return f"""<svg role="img" aria-label="Знак Iron Prince" width="{size}" height="{size}" viewBox="0 0 240 240"{at(x, y)}>
<path d="M88 46 L80 18 L102 34 L120 12 L138 34 L160 18 L152 46 Z" fill="none" stroke="{color}" stroke-width="{line}" stroke-linejoin="miter"></path>
<circle cx="80" cy="16" r="6" fill="{color}"></circle><circle cx="120" cy="9" r="6.5" fill="{accent}"></circle><circle cx="160" cy="16" r="6" fill="{color}"></circle>
<rect x="86" y="52" width="68" height="7" fill="{color}"></rect>
<path d="M62 72 H178 V140 C178 178 152 200 120 218 C88 200 62 178 62 140 Z" fill="none" stroke="{color}" stroke-width="{line}" stroke-linejoin="miter"></path>
<text x="121" y="172" text-anchor="middle" font-family="Lora, serif" font-weight="400" font-size="92" letter-spacing="-2" fill="{color}">IP</text>
</svg>"""


def crest(size, color=INK, accent=RED, bg=PAPER, x=None, y=None, label="Герб Iron Prince"):
    """The «Crest» in outline: quartered shield, crown, four service icons."""
    blade = "M80 155 C77 141 86 133 98 134 C97 147 90 153 80 155 Z"
    blades = "".join(f'<path d="{blade}" fill="{color}" transform="rotate({a} 80 155)"></path>' for a in (0, 120, 240))
    pins = "".join(f'<rect x="{px}" y="{py}" width="4" height="7" fill="{color}"></rect>'
                   for px in (151, 159, 167) for py in (67, 104))
    pins += "".join(f'<rect x="{px}" y="{py}" width="7" height="4" fill="{color}"></rect>'
                    for px in (138, 175) for py in (79, 87, 95))
    return f"""<svg role="img" aria-label="{label}" width="{size}" height="{size}" viewBox="0 0 240 240"{at(x, y)}>
<path d="M40 56 H200 V122 C200 176 162 206 120 224 C78 206 40 176 40 122 Z" fill="none" stroke="{color}" stroke-width="5"></path>
<path d="M49 65 H191 V122 C191 170 157 195 120 214 C83 195 49 170 49 122 Z" fill="none" stroke="{color}" stroke-width="1.4" opacity="0.6"></path>
<path d="M120 65 V214 M49 122 H191" stroke="{color}" stroke-width="3"></path>
<path d="M82 46 L78 20 L100 34 L120 10 L140 34 L162 20 L158 46 Z" fill="none" stroke="{color}" stroke-width="4"></path>
<rect x="80" y="50" width="80" height="6" fill="{color}"></rect>
<circle cx="78" cy="17" r="5" fill="{color}"></circle><circle cx="120" cy="7" r="5.5" fill="{accent}"></circle><circle cx="162" cy="17" r="5" fill="{color}"></circle>
<polygon points="90,74 68,100 82,100 74,116 100,88 86,88 94,74" fill="{accent}"></polygon>
<rect x="145" y="74" width="30" height="30" rx="4" fill="{color}"></rect><rect x="153" y="82" width="14" height="14" rx="2" fill="{bg}"></rect>{pins}
<circle cx="84" cy="165" r="24" fill="none" stroke="{color}" stroke-width="3.5"></circle>
<g transform="translate(4 7)">{blades}</g><circle cx="84" cy="162" r="4" fill="{bg}"></circle>
<g transform="rotate(-45 156 162)"><rect x="151" y="146" width="10" height="40" rx="4" fill="{accent}"></rect><circle cx="156" cy="142" r="13" fill="{accent}"></circle><rect x="151" y="126" width="10" height="15" fill="{bg}"></rect></g>
</svg>"""


def wordmark(size=64, color=INK, spacing=0.32):
    return (f'<div style="{POPPINS}; font-weight: 300; font-size: {size}px; line-height: 1; letter-spacing: {spacing}em; '
            f'margin-right: -{spacing}em; color: {color}; white-space: nowrap">IRON PRINCE</div>')


# ---------- shared decoration ----------

def frame(w, h, inset=40, color=HAIR):
    """One hairline with soft corners, as on the card."""
    return (f'<div style="position: absolute; left: {inset}px; top: {inset}px; width: {w - 2 * inset}px; height: {h - 2 * inset}px; '
            f'box-sizing: border-box; border: 2px solid {color}; border-radius: 14px"></div>')


def eyebrow(text, color=MUTED, size=24):
    return f'<div style="{SERIF}; font-weight: 500; font-size: {size}px; letter-spacing: 0.32em; color: {color}">{text}</div>'


def rule(width=120, color=RED, height=3):
    return f'<div style="width: {width}px; height: {height}px; background: {color}"></div>'


def header(w, top=96):
    """Small monogram + wordmark on top of stories and posts."""
    return (f'<div style="position: absolute; left: 0; width: {w}px; top: {top}px; display: flex; justify-content: center; align-items: center; gap: 22px">'
            f'{monogram(70, line=7)}{wordmark(30)}</div>')


def title(text, size=120, italic=True, align="left"):
    style = "italic" if italic else "normal"
    return (f'<div style="{SERIF}; font-style: {style}; font-weight: 400; font-size: {size}px; line-height: 1.05; '
            f'color: {INK}; text-align: {align}">{text}</div>')


def text(t, size=32, color=SOFT, extra=""):
    return f'<div style="{SERIF}; font-size: {size}px; line-height: 1.45; color: {color}; {extra}">{t}</div>'


# ---------- icons (viewBox 0 0 100 100, stroke) ----------

ICONS = {
    "uslugi": '<path d="M64 14a18 18 0 0 0-17 24L16 69a8 8 0 0 0 11 11l31-31a18 18 0 0 0 24-17L71 43l-12-3-3-12z"></path>',
    "raboty": '<rect x="28" y="12" width="44" height="76" rx="5"></rect><circle cx="50" cy="60" r="14"></circle><path d="M37 25H63M37 34H55"></path>',
    "doposle": '<rect x="12" y="22" width="76" height="56" rx="6"></rect><path d="M50 14V86"></path><circle cx="50" cy="50" r="10" fill="BG"></circle><path d="M47 46l-4 4 4 4M53 46l4 4-4 4"></path>',
    "otzyvy": '<path d="M50 13l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z"></path>',
    "zakaz": '<path d="M16 26a9 9 0 0 1 9-9h50a9 9 0 0 1 9 9v32a9 9 0 0 1-9 9H44L26 83V67a9 9 0 0 1-10-9z"></path><path d="M36 42h0M50 42h0M64 42h0" stroke-width="SW2"></path>',
    "garantiya": '<path d="M50 10l34 12v25c0 22-15 37-34 45C31 84 16 69 16 47V22z"></path><path d="M34 50l11 11 21-22"></path>',
    "chistka": '<circle cx="50" cy="50" r="36"></circle><path d="M50 46c-3-13 4-22 16-22 0 12-6 19-16 22zM54 52c12 5 15 16 9 26-10-6-12-15-9-26zM45 53c-9 9-21 9-27 0 10-6 19-5 27 0z"></path><circle cx="50" cy="50" r="4"></circle>',
    "sborka": '<rect x="26" y="26" width="48" height="48" rx="5"></rect><rect x="40" y="40" width="20" height="20" rx="2"></rect><path d="M38 14v12M50 14v12M62 14v12M38 74v12M50 74v12M62 74v12M14 38h12M14 50h12M14 62h12M74 38h12M74 50h12M74 62h12"></path>',
    "nastroyka": '<path d="M16 28H84M16 50H84M16 72H84"></path><circle cx="34" cy="28" r="8" fill="BG"></circle><circle cx="64" cy="50" r="8" fill="BG"></circle><circle cx="44" cy="72" r="8" fill="BG"></circle>',
    "foto": '<rect x="12" y="26" width="76" height="54" rx="7"></rect><path d="M36 26l6-10h16l6 10"></path><circle cx="50" cy="53" r="14"></circle>',
    "termo": '<path d="M42 58V20a8 8 0 0 1 16 0v38a16 16 0 1 1-16 0z"></path><path d="M50 36v28"></path>',
}


def icon(key, size, color, bg=PAPER, stroke=4, x=None, y=None, label=None):
    a11y = f'role="img" aria-label="{label}"' if label else 'aria-hidden="true"'
    body = ICONS[key].replace("BG", bg).replace("SW2", str(stroke * 2.4))
    return (f'<svg {a11y} width="{size}" height="{size}" viewBox="0 0 100 100" fill="none" stroke="{color}" '
            f'stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round"{at(x, y)}>{body}</svg>')


# ---------- 01: avatars ----------

def avatars():
    boards = {}
    body = f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {PAPER}">
{monogram(700, x=190, y=180, line=5)}
</div>"""
    boards["Avatar-1-Monogramma"] = ("Аватар — монограмма IP", page("Аватар — монограмма IP", 1080, 1080, body))
    body = f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {PAPER}">
{crest(740, x=170, y=160)}
</div>"""
    boards["Avatar-2-Gerb"] = ("Аватар — герб в линию", page("Аватар — герб в линию", 1080, 1080, body))
    body = f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {INK}">
{monogram(700, color=PAPER, x=190, y=180, line=5)}
</div>"""
    boards["Avatar-3-Tyomnyy"] = ("Аватар — тёмный вариант", page("Аватар — тёмный вариант", 1080, 1080, body))
    return boards


# ---------- 02: highlight covers ----------

HIGHLIGHTS = [
    ("uslugi", "Услуги", "Uslugi"), ("raboty", "Работы", "Raboty"),
    ("doposle", "До/после", "Do-posle"), ("otzyvy", "Отзывы", "Otzyvy"),
    ("zakaz", "Как заказать", "Zakaz"), ("garantiya", "Гарантия", "Garantiya"),
]
COVER_STYLES = {
    "Paper": (PAPER, INK, LINE),
    "Red": (PAPER, RED, HAIR),
    "Ink": (INK, PAPER, "rgba(237,230,223,0.4)"),
}


def cover_body(key, style, size=1080):
    bg, fg, ring = COVER_STYLES[style]
    k = size / 1080
    return f"""<div style="position: relative; width: {size}px; height: {size}px; overflow: hidden; background: {bg}">
<svg aria-hidden="true" width="{size}" height="{size}" style="position: absolute; left: 0; top: 0"><circle cx="{540 * k}" cy="{540 * k}" r="{420 * k}" fill="none" stroke="{ring}" stroke-width="{2.5 * k}"></circle></svg>
{icon(key, round(420 * k), fg, bg=bg, stroke=3.6, x=round(330 * k), y=round(330 * k))}
</div>"""


def covers():
    boards = {}
    for key, label, slug in HIGHLIGHTS:
        for style in COVER_STYLES:
            t = f"Обложка — {label} ({style})"
            boards[f"Cover-{slug}-{style}"] = (t, page(t, 1080, 1080, cover_body(key, style)))
    return boards


# ---------- 03: stories ----------

def story(inner):
    return f"""<div style="position: relative; width: 1080px; height: 1920px; overflow: hidden; background: {PAPER}; {SERIF}; color: {INK}">
{frame(1080, 1920)}
{header(1080, top=120)}
{inner}
<div style="position: absolute; left: 0; right: 0; bottom: 150px; display: flex; flex-direction: column; align-items: center; gap: 10px">
<div style="{SERIF}; font-weight: 500; font-size: 36px; letter-spacing: 0.04em; color: {INK}">{PHONE}</div>
<div style="{SERIF}; font-size: 26px; letter-spacing: 0.2em; color: {MUTED}">ИЛИ В ДИРЕКТ · МИНСК</div>
</div>
</div>"""


def story_title(eyebrow_text, t, top=330, size=124):
    return f"""<div style="position: absolute; left: 110px; right: 110px; top: {top}px; display: flex; flex-direction: column; align-items: flex-start; gap: 26px">
{eyebrow(eyebrow_text)}{title(t, size)}{rule()}
</div>"""


def stories():
    boards = {}
    pillars = [
        ("sborka", "Сборка", "Подбор под задачу и бюджет, аккуратная укладка кабелей, проверка температур"),
        ("chistka", "Обслуживание", "Чистка от пыли, термопаста и прокладки, видеокарты, апгрейд SSD и памяти"),
        ("nastroyka", "Настройка", "Windows и драйверы, BIOS, кривые вентиляторов, перенос данных"),
    ]
    cards = "".join(f"""<div style="display: flex; gap: 36px; align-items: center; padding: 40px 44px; background: {CARD}; border: 2px solid {LINE}; border-radius: 14px">
{icon(k, 112, RED, bg=CARD, stroke=4)}
<div style="display: flex; flex-direction: column; gap: 12px"><div style="{SERIF}; font-weight: 600; font-size: 50px; line-height: 1; color: {INK}">{t}</div>
{text(d, 29)}</div></div>""" for k, t, d in pillars)
    inner = story_title("ПК И НОУТБУКИ · МИНСК", "Чем я помогу") + f"""
<div style="position: absolute; left: 110px; right: 110px; top: 660px; display: flex; flex-direction: column; gap: 30px">{cards}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1470px">{text("Стоимость называю до начала работ. В конце — фотоотчёт и результаты тестов.", 32)}</div>"""
    boards["Story-1-Uslugi"] = ("История — Услуги", page("История — Услуги", 1080, 1920, story(inner)))

    steps = [
        ("Пишете, что нужно", "Консультирую бесплатно и называю стоимость до начала работ."),
        ("Фиксируем состояние", "При приёме фотографируем технику — вы спокойны, я тоже."),
        ("Согласую всё по ходу", "Если выяснится что-то ещё, сначала спрошу вас."),
        ("Фотоотчёт и тесты", "Показываю, что сделано: температуры, стабильность."),
    ]
    step_html = "".join(f"""<div style="display: flex; gap: 36px; align-items: flex-start; padding-bottom: 30px; border-bottom: 2px solid {HAIR}">
<div style="{SERIF}; font-style: italic; font-size: 76px; line-height: 0.9; color: {RED}; width: 90px; flex-shrink: 0">{n + 1}</div>
<div style="display: flex; flex-direction: column; gap: 10px"><div style="{SERIF}; font-weight: 600; font-size: 46px; line-height: 1.1; color: {INK}">{t}</div>
{text(d, 30)}</div></div>""" for n, (t, d) in enumerate(steps))
    inner = story_title("ПОРЯДОК РАБОТЫ", "Как заказать") + f"""
<div style="position: absolute; left: 110px; right: 110px; top: 640px; display: flex; flex-direction: column; gap: 30px">{step_html}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1500px; padding: 30px 36px; border: 2px solid {RED}; border-radius: 14px">{text("Чистка — обычно в тот же или на следующий день. Сборка — 1–2 дня после получения комплектующих.", 30, INK)}</div>"""
    boards["Story-2-Kak-zakazat"] = ("История — Как заказать", page("История — Как заказать", 1080, 1920, story(inner)))

    terms = [
        "Гарантия на выполненную работу — 1 месяц.",
        "Цена согласуется до начала работы и не меняется без вашего согласия.",
        "Стандартная термопаста входит в цену. Премиальная паста, прокладки и комплектующие — по чеку.",
        "Работа оплачивается после выполнения, наличными или переводом.",
        "Б/у комплектующие проверяю при покупке и снимаю проверку на фото или видео.",
    ]
    term_html = "".join(f"""<div style="display: flex; gap: 26px; align-items: flex-start; padding-bottom: 30px; border-bottom: 2px solid {HAIR}">
<svg aria-hidden="true" width="22" height="22" viewBox="0 0 10 10" style="flex-shrink: 0; margin-top: 16px"><path d="M5 0L10 5L5 10L0 5Z" fill="{INK}"></path></svg>
{text(t, 33, INK)}</div>""" for t in terms)
    inner = f"""<div style="position: absolute; left: 0; right: 0; top: 300px; display: flex; flex-direction: column; align-items: center; gap: 24px">
{icon("garantiya", 180, RED, stroke=3.6)}
{eyebrow("ЧЕСТНЫЕ УСЛОВИЯ")}
{title("Гарантия", 124, align="center")}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 860px; display: flex; flex-direction: column; gap: 30px">{term_html}</div>"""
    boards["Story-3-Garantiya"] = ("История — Гарантия и условия", page("История — Гарантия и условия", 1080, 1920, story(inner)))
    return boards


# ---------- 04: feed posts (1080×1440, the 3:4 grid) ----------

PW, PH = 1080, 1440


def post_shell(inner):
    return f"""<div style="position: relative; width: {PW}px; height: {PH}px; overflow: hidden; background: {PAPER}; {SERIF}; color: {INK}">
{frame(PW, PH)}
{inner}
</div>"""


def photo_slot(x, y, w, h, label, note="вставьте фото"):
    return f"""<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; overflow: hidden; box-sizing: border-box; background: {CARD}; border: 2px solid {LINE}; border-radius: 12px">
<svg aria-hidden="true" width="{w}" height="{h}" style="position: absolute; left: 0; top: 0"><defs><pattern id="hatch{x}{y}" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V26" stroke="rgba(36,33,30,0.05)" stroke-width="10"></path></pattern></defs><rect width="100%" height="100%" fill="url(#hatch{x}{y})"></rect></svg>
<div style="position: absolute; left: 0; right: 0; top: {h // 2 - 70}px; display: flex; flex-direction: column; align-items: center; gap: 14px">
{icon("foto", 84, MUTED, bg=CARD, stroke=4)}<div style="{SERIF}; font-size: 26px; color: {MUTED}">[{note}]</div></div>
<div style="position: absolute; left: 26px; top: 26px; padding: 10px 24px; border-radius: 8px; background: {label[1]}; color: {label[2]}; border: 2px solid {label[3]}; {SERIF}; font-weight: 600; font-size: 26px; letter-spacing: 0.24em">{label[0]}</div>
</div>"""


def posts():
    boards = {}

    pillars = "".join(f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 18px; width: 260px">
{icon(k, 110, RED, stroke=4)}<div style="{SERIF}; font-weight: 500; font-size: 30px; letter-spacing: 0.2em; color: {INK}">{t}</div></div>"""
                      for k, t in [("sborka", "СБОРКА"), ("chistka", "ЧИСТКА"), ("nastroyka", "НАСТРОЙКА")])
    inner = f"""{monogram(300, x=390, y=120, line=5)}
<div style="position: absolute; left: 0; right: 0; top: 470px; display: flex; flex-direction: column; align-items: center; gap: 30px; text-align: center">
{wordmark(58)}{rule(560, INK, 2)}{eyebrow("ПК И НОУТБУКИ · МИНСК")}
<div style="margin-top: 24px">{title("Привет, я Василий", 100, align="center")}</div>
{text("Собираю, обслуживаю и настраиваю компьютеры и ноутбуки. Аккуратно, с фотоотчётом и гарантией.", 34, SOFT, "width: 800px")}</div>
<div style="position: absolute; left: 0; right: 0; top: 1110px; display: flex; justify-content: center; gap: 40px">{pillars}</div>"""
    boards["Post-1-Znakomstvo"] = ("Пост — знакомство", page("Пост — знакомство", PW, PH, post_shell(inner)))

    inner = f"""{header(PW, top=92)}
{photo_slot(84, 210, 450, 870, ("ДО", PAPER, INK, INK), "фото до")}
{photo_slot(546, 210, 450, 870, ("ПОСЛЕ", RED, "#FFFFFF", RED), "фото после")}
<svg aria-hidden="true" width="80" height="80" viewBox="0 0 80 80" style="position: absolute; left: 500px; top: 605px"><circle cx="40" cy="40" r="36" fill="{PAPER}" stroke="{INK}" stroke-width="2.5"></circle><path d="M33 30l-10 10 10 10M47 30l10 10-10 10" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
<div style="position: absolute; left: 84px; right: 84px; top: 1130px; display: flex; justify-content: space-between; align-items: flex-end">
<div style="display: flex; flex-direction: column; gap: 16px">{eyebrow("ЧИСТКА ПК ОТ ПЫЛИ")}{title("До и после", 80)}</div>
<div style="display: flex; align-items: center; gap: 14px; padding: 16px 26px; border: 2px solid {LINE}; border-radius: 12px">{icon("termo", 52, RED, stroke=5)}<div style="{SERIF}; font-size: 44px; color: {INK}">[92]° → [68]°</div></div></div>"""
    boards["Post-2-Do-posle"] = ("Пост — до / после", page("Пост — до / после", PW, PH, post_shell(inner)))

    inner = f"""{header(PW, top=92)}
<div style="position: absolute; left: 0; right: 0; top: 280px; display: flex; flex-direction: column; align-items: center; gap: 26px; text-align: center">
{eyebrow("ЗАЧЕМ ЧИСТИТЬ")}{title("Компьютер шумит<br>и греется?", 100, align="center")}{rule()}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 680px; display: flex; justify-content: center; align-items: center; gap: 50px">
<div style="display: flex; flex-direction: column; align-items: center; gap: 8px">{eyebrow("БЫЛО")}<div style="{SERIF}; font-size: 200px; line-height: 1; color: {RED}; white-space: nowrap">[92]°</div></div>
<svg aria-hidden="true" width="110" height="60" viewBox="0 0 110 60"><path d="M6 30H96M76 10l20 20-20 20" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
<div style="display: flex; flex-direction: column; align-items: center; gap: 8px">{eyebrow("СТАЛО")}<div style="{SERIF}; font-size: 200px; line-height: 1; color: {INK}; white-space: nowrap">[68]°</div></div></div>
<div style="position: absolute; left: 150px; right: 150px; top: 1010px">{text("Пыль и высохшая термопаста — главные причины перегрева. Чистка с заменой пасты возвращает тишину и запас по температурам.", 34, SOFT, "text-align: center")}</div>
<div style="position: absolute; left: 0; right: 0; top: 1250px">{text("[вставьте реальные температуры процессора до и после]", 26, MUTED, "text-align: center")}</div>"""
    boards["Post-3-Temperatury"] = ("Пост — температуры до / после", page("Пост — температуры до / после", PW, PH, post_shell(inner)))

    stars = "".join(f'<svg aria-hidden="true" width="56" height="56" viewBox="0 0 100 100"><path d="M50 8l12 27 29 3-22 20 6 29-25-15-25 15 6-29-22-20 29-3z" fill="{RED}"></path></svg>' for _ in range(5))
    inner = f"""{header(PW, top=92)}
<div style="position: absolute; left: 0; right: 0; top: 270px; display: flex; flex-direction: column; align-items: center; gap: 34px">
{eyebrow("ОТЗЫВ")}<div style="display: flex; gap: 14px">{stars}</div></div>
<div style="position: absolute; left: 0; right: 0; top: 430px; {SERIF}; font-style: italic; font-size: 200px; line-height: 0.6; color: {RED}; text-align: center">«</div>
<div style="position: absolute; left: 150px; right: 150px; top: 590px">{title("[Текст отзыва клиента: что сделали и как теперь работает компьютер]", 64, align="center")}</div>
<div style="position: absolute; left: 0; right: 0; top: 1080px; display: flex; flex-direction: column; align-items: center; gap: 16px">
{rule(80)}<div style="{SERIF}; font-weight: 600; font-size: 36px; color: {INK}">[Имя клиента]</div>{eyebrow("[УСЛУГА] · KUFAR", size=22)}</div>"""
    boards["Post-4-Otzyv"] = ("Пост — отзыв", page("Пост — отзыв", PW, PH, post_shell(inner)))
    return boards


# ---------- 00: profile preview and brand sheet ----------

POST_KEYS = ["Post-1-Znakomstvo", "Post-2-Do-posle", "Post-3-Temperatury", "Post-4-Otzyv"]
UI = "font-family: -apple-system, 'Segoe UI', Roboto, sans-serif"


def body_of(html):
    return html.split("</helmet>", 1)[1].split("</x-dc>", 1)[0]


def main_board(post_boards):
    stats = "".join(f'<div style="display: flex; flex-direction: column; align-items: flex-start"><div style="font-weight: 700; font-size: 40px">{n}</div>'
                    f'<div style="font-size: 28px; color: #555555">{t}</div></div>' for n, t in [("4", "публикации"), ("0", "подписчики"), ("0", "подписки")])
    bio = "".join(f"<div>{line}</div>" for line in BIO)
    hl = "".join(f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 150px">
<div style="position: relative; width: 140px; height: 140px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 3px #DBDBDB">
<div style="transform: scale({140 / 1080}); transform-origin: 0 0">{cover_body(k, "Paper")}</div></div>
<div style="font-size: 24px; color: #111111; white-space: nowrap">{label}</div></div>""" for k, label, _ in HIGHLIGHTS[:6])
    scale = 359 / PW
    tiles = "".join(f"""<div style="position: relative; height: 479px; overflow: hidden; background: {PAPER}">
<div style="transform: scale({scale:.4f}); transform-origin: 0 0">{body_of(post_boards[k][1])}</div></div>""" for k in POST_KEYS)
    body = f"""<div style="position: relative; width: 1080px; height: 2140px; overflow: hidden; background: #FFFFFF; {UI}; color: #111111">
<div style="position: absolute; left: 40px; top: 52px; display: flex; align-items: center; gap: 34px">
<svg aria-hidden="true" width="34" height="56" viewBox="0 0 17 28" fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3L3 14L14 25"></path></svg>
<div style="font-weight: 700; font-size: 46px">{HANDLE}</div>
</div>
<div style="position: absolute; left: 44px; top: 170px; width: 262px; height: 262px; border-radius: 50%; overflow: hidden; background: {PAPER}; box-shadow: 0 0 0 2px #DBDBDB">
{monogram(200, x=31, y=34, line=6)}
</div>
<div style="position: absolute; left: 350px; top: 178px; right: 40px; font-weight: 700; font-size: 34px; line-height: 1.25">{NAME}</div>
<div style="position: absolute; left: 350px; top: 296px; right: 60px; display: flex; justify-content: space-between">{stats}</div>
<div style="position: absolute; left: 44px; top: 470px; right: 44px; font-size: 31px; line-height: 1.42; color: #222222">{bio}
<div style="margin-top: 4px; font-weight: 700; color: #00376B">t.me/[ваш_ник]</div></div>
<div style="position: absolute; left: 44px; right: 44px; top: 760px; display: flex; gap: 16px">
<div style="flex: 1; height: 84px; border-radius: 18px; background: #0095F6; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 31px">Подписаться</div>
<div style="flex: 1; height: 84px; border-radius: 18px; background: #EFEFEF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 31px">Сообщение</div>
</div>
<div style="position: absolute; left: 30px; right: 30px; top: 900px; display: flex; justify-content: space-between">{hl}</div>
<div style="position: absolute; left: 0; right: 0; top: 1170px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px">{tiles}</div>
</div>"""
    return page("Профиль — как будет выглядеть страница", 1080, 2140, body)


def style_board():
    swatches = [("Бумага", PAPER, "фон всех макетов"), ("Карточка", CARD, "плашки, фото-рамки"), ("Чернила", INK, "текст, линии, знак"),
                ("Графит", MUTED, "подписи, надзаголовки"), ("Алый", RED, "одна черта, точка на короне, акценты")]
    sw = "".join(f"""<div style="display: flex; flex-direction: column; gap: 10px">
<div style="height: 130px; background: {c}; border: 2px solid {HAIR}; border-radius: 10px"></div>
<div style="{SERIF}; font-weight: 600; font-size: 30px; line-height: 1; color: {INK}">{n}</div>
<div style="{SERIF}; font-size: 22px; letter-spacing: 0.1em; color: {MUTED}">{c}</div>
<div style="{SERIF}; font-size: 22px; line-height: 1.3; color: {SOFT}">{d}</div></div>""" for n, c, d in swatches)
    fonts = [("Poppins Light", "логотип, латиница", f"{POPPINS}; font-weight: 300; font-size: 64px; letter-spacing: 0.3em", "IRON PRINCE"),
             ("Lora Italic", "заголовки", f"{SERIF}; font-style: italic; font-size: 76px", "Пишите — подберу, соберу и почищу"),
             ("Lora", "текст, надзаголовки вразрядку", f"{SERIF}; font-size: 34px", "Сборка · обслуживание · настройка")]
    fr = "".join(f"""<div style="padding: 24px 0; border-top: 2px solid {HAIR}">
{eyebrow(f"{n.upper()} · {r.upper()}", size=20)}
<div style="margin-top: 12px; line-height: 1.1; color: {INK}; {css}">{s}</div></div>""" for n, r, css, s in fonts)
    icons = "".join(icon(k, 88, INK, stroke=3.6) for k in ["sborka", "chistka", "nastroyka", "uslugi", "raboty", "garantiya", "otzyvy", "zakaz"])
    body = f"""<div style="position: relative; width: 1080px; height: 2160px; overflow: hidden; background: {PAPER}; {SERIF}; color: {INK}">
{frame(1080, 2160)}
<div style="position: absolute; left: 110px; right: 110px; top: 110px; display: flex; justify-content: space-between">{eyebrow("IRON PRINCE", size=20)}{eyebrow("ФИРМЕННЫЙ СТИЛЬ", size=20)}</div>
<div style="position: absolute; left: 0; right: 0; top: 190px; display: flex; flex-direction: column; align-items: center; gap: 34px">
{monogram(300, line=5)}{wordmark(78)}{rule(640, INK, 2)}
<div style="{SERIF}; font-weight: 600; font-size: 30px; letter-spacing: 0.24em; color: {INK}">СБОРКА · ОБСЛУЖИВАНИЕ · НАСТРОЙКА</div></div>
<div style="position: absolute; left: 110px; right: 110px; top: 860px; display: flex; align-items: center; justify-content: space-between">
<div style="display: flex; align-items: flex-end; gap: 28px">{monogram(120)}{monogram(64, line=7)}{monogram(32, line=9)}</div>
<div style="width: 230px; height: 230px; border-radius: 50%; background: {INK}; display: flex; align-items: center; justify-content: center">{monogram(170, color=PAPER)}</div>
{crest(230)}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1170px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 24px">{sw}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1480px">{fr}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1960px; display: flex; justify-content: space-between">{icons}</div>
</div>"""
    return page("Фирменный стиль", 1080, 2160, body)


# ---------- canvas index ----------

def write_canvas(groups):
    boards, order = {}, []
    y = 0
    for row in groups:
        x, h = 0, 0
        for name, (t, html) in row.items():
            w = int(html.split('"width":')[1].split(",")[0])
            bh = int(html.split('"height":')[1].split("}")[0])
            boards[f"{name}.dc.html"] = {"x": x, "y": y, "w": w, "h": bh, "title": t}
            order.append(f"{name}.dc.html")
            x += w + 80
            h = max(h, bh)
        y += h + 340
    index_path = PROJECT / "canvas.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else {
        "v": 3, "createdOnFiles": {"v": 1, "at": "2026-10-21T10:00:00Z"}}
    index.update({"title": "Iron Prince — оформление Instagram", "launch": {"view": "canvas"}, "pages": [],
                  "boards": boards, "order": order})
    index.setdefault("notes", {})
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n")


def main():
    PROJECT.mkdir(parents=True, exist_ok=True)
    p = posts()
    profile = {"Main": ("Профиль — как будет выглядеть страница", main_board(p)),
               "Style": ("Фирменный стиль", style_board())}
    cv = covers()
    cover_rows = [{k: v for k, v in cv.items() if k.endswith(s)} for s in COVER_STYLES]
    st = stories()
    groups = [profile, avatars(), *cover_rows, st, p]
    names = {f"{name}.dc.html" for row in groups for name in row}
    for old in PROJECT.glob("*.dc.html"):
        if old.name not in names:
            old.unlink()
    for row in groups:
        for name, (_, html) in row.items():
            (PROJECT / f"{name}.dc.html").write_text(html)
    write_canvas(groups)
    print(f"{sum(len(r) for r in groups)} artboards → {PROJECT}")


if __name__ == "__main__":
    main()
