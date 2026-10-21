"""Generates every artboard of the Iron Prince Instagram canvas.

    python3 iron-prince/tools/build.py
    node iron-prince/tools/render.mjs          # PNG in iron-prince/export/

Prices and texts live in the lists below (PRICES, BIO, HIGHLIGHTS): edit them, rebuild,
re-render. The crest is the «Crest» logo from the Figma file «Логотип Василия — концепты».
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT / "canvas" / "project"

# Palette of the crest.
NIGHT = "#15171A"
PANEL = "#1E2126"
FIELD = "#2B2F36"
STEEL = "#C9CED6"
SILVER = "#E7E9ED"
SCARLET = "#E04B5A"
MUTED = "#8C929C"
IVORY = "#EEE9E0"
INK = "#17181B"
HAIR = "rgba(201,206,214,0.28)"

FONTS = (
    '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&amp;family=Forum'
    '&amp;family=Manrope:wght@400;500;700;800&amp;display=swap" rel="stylesheet">'
)
CINZEL = "font-family: 'Cinzel', serif"
FORUM = "font-family: 'Forum', serif"
SANS = "font-family: 'Manrope', sans-serif"

PHONE = "+375 29 946 58 63"
HANDLE = "ironprince.minsk"
NAME = "Iron Prince | сборка и чистка ПК | Минск"
BIO = [
    "Сборка · обслуживание · настройка ПК",
    "Чистка, термопаста, Windows, апгрейд",
    "Минск · гарантия 1 месяц",
    "Консультация бесплатно — пишите ↓",
]

# The user's price list (doc «Прайс-лист: обслуживание и апгрейд ПК», 2026-10-08).
PRICES = {
    "chistka": ("Чистка и обслуживание", [
        ("Экспресс-чистка без разборки: продувка, фильтры", "25"),
        ("Полная чистка с разборкой и заменой термопасты", "45"),
        ("Обслуживание видеокарты: разборка, чистка, термопаста", "40"),
        ("Замена термопрокладок на видеокарте", "+20"),
        ("Смазка или замена вентилятора, за 1 шт.", "5"),
        ("Чистка ноутбука с заменой термопасты", "50"),
    ]),
    "komplektuyushchie": ("Замена и установка", [
        ("Сборка ПК с нуля под ключ, с укладкой кабелей", "100"),
        ("Сложная сборка: СВО, 6+ вентиляторов, вертикальная видеокарта", "от 140"),
        ("Замена материнской платы (полная пересборка)", "50"),
        ("Замена процессора с термопастой", "20"),
        ("Замена или установка кулера процессора", "15"),
        ("Замена видеокарты", "15"),
        ("Замена блока питания", "20"),
        ("Установка SSD или HDD", "10"),
        ("Установка оперативной памяти", "5"),
        ("Укладка кабелей в собранном ПК", "20"),
    ]),
    "nastroyka": ("Настройка", [
        ("Базовая настройка BIOS: память, Resizable BAR, fTPM", "20"),
        ("Обновление BIOS", "25"),
        ("Андервольт процессора с тестами стабильности", "40"),
        ("Кривые вентиляторов: процессор, корпус, видеокарта", "20"),
        ("Windows с драйверами и базовыми программами", "40"),
        ("Установка или обновление драйверов", "15"),
        ("Диагностика (бесплатно, если ремонт делаю я)", "15"),
    ]),
    "dop": ("Дополнительно", [
        ("Подбор конфигурации из новых комплектующих", "30"),
        ("Подбор с б/у комплектующими: поиск, проверка", "6% бюджета"),
        ("Выезд на проверку б/у комплектующего", "15"),
        ("Заказ комплектующих и доставка до клиента", "20"),
        ("Выезд на дом по городу", "15"),
        ("Срочная работа в тот же день", "+30%"),
    ]),
}
BUNDLES = [
    ("Профилактика", "Полная чистка с термопастой + обслуживание видеокарты", "85", "70"),
    ("Сборка под ключ", "Сборка + Windows + настройка BIOS + кривые вентиляторов", "180", "150"),
    ("Новый ПК с нуля", "Подбор + заказ и доставка + сборка + Windows + BIOS и вентиляторы", "230", "190"),
    ("Апгрейд под ключ", "Комплектующие + процессор и память + чистка + видеокарта + настройка", "210", "175"),
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


# ---------- logo ----------

def crest(size, steel=STEEL, field=FIELD, accent=SCARLET, x=None, y=None, label="Герб Iron Prince"):
    """The final crest: quartered shield with an inner frame, riveted crown, four service icons."""
    pos = "" if x is None else f' style="position: absolute; left: {x}px; top: {y}px"'
    notch = field if field != "none" else NIGHT
    blade = "M80 155 C77 141 86 133 98 134 C97 147 90 153 80 155 Z"
    blades = "".join(f'<path d="{blade}" fill="{steel}" transform="rotate({a} 80 155)"></path>' for a in (0, 120, 240))
    pins = "".join(f'<rect x="{px}" y="{py}" width="4" height="7" fill="{steel}"></rect>'
                   for px in (151, 159, 167) for py in (67, 104))
    pins += "".join(f'<rect x="{px}" y="{py}" width="7" height="4" fill="{steel}"></rect>'
                    for px in (138, 175) for py in (79, 87, 95))
    return f"""<svg role="img" aria-label="{label}" width="{size}" height="{size}" viewBox="0 0 240 240"{pos}>
