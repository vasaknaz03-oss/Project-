"""Pinned feed posts, 1080×1440 (3:4, shown whole in the profile grid): three cover tiles and the
carousel slides behind them — «Заказ и доставка», «Цены и начинки», «Хранение и подача».

Run `python3 tools/build.py` (it calls this module).
"""
from build import CARAMEL, CARAMEL_TEXT, CHERRY, COCOA, CREAM, HAND, INK, PAPER, PROJECT, RULE, heart, page, paper_noise
from build_fillings import DATA, F, SHADOW, keep_words, mini_stack, tape
from build_stories import (EXTRAS, MARCK, MONT, TG, bow, cake_doodle, doodles, paper, pill, price_stamp, red_heart,
                           size_pill, stamp, tip_icon)

W, H = 1080, 1440
VIBES = "font-family: 'Great Vibes', cursive"
CAPS = "font-family: 'Playfair Display SC', serif"


def post(title, body):
    return page(title, W, H, f"""<div style="position: relative; width: {W}px; height: {H}px; overflow: hidden; background: {CREAM}; font-family: 'Cormorant Garamond', serif; color: {INK}">
{paper_noise(W, H)}
{body}
</div>""")


def wave(offset=0, y=1300):
    """The dotted ribbon; `offset` shifts it so three tiles side by side make one continuous line."""
    pts = []
    for i in range(0, 3 * W + 1, 30):
        import math
        pts.append(f"{i - offset},{y + 34 * math.sin(i / 260):.0f}")
    return (f'<svg aria-hidden="true" width="{W}" height="{H}" style="position: absolute; left: 0; top: 0" fill="none">'
            f'<polyline points="{" ".join(pts)}" stroke="{CARAMEL}" stroke-width="4" stroke-dasharray="0.1 14" stroke-linecap="round"></polyline></svg>')


def post_header(left, right):
    return (f'<div style="position: absolute; left: 64px; right: 64px; top: 58px; display: flex; justify-content: space-between; {MONT}; '
            f'font-weight: 500; font-size: 22px; letter-spacing: 0.28em; color: #6B4A3A"><div>{left}</div><div>{right}</div></div>'
            f'<div style="position: absolute; left: 64px; right: 64px; top: 104px; height: 2px; background: {RULE}"></div>')


def post_title(line1, line2, size1=124, size2=74):
    second = f'<div style="position: absolute; left: 70px; top: {136 + size1}px; font-size: {size2}px; line-height: 1">{line2}</div>' if line2 else ""
    return f'<div style="position: absolute; left: 60px; top: 132px; font-style: italic; font-size: {size1}px; line-height: 1">{line1}</div>{second}'


def signature(y=1318):
    return (f'<div style="position: absolute; right: 120px; top: {y}px; {VIBES}; font-size: 60px; line-height: 1; color: {CARAMEL_TEXT}">с любовью, Диана</div>'
            + doodles("", red_heart(990, y + 30, 0.8)))


# ---------------------------------------------------------------- cover tiles

PINS = [
    ("Zakaz", "ЗАКАЗ", "И ДОСТАВКА", "как заказать торт"),
    ("Ceny", "ЦЕНЫ", "И НАЧИНКИ", "что выбрать и сколько стоит"),
    ("Khranenie", "ХРАНЕНИЕ", "И ПОДАЧА", "чтобы торт был идеальным"),
]


def pattern():
    rows = []
    for i in range(9):
        shift = -260 if i % 2 else -40
        rows.append(f'<div style="position: absolute; left: {shift}px; top: {i * 168 - 40}px; white-space: nowrap; {VIBES}; font-size: 150px; '
                    f'line-height: 1; color: rgba(173,122,79,0.14)">dessertopia&#160;&#160;dessertopia&#160;&#160;dessertopia</div>')
    return "".join(rows)