<path d="M40 56 H200 V122 C200 176 162 206 120 224 C78 206 40 176 40 122 Z" fill="{field}" stroke="{steel}" stroke-width="6" stroke-linejoin="round"></path>
<path d="M49 65 H191 V122 C191 170 157 195 120 214 C83 195 49 170 49 122 Z" fill="none" stroke="{steel}" stroke-width="1.6" opacity="0.7"></path>
<path d="M120 65 V214 M49 122 H191" stroke="{steel}" stroke-width="4"></path>
<path d="M80 48 L80 20 L100 34 L120 8 L140 34 L160 20 L160 48 Z" fill="{accent}" stroke="{steel}" stroke-width="4" stroke-linejoin="round"></path>
<rect x="76" y="44" width="88" height="9" rx="2" fill="{steel}"></rect>
<circle cx="80" cy="17" r="5" fill="{steel}"></circle><circle cx="120" cy="6" r="5" fill="{steel}"></circle><circle cx="160" cy="17" r="5" fill="{steel}"></circle>
<polygon points="90,74 68,100 82,100 74,116 100,88 86,88 94,74" fill="{accent}"></polygon>
<rect x="145" y="74" width="30" height="30" rx="4" fill="{steel}"></rect><rect x="153" y="82" width="14" height="14" rx="2" fill="{notch}"></rect>{pins}
<circle cx="84" cy="165" r="24" fill="none" stroke="{steel}" stroke-width="4"></circle>
<g transform="translate(4 7)">{blades}</g><circle cx="84" cy="162" r="4" fill="{notch}"></circle>
<g transform="rotate(-45 156 162)"><rect x="151" y="146" width="10" height="40" rx="4" fill="{accent}"></rect><circle cx="156" cy="142" r="13" fill="{accent}"></circle><rect x="151" y="126" width="10" height="15" fill="{notch}"></rect></g>
</svg>"""


def sign(size, steel=STEEL, field=FIELD, accent=SCARLET, x=None, y=None, letters=None, line=6):
    """Simplified sign for small sizes: shield, crown and «IP»."""
    pos = "" if x is None else f' style="position: absolute; left: {x}px; top: {y}px"'
    letters = letters or steel
    return f"""<svg role="img" aria-label="Знак Iron Prince" width="{size}" height="{size}" viewBox="0 0 240 240"{pos}>
<path d="M40 56 H200 V122 C200 176 162 206 120 224 C78 206 40 176 40 122 Z" fill="{field}" stroke="{steel}" stroke-width="{line}" stroke-linejoin="round"></path>
<path d="M80 48 L80 20 L100 34 L120 8 L140 34 L160 20 L160 48 Z" fill="{accent}" stroke="{steel}" stroke-width="{line * 2 / 3:.1f}" stroke-linejoin="round"></path>
<rect x="76" y="44" width="88" height="9" rx="2" fill="{steel}"></rect>
<circle cx="80" cy="17" r="5" fill="{steel}"></circle><circle cx="120" cy="6" r="5" fill="{steel}"></circle><circle cx="160" cy="17" r="5" fill="{steel}"></circle>
<text x="120" y="160" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="84" letter-spacing="2" fill="{letters}">IP</text>
</svg>"""


def wordmark(size=64, color=STEEL, sub=None, sub_color=SCARLET, spacing=0.06):
    s = f'<div style="{CINZEL}; font-weight: 700; font-size: {size}px; line-height: 1; letter-spacing: {spacing}em; color: {color}">IRON PRINCE</div>'
    if sub:
        s += (f'<div style="{CINZEL}; font-size: {round(size * 0.3)}px; letter-spacing: 0.32em; color: {sub_color}; '
              f'margin-top: {round(size * 0.22)}px">{sub}</div>')
    return f'<div style="display: flex; flex-direction: column; align-items: center; text-align: center">{s}</div>'


# ---------- shared decoration ----------

def brushed(w, h, opacity="0.05"):
    """Faint brushed-steel grain: horizontal stretched noise."""
    return (f'<svg aria-hidden="true" width="{w}" height="{h}" style="position: absolute; left: 0; top: 0">'
            '<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.9" numOctaves="2" stitchTiles="stitch"></feTurbulence>'
            f'<feColorMatrix values="0 0 0 0 0.8  0 0 0 0 0.82  0 0 0 0 0.86  0 0 0 {opacity} 0"></feColorMatrix></filter>'
            '<rect width="100%" height="100%" filter="url(#grain)"></rect></svg>')


def frame(w, h, inset=44, color=HAIR, rivet=STEEL):
    """Double hairline frame with rivets in the corners — the crest's inner frame."""
    a, b = inset, inset + 12
    rivets = "".join(f'<circle cx="{cx}" cy="{cy}" r="5" fill="{rivet}"></circle>'
                     for cx in (a, w - a) for cy in (a, h - a))
    return (f'<svg aria-hidden="true" width="{w}" height="{h}" style="position: absolute; left: 0; top: 0">'
            f'<rect x="{a}" y="{a}" width="{w - 2 * a}" height="{h - 2 * a}" fill="none" stroke="{color}" stroke-width="2"></rect>'
            f'<rect x="{b}" y="{b}" width="{w - 2 * b}" height="{h - 2 * b}" fill="none" stroke="{color}" stroke-width="1"></rect>'
            f'{rivets}</svg>')


def eyebrow(text, color=SCARLET, size=24):
    return f'<div style="{SANS}; font-weight: 800; font-size: {size}px; letter-spacing: 0.3em; color: {color}">{text}</div>'


def rule(width=120, color=SCARLET, height=3):
    return f'<div style="width: {width}px; height: {height}px; background: {color}"></div>'


def header(w, top=96, color=STEEL):
    """Small sign + wordmark on top of stories and posts."""
    return (f'<div style="position: absolute; left: 0; width: {w}px; top: {top}px; display: flex; justify-content: center; align-items: center; gap: 18px">'
            f'{sign(64, steel=color, field="none", line=8)}'
            f'<div style="{CINZEL}; font-weight: 700; font-size: 30px; letter-spacing: 0.24em; color: {color}">IRON PRINCE</div></div>')


# ---------- icons (viewBox 0 0 100 100, stroke) ----------