def pin_cover(index, line1, line2, accent):
    body = f"""{pattern()}
{wave(index * W, 1236)}
<div style="position: absolute; left: 130px; top: 560px; width: 820px; box-sizing: border-box; padding: 76px 40px 62px; background: {PAPER}; box-shadow: {SHADOW}; transform: rotate({(-1.8, 1.2, -1.0)[index]}deg); text-align: center">
<div style="{CAPS}; font-size: 92px; line-height: 1.02; letter-spacing: 0.04em; color: {INK}">{line1}<br>{line2}</div>
<div style="margin-top: 26px; {VIBES}; font-size: 66px; line-height: 1; color: {CARAMEL_TEXT}">{accent}</div>
</div>
{bow(466, 508, 1.0)}
<div style="position: absolute; left: 0; right: 0; top: 1010px; text-align: center; {MARCK}; font-size: 44px; color: {HAND}">листайте →</div>"""
    return post(f"Закреплённый пост — {line1.lower()} {line2.lower()}", body)


# ---------------------------------------------------------------- «Заказ и доставка»

def zakaz_how():
    items = [
        ("дата и время", "к какому дню и часу нужен торт"),
        ("вес", "до 2 кг"),
        ("начинка", "смотрите пост «Цены и начинки»"),
        ("декор", "надпись, цвета, фото-референс"),
        ("доставка или самовывоз", "самовывоз — ст. м. Аэродромная"),
    ]
    rows = "".join(f"""<div style="display: flex; gap: 26px; align-items: flex-start">
<svg aria-hidden="true" width="46" height="46" viewBox="-4 -4 52 52" style="flex: none; margin-top: 8px" fill="none" stroke="{CARAMEL}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3L42 1L44 42L1 43Z"></path><path d="M10 22L20 33L42 3" stroke="{COCOA}" stroke-width="4.5"></path></svg>
<div><div style="{MARCK}; font-size: 50px; line-height: 1.05; color: {INK}">{a}</div>
<div style="font-weight: 500; font-size: 32px; line-height: 1.15; color: {HAND}">{b}</div></div></div>""" for a, b in items)
    body = f"""{post_header("DESSERTOPIA", "ЗАКАЗ · 2 / 3")}
{post_title("Напишите мне", "в Telegram")}
{pill(f"TG&#160;&#160;{TG}", 64, 362, 38)}
<div style="position: absolute; left: 600px; top: 352px; width: 400px; {MARCK}; font-size: 40px; line-height: 1.15; color: {CARAMEL_TEXT}; transform: rotate(-3deg)">ссылка на чат — в шапке профиля</div>
{paper(64, 528, 952, f'<div style="{VIBES}; font-size: 64px; line-height: 1; color: {CARAMEL_TEXT}">что указать в сообщении</div><div style="margin-top: 26px; display: flex; flex-direction: column; gap: 18px">{rows}</div>', -0.8, "40px 50px 44px")}
{tape(465, 506)}
{signature()}"""
    return post("Заказ — как заказать", body)


def zakaz_terms():
    body = f"""{post_header("DESSERTOPIA", "ЗАКАЗ · 3 / 3")}
{post_title("Сроки", "и получение")}
<div style="position: absolute; left: 0; right: 0; top: 410px; text-align: center; font-weight: 500; font-size: 40px; color: {HAND}">оптимальное время для заказа —</div>
<div style="position: absolute; left: 0; right: 0; top: 462px; text-align: center; {VIBES}; font-size: 190px; line-height: 1.1; color: {INK}">за 3–4 дня</div>
<div style="position: absolute; left: 0; right: 0; top: 680px; text-align: center; font-weight: 500; font-size: 40px; color: {HAND}">до нужной даты</div>
{stamp(70, 820, "до 2 кг", "максимальный вес торта", -6)}
{stamp(394, 860, "Минск", "самовывоз — ст. м. Аэродромная", 4)}
{stamp(718, 810, "доставка", "обсудим в переписке", -3)}
{pill("НАПИСАТЬ В TELEGRAM", 226, 1166, 32)}
{signature()}"""
    return post("Заказ — сроки и получение", body)


# ---------------------------------------------------------------- «Цены и начинки»

def ceny_cakes():
    extras = "".join(f"""<div style="display: flex; gap: 12px; align-items: flex-start">
<svg aria-hidden="true" width="24" height="24" viewBox="0 0 52 52" style="flex: none; margin-top: 9px"><path d="{heart(26, 27, 0.95)}" fill="{CHERRY}"></path></svg>
<div style="font-weight: 500; font-size: 33px; line-height: 1.15; color: {HAND}">{t}</div></div>""" for t in EXTRAS)
    sizes = [(300, 560, 128, 30, 150, "Ø 14 см", "1 кг", "от", "60 р", "за торт", -5), (765, 530, 172, 38, 180, "Ø 16–18 см", "1,5 кг", "от", "55 р", "за 1 кг", 4)]
    doodle = "".join(cake_doodle(cx, top, rx, ry, h, cherries=(i == 1)) for i, (cx, top, rx, ry, h, *_r) in enumerate(sizes))
    marks = "".join(f"""<div style="position: absolute; left: {cx - 200}px; top: {top - ry - 132}px; width: 400px; text-align: center; {MARCK}; font-size: 42px; color: {CARAMEL_TEXT}">{d}</div>
<div style="position: absolute; left: {cx - 200}px; top: 782px; width: 400px; text-align: center; {VIBES}; font-size: 76px; line-height: 1; color: {INK}">{w}</div>
{price_stamp(cx, 950, 190, a, b, c, r)}""" for cx, top, rx, ry, h, d, w, a, b, c, r in sizes)
    card = f"""<div style="{VIBES}; font-size: 58px; line-height: 1; color: {CARAMEL_TEXT}">оплачивается дополнительно</div>
<div style="margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 28px">{extras}</div>"""
    body = f"""{post_header("DESSERTOPIA", "ЦЕНЫ · 2 / 4")}
{post_title("Торты", "до 2 кг")}
<svg role="img" aria-label="Торт 1 кг диаметром 14 см и торт 1,5 кг диаметром 16–18 см" width="{W}" height="{H}" style="position: absolute; left: 0; top: 0" fill="none" stroke="{CARAMEL}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">{doodle}</svg>
{marks}
{paper(64, 1084, 952, card, -0.8, "32px 44px 34px")}
{doodles("", red_heart(300, 658, 0.9))}"""
    return post("Цены — торты", body)


def ceny_bento():
    rows = [
        ("Бенто мини · S", ["400 Г", "Ø 10 СМ"], "40 р", "", "/_blob/43c87a7532c29142ce5b92c4407abf10", "Бенто с котом", 3),
        ("Бенто макси · M", ["700 Г", "Ø 12 СМ"], "50 р", "", "/_blob/b86bd47934a448385ca390fc4c721a0d", "Бенто «Будь счастлива»", -3),
        ("Трайфлы", ["ОТ 4 ШТ"], "9 р", "за штуку", "/_blob/e7f5be81caaf56665d59f4c94ec359e5", "Трайфлы с карамелью", 2.5),
    ]
    html = []
    for i, (name, pills, big, small, img, alt, rot) in enumerate(rows):
        y = 340 + i * 316
        html.append(f"""<div style="position: absolute; left: 64px; top: {y + 4}px; {VIBES}; font-size: 76px; line-height: 1.05; color: {INK}">{name}</div>
<div style="position: absolute; left: 64px; top: {y + 108}px; display: flex; flex-direction: column; gap: 12px">{"".join(size_pill(t) for t in pills)}</div>
{price_stamp(440, y + 190, 170, "", big, small, -4 if i % 2 else 5)}
<div style="position: absolute; left: 650px; top: {y}px; padding: 14px; background: {PAPER}; box-shadow: {SHADOW}; transform: rotate({rot}deg)">
<img src="{img}" alt="{alt}" style="display: block; width: 246px; height: 262px; object-fit: cover"></div>
{tape(722, y - 18, 120, -rot * 2)}""")
    body = f"""{post_header("DESSERTOPIA", "ЦЕНЫ · 3 / 4")}
{post_title("Бенто", "и трайфлы", 124, 74)}
{"".join(html)}
<div style="position: absolute; left: 64px; right: 64px; top: 1290px; font-weight: 500; font-size: 30px; line-height: 1.2; color: {HAND}">ягоды, подтёки, рисунки кремом и другой декор — дополнительно</div>"""
    return post("Цены — бенто и трайфлы", body)