ICONS = {
    "uslugi": '<path d="M64 14a18 18 0 0 0-17 24L16 69a8 8 0 0 0 11 11l31-31a18 18 0 0 0 24-17L71 43l-12-3-3-12z"></path>',
    "ceny": '<path d="M52 14H82a4 4 0 0 1 4 4v30L50 84 16 50z"></path><circle cx="69" cy="31" r="6"></circle>',
    "raboty": '<rect x="28" y="12" width="44" height="76" rx="5"></rect><circle cx="50" cy="60" r="14"></circle><path d="M37 25H63M37 34H55"></path>',
    "doposle": '<rect x="12" y="22" width="76" height="56" rx="6"></rect><path d="M50 14V86"></path><circle cx="50" cy="50" r="10" fill="BG"></circle><path d="M47 46l-4 4 4 4M53 46l4 4-4 4"></path>',
    "otzyvy": '<path d="M50 13l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z"></path>',
    "zakaz": '<path d="M16 26a9 9 0 0 1 9-9h50a9 9 0 0 1 9 9v32a9 9 0 0 1-9 9H44L26 83V67a9 9 0 0 1-10-9z"></path><path d="M36 42h0M50 42h0M64 42h0" stroke-width="SW2"></path>',
    "garantiya": '<path d="M50 10l34 12v25c0 22-15 37-34 45C31 84 16 69 16 47V22z"></path><path d="M34 50l11 11 21-22"></path>',
    "chistka": '<circle cx="50" cy="50" r="36"></circle><path d="M50 46c-3-13 4-22 16-22 0 12-6 19-16 22zM54 52c12 5 15 16 9 26-10-6-12-15-9-26zM45 53c-9 9-21 9-27 0 10-6 19-5 27 0z"></path><circle cx="50" cy="50" r="4"></circle>',
    "sborka": '<rect x="26" y="26" width="48" height="48" rx="5"></rect><rect x="40" y="40" width="20" height="20" rx="2"></rect><path d="M38 14v12M50 14v12M62 14v12M38 74v12M50 74v12M62 74v12M14 38h12M14 50h12M14 62h12M74 38h12M74 50h12M74 62h12"></path>',
    "nastroyka": '<path d="M16 28H84M16 50H84M16 72H84"></path><circle cx="34" cy="28" r="8" fill="BG"></circle><circle cx="64" cy="50" r="8" fill="BG"></circle><circle cx="44" cy="72" r="8" fill="BG"></circle>',
    "windows": '<rect x="16" y="16" width="68" height="68" rx="6"></rect><path d="M50 16V84M16 50H84"></path>',
    "foto": '<rect x="12" y="26" width="76" height="54" rx="7"></rect><path d="M36 26l6-10h16l6 10"></path><circle cx="50" cy="53" r="14"></circle>',
    "termo": '<path d="M42 58V20a8 8 0 0 1 16 0v38a16 16 0 1 1-16 0z"></path><path d="M50 36v28"></path>',
}


def icon(key, size, color, bg=NIGHT, stroke=5, x=None, y=None, label=None):
    pos = "" if x is None else f' style="position: absolute; left: {x}px; top: {y}px"'
    a11y = f'role="img" aria-label="{label}"' if label else 'aria-hidden="true"'
    body = ICONS[key].replace("BG", bg).replace("SW2", str(stroke * 2.2))
    return (f'<svg {a11y} width="{size}" height="{size}" viewBox="0 0 100 100" fill="none" stroke="{color}" '
            f'stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round"{pos}>{body}</svg>')


# ---------- 01: avatars ----------

def avatars():
    boards = {}
    body = f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {NIGHT}">
{brushed(1080, 1080)}
<svg aria-hidden="true" width="1080" height="1080" style="position: absolute; left: 0; top: 0"><circle cx="540" cy="540" r="470" fill="none" stroke="{HAIR}" stroke-width="2"></circle></svg>
{crest(760, x=160, y=150)}
</div>"""
    boards["Avatar-1-Crest"] = ("Аватар — полный герб", page("Аватар — полный герб", 1080, 1080, body))
    body = f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {NIGHT}">
{brushed(1080, 1080)}
{sign(720, x=180, y=170, line=7)}
</div>"""
    boards["Avatar-2-Znak"] = ("Аватар — упрощённый знак IP", page("Аватар — упрощённый знак IP", 1080, 1080, body))
    body = f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {IVORY}">
{sign(720, steel=INK, field="none", accent="none", x=180, y=170, letters=INK, line=5)}
</div>"""
    boards["Avatar-3-Svetlyy"] = ("Аватар — светлый, как визитка", page("Аватар — светлый, как визитка", 1080, 1080, body))
    return boards


# ---------- 02: highlight covers ----------

HIGHLIGHTS = [
    ("uslugi", "Услуги", "Uslugi"), ("ceny", "Цены", "Ceny"), ("raboty", "Работы", "Raboty"),
    ("doposle", "До/после", "Do-posle"), ("otzyvy", "Отзывы", "Otzyvy"),
    ("zakaz", "Как заказать", "Zakaz"), ("garantiya", "Гарантия", "Garantiya"),
]
COVER_STYLES = {
    "Steel": (NIGHT, STEEL, HAIR),
    "Scarlet": (SCARLET, NIGHT, "rgba(21,23,26,0.35)"),
    "Ivory": (IVORY, INK, "rgba(23,24,27,0.25)"),
}


def cover_body(key, style, size=1080):
    bg, fg, ring = COVER_STYLES[style]
    k = size / 1080
    grain = brushed(size, size) if style == "Steel" else ""
    return f"""<div style="position: relative; width: {size}px; height: {size}px; overflow: hidden; background: {bg}">
{grain}
<svg aria-hidden="true" width="{size}" height="{size}" style="position: absolute; left: 0; top: 0"><circle cx="{540 * k}" cy="{540 * k}" r="{430 * k}" fill="none" stroke="{ring}" stroke-width="{3 * k}"></circle>
<circle cx="{540 * k}" cy="{540 * k}" r="{405 * k}" fill="none" stroke="{ring}" stroke-width="{1.5 * k}"></circle></svg>
{icon(key, round(440 * k), fg, bg=bg, stroke=5.5, x=round(320 * k), y=round(320 * k))}
</div>"""


def covers():
    boards = {}
    for key, label, slug in HIGHLIGHTS:
        for style in COVER_STYLES:
            title = f"Обложка — {label} ({style})"
            boards[f"Cover-{slug}-{style}"] = (title, page(title, 1080, 1080, cover_body(key, style)))
    return boards


# ---------- 03: stories ----------

def story(title, inner, bg=NIGHT, fg=STEEL):
    return f"""<div style="position: relative; width: 1080px; height: 1920px; overflow: hidden; background: {bg}; {SANS}; color: {SILVER}">
{brushed(1080, 1920)}
{frame(1080, 1920)}
{header(1080, top=120, color=fg)}
{inner}
<div style="position: absolute; left: 0; right: 0; bottom: 150px; display: flex; flex-direction: column; align-items: center; gap: 10px">
<div style="{SANS}; font-weight: 700; font-size: 34px; letter-spacing: 0.06em; color: {SILVER}">{PHONE}</div>
<div style="{SANS}; font-weight: 500; font-size: 26px; color: {MUTED}">или в директ · Минск</div>
</div>
</div>"""


def price_rows(rows, size=34, gap=34):
    out = []
    for name, price in rows:
        unit = "" if any(c in price for c in "%") or not price.strip("+от ").isdigit() else " р."
        out.append(f"""<div style="display: flex; align-items: baseline; gap: 16px">
<div style="flex: 0 1 auto; font-weight: 500; font-size: {size}px; line-height: 1.3; color: {SILVER}">{name}</div>
<div style="flex: 1 1 40px; min-width: 40px; border-bottom: 3px dotted rgba(201,206,214,0.35); transform: translateY(-8px)"></div>
<div style="flex: 0 0 auto; {FORUM}; font-size: {round(size * 1.5)}px; line-height: 1; color: #FFFFFF; white-space: nowrap">{price}<span style="{SANS}; font-weight: 500; font-size: {round(size * 0.7)}px; color: {MUTED}">{unit}</span></div>
</div>""")
    return f'<div style="display: flex; flex-direction: column; gap: {gap}px">{"".join(out)}</div>'


def story_title(eyebrow_text, title, top=330, size=120):
    return f"""<div style="position: absolute; left: 110px; right: 110px; top: {top}px; display: flex; flex-direction: column; align-items: flex-start; gap: 22px">
{eyebrow(eyebrow_text)}
<div style="{FORUM}; font-size: {size}px; line-height: 1; color: #FFFFFF">{title}</div>
{rule()}
</div>"""


def stories():
    boards = {}
    pillars = [
        ("sborka", "Сборка", "Подбор под задачу и бюджет, аккуратная укладка кабелей, проверка температур"),
        ("chistka", "Обслуживание", "Чистка от пыли, термопаста и прокладки, видеокарты, апгрейд SSD и памяти"),
        ("nastroyka", "Настройка", "Windows и драйверы, BIOS, кривые вентиляторов, перенос данных"),
    ]
    cards = "".join(f"""<div style="display: flex; gap: 34px; align-items: center; padding: 40px 44px; background: {PANEL}; border: 2px solid {HAIR}">
{icon(k, 120, SCARLET, bg=PANEL, stroke=5)}
<div style="display: flex; flex-direction: column; gap: 12px"><div style="{FORUM}; font-size: 64px; line-height: 1; color: #FFFFFF">{t}</div>
<div style="font-weight: 500; font-size: 30px; line-height: 1.35; color: {STEEL}">{d}</div></div></div>""" for k, t, d in pillars)
    inner = story_title("ПК И НОУТБУКИ · МИНСК", "Чем я помогу") + f"""