def ceny_fillings():
    rows = []
    for i, slug in enumerate(DATA["cakes"]):
        f = F[slug]
        y = 330 + i * 164
        rows.append(f"""<div style="position: absolute; left: 64px; right: 64px; top: {y}px; height: 156px; display: flex; align-items: center; gap: 36px">
<div style="flex: none; width: 140px">{mini_stack(f, 140, f["name"])}</div>
<div style="flex: 1; min-width: 0"><div style="{MARCK}; font-size: 50px; line-height: 1.05; color: {INK}">{f["name"]}</div>
<div style="margin-top: 2px; font-weight: 500; font-size: 28px; line-height: 1.14; color: {HAND}">{keep_words(f["desc"])}</div></div></div>""")
    body = f"""{post_header("DESSERTOPIA", "ЦЕНЫ · 4 / 4")}
{post_title("Начинки", "")}
<div style="position: absolute; right: 64px; top: 168px; {VIBES}; font-size: 64px; line-height: 1; color: {CARAMEL_TEXT}; transform: rotate(-4deg)">выбирайте любимую</div>
{"".join(rows)}"""
    return post("Цены — начинки", body)


# ---------------------------------------------------------------- «Хранение и подача»

def tips_card(tips):
    rows = "".join(f"""<div style="display: flex; gap: 30px; align-items: center">{tip_icon(k)}
<div><div style="{MARCK}; font-size: 56px; line-height: 1.05; color: {INK}">{a}</div>
<div style="margin-top: 4px; font-weight: 500; font-size: 35px; line-height: 1.15; color: {HAND}">{b}</div></div></div>""" for k, a, b in tips)
    return f'<div style="display: flex; flex-direction: column; gap: 56px">{rows}</div>'


def khranenie():
    tips = [
        ("cold", "в холодильнике", "при +2…+6 °C, в коробке"),
        ("heart", "вкуснее всего", "в первые 2–3 дня"),
        ("sun", "без тепла и солнца", "крем-чиз не любит жару"),
        ("car", "в дороге", "на ровной поверхности, а не на коленях"),
    ]
    body = f"""{post_header("DESSERTOPIA", "ХРАНЕНИЕ · 2 / 3")}
{post_title("Хранение", "торта")}
{paper(64, 420, 952, tips_card(tips), -0.8, "64px 56px 64px")}
{tape(465, 398)}
{signature()}"""
    return post("Хранение торта", body)


def podacha():
    tips = [
        ("clock", "за 20–30 минут", "достаньте торт из холодильника — вкус раскроется ярче"),
        ("knife", "ровный срез", "режьте ножом, нагретым в горячей воде"),
        ("candle", "свечи", "ставьте прямо перед подачей"),
        ("box", "если осталось", "уберите в холодильник в коробке или под плёнкой"),
    ]
    body = f"""{post_header("DESSERTOPIA", "ПОДАЧА · 3 / 3")}
{post_title("Подача", "к столу")}
{paper(64, 420, 952, tips_card(tips), 0.8, "64px 56px 64px")}
{tape(465, 398, 150, 3)}
<div style="position: absolute; left: 64px; top: 1220px; {VIBES}; font-size: 64px; line-height: 1; color: {INK}">приятного чаепития!</div>
{signature()}"""
    return post("Подача торта", body)


def build_pinned():
    out = {f"Pin-{i + 1}-{slug}": pin_cover(i, a, b, c) for i, (slug, a, b, c) in enumerate(PINS)}
    out.update({
        "Pin-1b-Zakaz-kak": zakaz_how(), "Pin-1c-Zakaz-sroki": zakaz_terms(),
        "Pin-2b-Ceny-torty": ceny_cakes(), "Pin-2c-Ceny-bento": ceny_bento(), "Pin-2d-Ceny-nachinki": ceny_fillings(),
        "Pin-3b-Khranenie": khranenie(), "Pin-3c-Podacha": podacha(),
    })
    for name, html in out.items():
        (PROJECT / f"{name}.dc.html").write_text(html)


if __name__ == "__main__":
    build_pinned()