<div style="position: absolute; left: 110px; right: 110px; top: 650px; display: flex; flex-direction: column; gap: 30px">{cards}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1480px; font-weight: 500; font-size: 32px; line-height: 1.4; color: {STEEL}">Стоимость называю до начала работ. В конце — фотоотчёт и результаты тестов.</div>"""
    boards["Story-1-Uslugi"] = ("История — Услуги", page("История — Услуги", 1080, 1920, story("Услуги", inner)))

    for i, (key, slug) in enumerate([("chistka", "Chistka"), ("komplektuyushchie", "Komplektuyushchie"),
                                     ("nastroyka", "Nastroyka"), ("dop", "Dopolnitelno")], start=2):
        title, rows = PRICES[key]
        small = len(rows) > 7
        inner = story_title(f"ПРАЙС · {i - 1} / 5", title, size=104 if len(title) > 14 else 120) + f"""
<div style="position: absolute; left: 110px; right: 110px; top: 640px">{price_rows(rows, size=30 if small else 34, gap=26 if small else 40)}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1560px; font-weight: 500; font-size: 26px; line-height: 1.4; color: {MUTED}">Цены в рублях за работу, без комплектующих.</div>"""
        boards[f"Story-{i}-Ceny-{slug}"] = (f"История — цены: {title}", page(f"История — цены: {title}", 1080, 1920, story(title, inner)))

    bundle_cards = "".join(f"""<div style="display: flex; justify-content: space-between; gap: 30px; align-items: center; padding: 34px 40px; background: {PANEL}; border: 2px solid {HAIR}">
<div style="display: flex; flex-direction: column; gap: 10px"><div style="{FORUM}; font-size: 52px; line-height: 1; color: #FFFFFF">{n}</div>
<div style="font-weight: 500; font-size: 26px; line-height: 1.35; color: {STEEL}">{d}</div></div>
<div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0"><div style="font-weight: 500; font-size: 28px; color: {MUTED}; text-decoration: line-through">{old} р.</div>
<div style="{FORUM}; font-size: 76px; line-height: 1; color: {SCARLET}">{new}<span style="{SANS}; font-weight: 500; font-size: 26px; color: {MUTED}"> р.</span></div></div></div>"""
                           for n, d, old, new in BUNDLES)
    inner = story_title("ПРАЙС · 5 / 5", "Комплексы") + f"""
<div style="position: absolute; left: 110px; right: 110px; top: 620px; display: flex; flex-direction: column; gap: 22px">{bundle_cards}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1580px; font-weight: 500; font-size: 26px; line-height: 1.4; color: {MUTED}">С б/у комплектующими к «Новому ПК» вместо подбора добавляется 6% от бюджета (мин. 50, макс. 200 р.).</div>"""
    boards["Story-6-Ceny-Kompleksy"] = ("История — цены: комплексы", page("История — цены: комплексы", 1080, 1920, story("Комплексы", inner)))

    steps = [
        ("Пишете, что нужно", "Консультирую бесплатно и называю стоимость до начала работ."),
        ("Фиксируем состояние", "При приёме фотографируем технику — вы спокойны, я тоже."),
        ("Согласую всё по ходу", "Если выяснится что-то ещё, сначала спрошу вас."),
        ("Фотоотчёт и тесты", "Показываю, что сделано: температуры, стабильность."),
    ]
    step_html = "".join(f"""<div style="display: flex; gap: 36px; align-items: flex-start">
<div style="{CINZEL}; font-weight: 700; font-size: 72px; line-height: 0.9; color: {SCARLET}; width: 110px; flex-shrink: 0">{['I', 'II', 'III', 'IV'][n]}</div>
<div style="display: flex; flex-direction: column; gap: 10px"><div style="{FORUM}; font-size: 54px; line-height: 1.05; color: #FFFFFF">{t}</div>
<div style="font-weight: 500; font-size: 30px; line-height: 1.4; color: {STEEL}">{d}</div></div></div>""" for n, (t, d) in enumerate(steps))
    inner = story_title("ПОРЯДОК РАБОТЫ", "Как заказать") + f"""
<div style="position: absolute; left: 110px; right: 110px; top: 660px; display: flex; flex-direction: column; gap: 64px">{step_html}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1420px; padding: 30px 36px; border: 2px solid {SCARLET}; font-weight: 500; font-size: 30px; line-height: 1.4; color: {SILVER}">Чистка — обычно в тот же или на следующий день. Сборка — 1–2 дня после получения комплектующих.</div>"""
    boards["Story-7-Kak-zakazat"] = ("История — Как заказать", page("История — Как заказать", 1080, 1920, story("Как заказать", inner)))

    terms = [
        "Гарантия на выполненную работу — 1 месяц.",
        "Цена согласуется до начала работы и не меняется без вашего согласия.",
        "Стандартная термопаста входит в цену. Премиальная паста, прокладки и комплектующие — по чеку.",
        "Работа оплачивается после выполнения, наличными или переводом.",
        "Б/у комплектующие проверяю при покупке и снимаю проверку на фото или видео.",
    ]
    term_html = "".join(f"""<div style="display: flex; gap: 26px; align-items: flex-start">
<svg aria-hidden="true" width="40" height="40" viewBox="0 0 100 100" fill="none" stroke="{SCARLET}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 4px"><path d="M18 52l20 20 44-44"></path></svg>
<div style="font-weight: 500; font-size: 33px; line-height: 1.4; color: {SILVER}">{t}</div></div>""" for t in terms)
    inner = f"""<div style="position: absolute; left: 0; right: 0; top: 300px; display: flex; flex-direction: column; align-items: center; gap: 18px">
{icon("garantiya", 200, SCARLET, stroke=4.5)}
{eyebrow("ЧЕСТНЫЕ УСЛОВИЯ")}
<div style="{FORUM}; font-size: 120px; line-height: 1; color: #FFFFFF">Гарантия</div></div>
<div style="position: absolute; left: 110px; right: 110px; top: 830px; display: flex; flex-direction: column; gap: 40px">{term_html}</div>"""
    boards["Story-8-Garantiya"] = ("История — Гарантия и условия", page("История — Гарантия и условия", 1080, 1920, story("Гарантия", inner)))
    return boards


# ---------- 04: feed posts (1080×1440, the 3:4 grid) ----------

PW, PH = 1080, 1440


def post_shell(inner, bg=NIGHT, frame_on=True):
    return f"""<div style="position: relative; width: {PW}px; height: {PH}px; overflow: hidden; background: {bg}; {SANS}; color: {SILVER}">
{brushed(PW, PH) if bg == NIGHT else ""}
{frame(PW, PH) if frame_on else ""}
{inner}
</div>"""


def photo_slot(x, y, w, h, label, note="вставьте фото"):
    return f"""<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; overflow: hidden; background: {PANEL}; border: 2px solid {HAIR}">
<svg aria-hidden="true" width="{w}" height="{h}" style="position: absolute; left: 0; top: 0"><defs><pattern id="hatch{x}{y}" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V26" stroke="rgba(201,206,214,0.07)" stroke-width="10"></path></pattern></defs><rect width="100%" height="100%" fill="url(#hatch{x}{y})"></rect></svg>
<div style="position: absolute; left: 0; right: 0; top: {h // 2 - 70}px; display: flex; flex-direction: column; align-items: center; gap: 14px">
{icon("foto", 84, MUTED, bg=PANEL, stroke=5)}<div style="font-weight: 500; font-size: 26px; color: {MUTED}">[{note}]</div></div>
<div style="position: absolute; left: 28px; top: 28px; padding: 10px 24px; background: {label[1]}; color: {label[2]}; font-weight: 800; font-size: 28px; letter-spacing: 0.2em">{label[0]}</div>
</div>"""


def posts():
    boards = {}

    pillars = "".join(f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 18px; width: 260px">
{icon(k, 120, SCARLET, stroke=5)}<div style="{FORUM}; font-size: 46px; color: #FFFFFF">{t}</div></div>"""
                      for k, t in [("sborka", "Сборка"), ("chistka", "Обслуживание"), ("nastroyka", "Настройка")])
    inner = f"""{crest(380, x=350, y=120)}
<div style="position: absolute; left: 0; right: 0; top: 540px; display: flex; flex-direction: column; align-items: center; gap: 26px; text-align: center">
{eyebrow("IRON PRINCE · МИНСК")}
<div style="{FORUM}; font-size: 120px; line-height: 1; color: #FFFFFF">Привет, я Василий</div>
<div style="font-weight: 500; font-size: 36px; line-height: 1.4; color: {STEEL}; width: 820px">Собираю, обслуживаю и настраиваю компьютеры и ноутбуки. Аккуратно, с фотоотчётом и гарантией.</div></div>
<div style="position: absolute; left: 0; right: 0; top: 1020px; display: flex; justify-content: center; gap: 40px">{pillars}</div>"""
    boards["Post-1-Znakomstvo"] = ("Пост — знакомство", page("Пост — знакомство", PW, PH, post_shell(inner)))

    inner = f"""{header(PW, top=92)}
{photo_slot(84, 200, 450, 880, ("ДО", IVORY, INK), "фото до")}
{photo_slot(546, 200, 450, 880, ("ПОСЛЕ", SCARLET, "#FFFFFF"), "фото после")}
<svg aria-hidden="true" width="80" height="80" viewBox="0 0 80 80" style="position: absolute; left: 500px; top: 600px"><circle cx="40" cy="40" r="36" fill="{SILVER}"></circle><path d="M33 30l-10 10 10 10M47 30l10 10-10 10" fill="none" stroke="{NIGHT}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
<div style="position: absolute; left: 84px; right: 84px; top: 1120px; display: flex; justify-content: space-between; align-items: flex-end">
<div style="display: flex; flex-direction: column; gap: 14px">{eyebrow("ЧИСТКА ПК ОТ ПЫЛИ")}<div style="{FORUM}; font-size: 76px; line-height: 1; color: #FFFFFF">До и после</div></div>
<div style="display: flex; align-items: center; gap: 16px; padding: 18px 26px; border: 2px solid {HAIR}">{icon("termo", 56, SCARLET, stroke=6)}<div style="{FORUM}; font-size: 54px; color: #FFFFFF">[92]<span style="{SANS}; font-weight: 500">°</span> → [68]<span style="{SANS}; font-weight: 500">°</span></div></div></div>"""
    boards["Post-2-Do-posle"] = ("Пост — до / после", page("Пост — до / после", PW, PH, post_shell(inner)))

    items = [("sborka", "Сборка и укладка кабелей"), ("windows", "Windows и драйверы"),
             ("nastroyka", "Настройка BIOS"), ("chistka", "Кривые вентиляторов")]
    items_html = "".join(f"""<div style="display: flex; align-items: center; gap: 26px">{icon(k, 76, SCARLET, stroke=5.5)}
<div style="font-weight: 500; font-size: 36px; color: {SILVER}">{t}</div></div>""" for k, t in items)
    inner = f"""{header(PW, top=92)}
{photo_slot(84, 200, 912, 560, ("СБОРКА", SILVER, INK), "фото сборки")}
<div style="position: absolute; left: 110px; right: 110px; top: 810px; display: flex; justify-content: space-between; align-items: flex-start">
<div style="display: flex; flex-direction: column; gap: 30px">{eyebrow("КОМПЛЕКС")}<div style="{FORUM}; font-size: 96px; line-height: 1; color: #FFFFFF">Сборка<br>под ключ</div></div>
<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-top: 40px"><div style="font-weight: 500; font-size: 36px; color: {MUTED}; text-decoration: line-through">180 р.</div>
<div style="{FORUM}; font-size: 150px; line-height: 1; color: {SCARLET}">150<span style="{SANS}; font-weight: 500; font-size: 40px; color: {MUTED}"> р.</span></div></div></div>
<div style="position: absolute; left: 110px; right: 110px; top: 1100px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 30px 40px">{items_html}</div>"""
    boards["Post-3-Sborka-pod-klyuch"] = ("Пост — сборка под ключ", page("Пост — сборка под ключ", PW, PH, post_shell(inner)))

    checklist = [("Разборка и продувка корпуса", "uslugi"), ("Чистка лопастей и фильтров", "chistka"),
                 ("Замена термопасты", "termo"), ("Проверка температур под нагрузкой", "garantiya")]
    check_html = "".join(f"""<div style="display: flex; align-items: center; gap: 32px; padding: 30px 36px; background: {PANEL}; border: 2px solid {HAIR}">
<div style="{CINZEL}; font-weight: 700; font-size: 44px; color: {SCARLET}; width: 70px">{['I', 'II', 'III', 'IV'][n]}</div>
<div style="font-weight: 500; font-size: 36px; line-height: 1.25; color: {SILVER}">{t}</div>
<div style="margin-left: auto; flex-shrink: 0">{icon(k, 64, STEEL, bg=PANEL, stroke=5.5)}</div></div>""" for n, (t, k) in enumerate(checklist))
    inner = f"""{header(PW, top=92)}
<div style="position: absolute; left: 110px; right: 110px; top: 220px; display: flex; flex-direction: column; gap: 24px">
{eyebrow("ЧТО ВХОДИТ")}<div style="{FORUM}; font-size: 120px; line-height: 1; color: #FFFFFF">Полная чистка</div>{rule()}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 520px; display: flex; flex-direction: column; gap: 22px">{check_html}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1190px; display: flex; justify-content: space-between; align-items: baseline">
<div style="font-weight: 500; font-size: 34px; color: {STEEL}">ПК — <span style="{FORUM}; font-size: 72px; color: #FFFFFF">45</span> р.</div>
<div style="font-weight: 500; font-size: 34px; color: {STEEL}">ноутбук — <span style="{FORUM}; font-size: 72px; color: #FFFFFF">50</span> р.</div></div>"""
    boards["Post-4-Chistka"] = ("Пост — что входит в чистку", page("Пост — что входит в чистку", PW, PH, post_shell(inner)))

    inner = f"""{header(PW, top=92)}
<div style="position: absolute; left: 0; right: 0; top: 270px; display: flex; flex-direction: column; align-items: center; gap: 22px; text-align: center">
{eyebrow("ЗАЧЕМ ЧИСТИТЬ")}<div style="{FORUM}; font-size: 112px; line-height: 1.02; color: #FFFFFF">Компьютер шумит<br>и греется?</div></div>
<div style="position: absolute; left: 110px; right: 110px; top: 640px; display: flex; justify-content: center; align-items: center; gap: 50px">
<div style="display: flex; flex-direction: column; align-items: center; gap: 8px"><div style="font-weight: 800; font-size: 28px; letter-spacing: 0.2em; color: {MUTED}">БЫЛО</div><div style="{FORUM}; font-size: 220px; line-height: 1; color: {SCARLET}; white-space: nowrap">[92]<span style="{SANS}; font-weight: 400; font-size: 120px; vertical-align: 70px">°</span></div></div>
<svg aria-hidden="true" width="110" height="60" viewBox="0 0 110 60"><path d="M6 30H96M76 10l20 20-20 20" fill="none" stroke="{STEEL}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></path></svg>
<div style="display: flex; flex-direction: column; align-items: center; gap: 8px"><div style="font-weight: 800; font-size: 28px; letter-spacing: 0.2em; color: {MUTED}">СТАЛО</div><div style="{FORUM}; font-size: 220px; line-height: 1; color: #FFFFFF; white-space: nowrap">[68]<span style="{SANS}; font-weight: 400; font-size: 120px; vertical-align: 70px">°</span></div></div></div>
<div style="position: absolute; left: 150px; right: 150px; top: 1000px; font-weight: 500; font-size: 36px; line-height: 1.45; color: {STEEL}; text-align: center">Пыль и высохшая термопаста — главные причины перегрева. Чистка с заменой пасты возвращает тишину и запас по температурам.</div>
<div style="position: absolute; left: 0; right: 0; top: 1240px; text-align: center; font-weight: 500; font-size: 26px; color: {MUTED}">[вставьте реальные температуры процессора до и после]</div>"""
    boards["Post-5-Temperatury"] = ("Пост — температуры до / после", page("Пост — температуры до / после", PW, PH, post_shell(inner)))

    stars = "".join(f'<svg aria-hidden="true" width="64" height="64" viewBox="0 0 100 100"><path d="M50 8l12 27 29 3-22 20 6 29-25-15-25 15 6-29-22-20 29-3z" fill="{SCARLET}"></path></svg>' for _ in range(5))
    inner = f"""{header(PW, top=92)}
<div style="position: absolute; left: 0; right: 0; top: 260px; display: flex; flex-direction: column; align-items: center; gap: 34px">
{eyebrow("ОТЗЫВ")}<div style="display: flex; gap: 14px">{stars}</div></div>
<div style="position: absolute; left: 130px; right: 130px; top: 430px; {FORUM}; font-size: 200px; line-height: 0.6; color: {SCARLET}; text-align: center">«</div>
<div style="position: absolute; left: 150px; right: 150px; top: 600px; {FORUM}; font-size: 66px; line-height: 1.2; color: #FFFFFF; text-align: center">[Текст отзыва клиента: что сделали и как теперь работает компьютер]</div>
<div style="position: absolute; left: 0; right: 0; top: 1060px; display: flex; flex-direction: column; align-items: center; gap: 16px">
{rule(80)}<div style="font-weight: 700; font-size: 36px; color: {SILVER}">[Имя клиента]</div><div style="font-weight: 500; font-size: 28px; color: {MUTED}">[услуга] · Kufar</div></div>"""
    boards["Post-6-Otzyv"] = ("Пост — отзыв", page("Пост — отзыв", PW, PH, post_shell(inner)))
    return boards


# ---------- 00: profile preview and brand sheet ----------

POST_KEYS = ["Post-1-Znakomstvo", "Post-2-Do-posle", "Post-3-Sborka-pod-klyuch",
             "Post-4-Chistka", "Post-5-Temperatury", "Post-6-Otzyv"]


def body_of(html):
    return html.split("</helmet>", 1)[1].split("</x-dc>", 1)[0]


def main_board(post_boards):
    stats = "".join(f'<div style="display: flex; flex-direction: column; align-items: flex-start"><div style="font-weight: 700; font-size: 40px">{n}</div>'
                    f'<div style="font-size: 28px; color: #D6D6D6">{t}</div></div>' for n, t in [("6", "публикации"), ("0", "подписчики"), ("0", "подписки")])
    bio = "".join(f"<div>{line}</div>" for line in BIO)
    hl = "".join(f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 150px">
<div style="position: relative; width: 140px; height: 140px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 3px #363636">
<div style="transform: scale({140 / 1080}); transform-origin: 0 0">{cover_body(k, "Steel")}</div></div>
<div style="font-size: 24px; color: #F2F2F2; white-space: nowrap">{label}</div></div>""" for k, label, _ in HIGHLIGHTS[:6])
    scale = 359 / PW
    tiles = "".join(f"""<div style="position: relative; height: 479px; overflow: hidden; background: #1C1C1C">
<div style="transform: scale({scale:.4f}); transform-origin: 0 0">{body_of(post_boards[k][1])}</div></div>""" for k in POST_KEYS)
    body = f"""<div style="position: relative; width: 1080px; height: 2140px; overflow: hidden; background: #0C0C0C; {SANS}; color: #F5F5F5">
<div style="position: absolute; left: 40px; top: 52px; display: flex; align-items: center; gap: 34px">
<svg aria-hidden="true" width="34" height="56" viewBox="0 0 17 28" fill="none" stroke="#F5F5F5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3L3 14L14 25"></path></svg>
<div style="font-weight: 700; font-size: 46px">{HANDLE}</div>
</div>
<div style="position: absolute; left: 44px; top: 170px; width: 262px; height: 262px; border-radius: 50%; overflow: hidden; background: {NIGHT}">
{crest(210, x=26, y=22)}
</div>
<div style="position: absolute; left: 350px; top: 178px; right: 40px; font-weight: 700; font-size: 34px; line-height: 1.25">{NAME}</div>
<div style="position: absolute; left: 350px; top: 296px; right: 60px; display: flex; justify-content: space-between">{stats}</div>
<div style="position: absolute; left: 44px; top: 470px; right: 44px; font-size: 31px; line-height: 1.42; color: #EDEDED">{bio}
<div style="margin-top: 4px; font-weight: 700; color: #B9CCF5">t.me/[ваш_ник]</div></div>
<div style="position: absolute; left: 44px; right: 44px; top: 760px; display: flex; gap: 16px">
<div style="flex: 1; height: 84px; border-radius: 18px; background: #2A2A2A; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 31px">Подписаться</div>
<div style="flex: 1; height: 84px; border-radius: 18px; background: #2A2A2A; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 31px">Сообщение</div>
</div>
<div style="position: absolute; left: 30px; right: 30px; top: 900px; display: flex; justify-content: space-between">{hl}</div>
<div style="position: absolute; left: 0; right: 0; top: 1170px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px">{tiles}</div>
</div>"""
    return page("Профиль — как будет выглядеть страница", 1080, 2140, body)


def style_board():
    swatches = [("Ночь", NIGHT, "фон"), ("Щит", FIELD, "поля герба, карточки"), ("Сталь", STEEL, "линии, текст"),
                ("Алый", SCARLET, "корона, акценты, цены"), ("Слоновая кость", IVORY, "светлые версии"), ("Графит", INK, "текст на светлом")]
    sw = "".join(f"""<div style="display: flex; flex-direction: column; gap: 10px">
<div style="height: 140px; background: {c}; border: 2px solid {HAIR}"></div>
<div style="{FORUM}; font-size: 40px; line-height: 1; color: #FFFFFF">{n}</div>
<div style="font-weight: 700; font-size: 22px; letter-spacing: 0.1em; color: {STEEL}">{c}</div>
<div style="font-weight: 500; font-size: 24px; color: {MUTED}">{d}</div></div>""" for n, c, d in swatches)
    fonts = [("Cinzel", "логотип, латиница", f"{CINZEL}; font-weight: 700; font-size: 72px; letter-spacing: 0.06em", "IRON PRINCE"),
             ("Forum", "заголовки на русском", f"{FORUM}; font-size: 80px", "Полная чистка"),
             ("Manrope", "текст, цены, кнопки", f"{SANS}; font-weight: 500; font-size: 36px", "Сборка · обслуживание · настройка")]
    fr = "".join(f"""<div style="padding: 24px 0; border-top: 2px solid {HAIR}">
<div style="font-weight: 800; font-size: 22px; letter-spacing: 0.24em; color: {SCARLET}">{n.upper()} · {r.upper()}</div>
<div style="margin-top: 10px; line-height: 1.1; color: #FFFFFF; {css}">{s}</div></div>""" for n, r, css, s in fonts)
    icons = "".join(icon(k, 92, STEEL, stroke=4.5) for k in ["sborka", "chistka", "nastroyka", "uslugi", "ceny", "garantiya", "otzyvy", "zakaz"])
    body = f"""<div style="position: relative; width: 1080px; height: 2160px; overflow: hidden; background: {NIGHT}; {SANS}; color: {SILVER}">
{brushed(1080, 2160)}
{frame(1080, 2160)}
<div style="position: absolute; left: 110px; right: 110px; top: 110px; display: flex; justify-content: space-between; font-weight: 800; font-size: 22px; letter-spacing: 0.28em; color: {STEEL}"><div>IRON PRINCE</div><div>ФИРМЕННЫЙ СТИЛЬ</div></div>
<div style="position: absolute; left: 110px; right: 110px; top: 190px; display: flex; align-items: center; justify-content: space-between">
{crest(330)}
<div style="display: flex; flex-direction: column; align-items: center; gap: 20px">{sign(150)}{sign(64)}{sign(32)}</div>
<div style="width: 300px; height: 300px; background: {IVORY}; display: flex; align-items: center; justify-content: center">{crest(250, steel=INK, field="none", accent=INK)}</div>
</div>
<div style="position: absolute; left: 0; right: 0; top: 580px">{wordmark(84, sub="PC SERVICE · MINSK")}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 800px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 36px 30px">{sw}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1430px">{fr}</div>
<div style="position: absolute; left: 110px; right: 110px; top: 1940px; display: flex; justify-content: space-between">{icons}</div>
</div>"""
    return page("Фирменный стиль", 1080, 2160, body)


# ---------- canvas index ----------

def write_canvas(groups):
    boards, order = {}, []
    y = 0
    for row in groups:
        x, h = 0, 0
        for name, (title, html) in row.items():
            w = int(html.split('"width":')[1].split(",")[0])
            bh = int(html.split('"height":')[1].split("}")[0])
            boards[f"{name}.dc.html"] = {"x": x, "y": y, "w": w, "h": bh, "title": title}
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
    for row in groups:
        for name, (_, html) in row.items():
            (PROJECT / f"{name}.dc.html").write_text(html)
    write_canvas(groups)
    print(f"{sum(len(r) for r in groups)} artboards → {PROJECT}")


if __name__ == "__main__":
    main()
