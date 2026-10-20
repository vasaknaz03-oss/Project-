"""«Важно» stories and the blank templates (works, reviews, a new filling, a teaser).

Run `python3 tools/build.py` (it calls this module).
"""
from build import CARAMEL, CARAMEL_TEXT, CHERRY, COCOA, HAND, INK, PAPER, PROJECT, heart
from build_fillings import F, SHADOW, footer, header, slice_svg, story, tape

TG = "@BMU_GS"
MARCK = "font-family: 'Marck Script', cursive"
MONT = "font-family: 'Montserrat', sans-serif"


def pill(text, x, y, size=34):
    return (f'<div style="position: absolute; left: {x}px; top: {y}px; padding: 30px 64px; border-radius: 999px; background: {INK}; '
            f'{MONT}; font-weight: 600; font-size: {size}px; letter-spacing: 0.16em; color: #FBF5EC">{text}</div>')


def paper(x, y, w, inner, rot=-1.2, pad="48px 54px 46px", h=None):
    height = f" height: {h}px;" if h else ""
    return (f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px;{height} box-sizing: border-box; padding: {pad}; '
            f'background: {PAPER}; box-shadow: {SHADOW}; transform: rotate({rot}deg)">{inner}</div>')


def stamp(x, y, big, small, rot):
    return f"""<div style="position: absolute; left: {x}px; top: {y}px; width: 292px; height: 292px; border-radius: 50%; background: {CARAMEL}; transform: rotate({rot}deg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; color: #FBF5EC">
<svg aria-hidden="true" width="292" height="292" style="position: absolute; left: 0; top: 0"><circle cx="146" cy="146" r="130" fill="none" stroke="#FBF5EC" stroke-width="3" stroke-dasharray="10 11" stroke-linecap="round"></circle></svg>
<div style="font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 500; font-size: 60px; line-height: 0.95">{big}</div>
<div style="width: 214px; {MARCK}; font-size: 33px; line-height: 1.1">{small}</div>
</div>"""


def label(x, y, text, rot=-3, size=44):
    """A torn-paper note like «на день рождения» in the posts."""
    return f"""<div style="position: absolute; left: {x}px; top: {y}px; transform: rotate({rot}deg)">
<div style="padding: 26px 40px 34px; background: {PAPER}; box-shadow: {SHADOW}; {MARCK}; font-size: {size}px; line-height: 1.1; color: {HAND}; clip-path: polygon(0 0, 100% 0, 100% 86%, 95% 100%, 90% 86%, 85% 100%, 80% 86%, 75% 100%, 70% 86%, 65% 100%, 60% 86%, 55% 100%, 50% 86%, 45% 100%, 40% 86%, 35% 100%, 30% 86%, 25% 100%, 20% 86%, 15% 100%, 10% 86%, 5% 100%, 0 86%)">{text}</div>
</div>"""


def doodles(paths, accent=""):
    return (f'<svg aria-hidden="true" width="1080" height="1920" style="position: absolute; left: 0; top: 0" fill="none" stroke="{CARAMEL}" '
            f'stroke-width="4" stroke-linecap="round" stroke-linejoin="round">{paths}{accent}</svg>')


def red_heart(cx, cy, s):
    return f'<path d="{heart(cx, cy, s)}" fill="{CHERRY}" stroke="none"></path>'


def title(line1, line2, size1=176, size2=96):
    second = f'<div style="position: absolute; left: 72px; top: {322 + size1 - 10}px; font-size: {size2}px; line-height: 1">{line2}</div>' if line2 else ""
    return f'<div style="position: absolute; left: 62px; top: 318px; font-style: italic; font-size: {size1}px; line-height: 1">{line1}</div>{second}'


# ---------------------------------------------------------------- «Важно»

def vazhno_contacts():
    card = f"""<div style="{MARCK}; font-size: 60px; line-height: 1.1; color: {INK}">Напишите мне в Telegram</div>
<div style="margin-top: 14px; font-weight: 500; font-size: 38px; line-height: 1.2; color: {HAND}">отвечу, помогу выбрать начинку и декор, посчитаю стоимость</div>
<div style="height: 180px"></div>
<div style="{MARCK}; font-size: 40px; color: {CARAMEL_TEXT}">ссылка на чат — в шапке профиля</div>"""
    body = f"""{header("DESSERTOPIA", "ВАЖНО · 01")}
{title("Важно", "перед заказом")}
{paper(70, 640, 940, card)}
{tape(462, 616)}
{pill(f"TG&#160;&#160;{TG}", 124, 886, 40)}
{doodles('<path d="M770 1076C826 1082 850 1052 856 1006M840 1020L856 1002L870 1022"></path>', red_heart(930, 940, 1.1))}
{stamp(62, 1236, "до 2 кг", "максимальный вес торта", -6)}
{stamp(394, 1276, "3–4 дня", "оптимально, чтобы заказать", 4)}
{stamp(726, 1226, "Минск", "самовывоз — ст. м. Аэродромная", -3)}
{footer("что написать — дальше")}"""
    return story("Важно — как заказать", body)


def checkbox(y):
    return (f'<path d="M0 {y}l3 -2 40 1 -1 42 -42 -1Z" transform="translate(0 0)"></path>'
            f'<path d="M10 {y + 22}L20 {y + 32}L40 {y + 4}" stroke="{COCOA}"></path>')


def vazhno_message():
    items = [
        ("дата и время", "к какому дню и часу нужен торт"),
        ("вес", "до 2 кг"),
        ("начинка", "смотрите «Начинки» в актуальном"),
        ("декор", "надпись, цвета, фото-референс"),
        ("доставка или самовывоз", "самовывоз — ст. м. Аэродромная"),
    ]
    rows = "".join(f"""<div style="display: flex; gap: 30px; align-items: flex-start">
<svg aria-hidden="true" width="50" height="50" viewBox="-4 -4 52 52" style="flex: none; margin-top: 8px" fill="none" stroke="{CARAMEL}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3L42 1L44 42L1 43Z"></path><path d="M10 22L20 33L42 3" stroke="{COCOA}" stroke-width="4.5"></path></svg>
<div><div style="{MARCK}; font-size: 54px; line-height: 1.05; color: {INK}">{a}</div>
<div style="margin-top: 2px; font-weight: 500; font-size: 34px; line-height: 1.15; color: {HAND}">{b}</div></div>
</div>""" for a, b in items)
    card = f'<div style="display: flex; flex-direction: column; gap: 22px">{rows}</div>'
    copy_lines = "".join(f"<div>{t}</div>" for t in ["Дата и время:", "Вес:", "Начинка:", "Декор / надпись:", "Доставка / самовывоз:"])
    copy = f"""<div style="{MARCK}; font-size: 40px; color: {CARAMEL_TEXT}">можно просто скопировать:</div>
<div style="margin-top: 12px; {MONT}; font-weight: 500; font-size: 28px; line-height: 1.55; color: {COCOA}">{copy_lines}</div>"""
    body = f"""{header("DESSERTOPIA", "ВАЖНО · 02")}
{title("Что указать", "в сообщении", 160, 92)}
{paper(70, 610, 940, card, -1, "46px 54px 44px")}
{tape(470, 588)}
{paper(250, 1296, 700, copy, 2, "36px 46px 34px")}
{tape(560, 1276, 130, 6)}
{doodles('<path d="M120 1380C140 1420 170 1440 214 1442M196 1426L216 1442L194 1456"></path>', red_heart(160, 1330, 1.0))}
{footer("про сроки — дальше")}"""
    return story("Важно — что написать в сообщении", body)


def calendar():
    cells, x0, y0, cw, ch = [], 120, 1036, 120, 86
    days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]
    for i, d in enumerate(days):
        cells.append(f'<text x="{x0 + i * cw + 60}" y="{y0}" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="500" font-size="24" letter-spacing="3" fill="{CARAMEL_TEXT}" stroke="none">{d.upper()}</text>')
    for n in range(1, 15):
        r, c = divmod(n - 1, 7)
        x, y = x0 + c * cw + 60, y0 + 70 + r * ch
        colour = INK if n in (9, 13) else "#8C7466"
        cells.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="500" font-size="46" fill="{colour}" stroke="none">{n}</text>')
    # пишете 9-го — торт к 13-му, через 4 дня
    marks = (f'<path d="M306 1144C272 1140 254 1160 262 1182C272 1206 330 1204 340 1180C348 1158 326 1140 296 1148" stroke="{CARAMEL}" stroke-width="4"></path>'
             f'<path d="M786 1144C752 1140 734 1160 742 1182C752 1206 810 1204 820 1180C828 1158 806 1140 776 1148" stroke="{CHERRY}" stroke-width="4.5"></path>'
             f'<path d="M338 1136C430 1078 650 1078 742 1132M720 1128L744 1134L734 1112" stroke="{CARAMEL}" stroke-width="4"></path>')
    return f'<svg role="img" aria-label="Календарь: пишете 9-го — торт к 13-му" width="1080" height="1920" style="position: absolute; left: 0; top: 0" fill="none">{"".join(cells)}{marks}</svg>'


def vazhno_terms():
    statement = f"""<div style="font-weight: 500; font-size: 42px; line-height: 1.2; color: {HAND}">оптимальное время для заказа —</div>
<div style="margin: 6px 0 2px; {MARCK}; font-size: 124px; line-height: 1.05; color: {INK}">за 3–4 дня</div>
<div style="font-weight: 500; font-size: 42px; line-height: 1.2; color: {HAND}">до нужной даты</div>"""
    body = f"""{header("DESSERTOPIA", "ВАЖНО · 03")}
{title("Сроки", "и детали")}
{paper(70, 600, 940, statement, -1, "44px 54px 42px")}
{tape(470, 578)}
{paper(70, 958, 940, "", 1, "0", 400)}
{calendar()}
<div style="position: absolute; left: 170px; top: 1250px; {MARCK}; font-size: 42px; color: {CARAMEL_TEXT}; transform: rotate(-3deg)">пишете сегодня</div>
<div style="position: absolute; left: 640px; top: 1246px; {MARCK}; font-size: 42px; color: {CHERRY}; transform: rotate(3deg)">ваш праздник</div>
<div style="position: absolute; left: 70px; top: 1420px; width: 940px; text-align: center; font-weight: 500; font-size: 38px; line-height: 1.25; color: {HAND}">максимальный вес — 2 кг · самовывоз — ст. м. Аэродромная, доставку обсудим в переписке</div>
{pill(f"НАПИСАТЬ В TELEGRAM", 230, 1556, 32)}
{doodles("", red_heart(918, 1566, 1.0))}"""
    return story("Важно — сроки и детали", body)


def tip_icon(kind):
    paths = {
        "cold": "M30 6L30 54M9 18L51 42M9 42L51 18M24 10L30 16L36 10M24 50L30 44L36 50",
        "clock": "M30 30m-24 0a24 24 0 1 0 48 0a24 24 0 1 0 -48 0M30 16L30 30L40 36",
        "sun": "M30 30m-11 0a11 11 0 1 0 22 0a11 11 0 1 0 -22 0M30 5L30 11M30 49L30 55M5 30L11 30M49 30L55 30M12 12L16 16M44 44L48 48M48 12L44 16M12 48L16 44M6 54L54 6",
        "car": "M6 40L6 30L14 18L44 18L52 30L56 32L56 40ZM14 30L46 30M18 46m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M44 46m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0",
        "heart": heart(30, 32, 1.05),
    }
    return (f'<svg aria-hidden="true" width="84" height="84" viewBox="0 0 60 60" style="flex: none" fill="none" stroke="{CARAMEL}" stroke-width="3.6" '
            f'stroke-linecap="round" stroke-linejoin="round"><path d="{paths[kind]}"></path></svg>')


def vazhno_storage():
    tips = [
        ("cold", "в холодильнике", "при +2…+6 °C, в коробке"),
        ("clock", "за 20–30 минут до подачи", "достаньте торт — так вкус раскроется ярче"),
        ("sun", "без тепла и солнца", "крем-чиз не любит жару"),
        ("car", "в машине", "на ровной поверхности, а не на коленях"),
        ("heart", "вкуснее всего", "в первые 2–3 дня"),
    ]
    rows = "".join(f"""<div style="display: flex; gap: 34px; align-items: center">{tip_icon(k)}
<div><div style="{MARCK}; font-size: 52px; line-height: 1.05; color: {INK}">{a}</div>
<div style="margin-top: 2px; font-weight: 500; font-size: 34px; line-height: 1.15; color: {HAND}">{b}</div></div></div>""" for k, a, b in tips)
    body = f"""{header("DESSERTOPIA", "ВАЖНО · 04")}
{title("Как хранить", "торт", 160, 96)}
{paper(70, 620, 940, f'<div style="display: flex; flex-direction: column; gap: 34px">{rows}</div>', -1, "52px 54px 50px")}
{tape(470, 598)}
<div style="position: absolute; left: 70px; top: 1500px; width: 940px; text-align: center; {MARCK}; font-size: 46px; color: {CARAMEL_TEXT}">приятного чаепития!</div>
{doodles("", red_heart(840, 1520, 0.9))}"""
    return story("Важно — как хранить торт", body)


# ---------------------------------------------------------------- templates

def polaroid(x, y, w, h, rot, img="", caption="", cap_size=52):
    photo = (f'<img src="{img}" alt="" style="display: block; width: {w}px; height: {h}px; object-fit: cover">' if img else
             f'<div style="width: {w}px; height: {h}px; box-sizing: border-box; border: 3px dashed rgba(173,122,79,0.45); background: #EFE6DA"></div>')
    return f"""<div style="position: absolute; left: {x}px; top: {y}px; padding: 28px 28px 128px; background: {PAPER}; box-shadow: {SHADOW}; transform: rotate({rot}deg)">
{photo}
<div style="position: absolute; left: 0; right: 0; bottom: 36px; text-align: center; {MARCK}; font-size: {cap_size}px; color: {HAND}">{caption}</div>
</div>"""


def tpl_work(with_photo):
    img = "/_blob/4053d6ba731c96bceb9810e75856a825" if with_photo else ""
    notes = ""
    if with_photo:
        notes = (label(44, 600, "надпись — ваша идея", -4, 44)
                 + label(640, 1196, "бантики из атласной ленты", 4, 40)
                 + doodles('<path d="M300 724C350 760 400 800 470 826M448 812L472 828L450 840"></path>'
                           '<path d="M700 1192C680 1150 650 1110 610 1080M612 1102L606 1078L630 1082"></path>', red_heart(960, 1530, 1.0)))
    body = f"""{header("DESSERTOPIA", "РАБОТЫ")}
{polaroid(140, 380, 744, 992, -2.5, img, "«время пить чай»" if with_photo else "")}
{tape(430, 356, 180, -3)}
{notes}
{footer("хочу такой — пишите" if with_photo else "")}"""
    return story("Работы — шаблон" if not with_photo else "Работы — пример", body)


def tpl_review():
    body = f"""{header("DESSERTOPIA", "ОТЗЫВЫ")}
{title("Спасибо", "за тёплые слова", 176, 88)}
{paper(110, 660, 860, "", 1.5, "0", 860)}
{tape(460, 636, 170, -3)}
{doodles('<path d="M96 1580C140 1556 168 1600 210 1576"></path><path d="M920 600L934 576M944 616L968 612M912 576L908 552"></path>',
         red_heart(186, 1620, 1.1) + red_heart(962, 1560, 0.8))}
{footer("ещё отзывы — листайте")}"""
    return story("Отзывы — шаблон", body)


def tpl_new_filling():
    body = f"""{header("DESSERTOPIA", "НАЧИНКИ · НОВИНКА")}
{title("Новая", "начинка")}
<div style="position: absolute; right: 70px; top: 548px; width: 400px; transform: rotate(-4deg); text-align: right; {MARCK}; font-size: 44px; line-height: 1.15; color: {CARAMEL_TEXT}">вкус в двух словах</div>
{polaroid(250, 650, 560, 420, 2.5, "", "в разрезе", 44)}
{tape(460, 628, 150, 4)}
<div style="position: absolute; left: 70px; right: 70px; top: 1262px; padding: 44px 52px 40px; background: {PAPER}; box-shadow: {SHADOW}; transform: rotate(-1deg)">
<div style="{MONT}; font-weight: 500; font-size: 22px; letter-spacing: 0.3em; color: {CARAMEL_TEXT}">СОСТАВ</div>
<div style="margin-top: 12px; font-weight: 500; font-size: 40px; line-height: 1.16; color: {HAND}">бисквит, крем, начинка — впишите состав</div>
<div style="margin-top: 22px; display: flex; gap: 14px"><div style="padding: 10px 24px; border: 2px solid {CARAMEL}; border-radius: 999px; {MONT}; font-weight: 500; font-size: 22px; letter-spacing: 0.2em; color: {CARAMEL_TEXT}">В ТОРТАХ</div><div style="padding: 10px 24px; border: 2px solid {CARAMEL}; border-radius: 999px; {MONT}; font-weight: 500; font-size: 22px; letter-spacing: 0.2em; color: {CARAMEL_TEXT}">В ТРАЙФЛАХ</div></div>
</div>
{tape(465, 1240)}
{footer("выбрали? пишите мне")}"""
    return story("Шаблон — новая начинка", body)


def tpl_soon():
    mystery = dict(F["Banan"], sponge="vanilla", filling="caramel", inclusion="none", topping="none", name="Секрет")
    slice_html = slice_svg(mystery, 630, "Разрез новой начинки — пока секрет").replace("#EDC98A", "#E7DCCD").replace("#C98A3C", "#D6C6B2")
    body = f"""{header("DESSERTOPIA", "СКОРО")}
{title("Скоро", "новая начинка")}
<div style="position: absolute; left: 362px; top: 662px">{slice_html}</div>
<div style="position: absolute; left: 520px; top: 830px; width: 300px; text-align: center; font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 260px; line-height: 1; color: {CARAMEL}">?</div>
<div style="position: absolute; left: 70px; top: 1290px; width: 940px; text-align: center; {MARCK}; font-size: 58px; line-height: 1.15; color: {INK}">угадаете вкус?</div>
<div style="position: absolute; left: 70px; top: 1372px; width: 940px; text-align: center; font-weight: 500; font-size: 38px; color: {HAND}">пишите версии в ответ на эту историю</div>
{doodles('<path d="M180 820L196 796M206 840L232 836M172 790L168 764"></path><path d="M900 1240L916 1264M880 1260L882 1286"></path>', red_heart(240, 900, 0.9) + red_heart(930, 700, 0.7))}"""
    return story("Шаблон — скоро новая начинка", body)


def tpl_reels_cover():
    """Reels cover: the grid shows only the middle 3:4 (y 240–1680), so everything sits inside it."""
    body = f"""<div style="position: absolute; left: 70px; right: 70px; top: 300px; text-align: center; {MONT}; font-weight: 500; font-size: 24px; letter-spacing: 0.3em; color: #6B4A3A">DESSERTOPIA · REELS</div>
<div style="position: absolute; left: 70px; right: 70px; top: 368px; text-align: center; font-style: italic; font-size: 132px; line-height: 1">Название</div>
<div style="position: absolute; left: 70px; right: 70px; top: 500px; text-align: center; font-size: 84px; line-height: 1">ролика</div>
{polaroid(200, 650, 624, 700, -2, "", "подпись от руки", 48)}
{tape(440, 628, 180, -3)}
{doodles('<path d="M140 760L156 736M166 780L192 776M132 730L128 704"></path>', red_heart(910, 1440, 1.0))}"""
    return story("Шаблон — обложка Reels", body)


def bow(x, y, s=1.0, colour=CHERRY, rot=0):
    """A ribbon bow doodle, as on the cakes."""
    return (f'<svg aria-hidden="true" width="{round(150 * s)}" height="{round(110 * s)}" viewBox="-75 -40 150 110" '
            f'style="position: absolute; left: {x}px; top: {y}px; transform: rotate({rot}deg)" fill="none" stroke="{colour}" stroke-width="4" '
            'stroke-linecap="round" stroke-linejoin="round"><path d="M-4 0C-30 -30 -70 -22 -62 2C-56 20 -24 12 -4 0Z"></path>'
            '<path d="M4 0C30 -30 70 -22 62 2C56 20 24 12 4 0Z"></path><path d="M-4 4C-14 24 -26 46 -40 62M4 4C12 26 22 46 36 64"></path>'
            '<path d="M0 0m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" fill="' + colour + '"></path></svg>')


def tpl_prices():
    rows = [
        ("Бенто-торт", "мини-торт с надписью"),
        ("Торт", "за 1 кг · до 2 кг"),
        ("Трайфл", "1 стаканчик"),
        ("Набор трайфлов", "количество на выбор"),
        ("Декор", "ягоды, топперы, сложная надпись"),
    ]
    items = "".join(f"""<div>
<div style="display: flex; align-items: baseline; gap: 14px">
<div style="{MARCK}; font-size: 54px; line-height: 1.1; color: {INK}">{a}</div>
<div style="flex: 1; border-bottom: 4px dotted rgba(173,122,79,0.6); transform: translateY(-10px)"></div>
<div style="font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 500; font-size: 52px; color: {INK}">[цена]</div>
</div>
<div style="font-weight: 500; font-size: 32px; line-height: 1.15; color: {HAND}">{b}</div>
</div>""" for a, b in rows)
    card = f'<div style="display: flex; flex-direction: column; gap: 30px">{items}</div>'
    body = f"""{header("DESSERTOPIA", "ЦЕНЫ")}
{title("Цены", "и форматы")}
{paper(70, 630, 940, card, -1, "56px 56px 52px")}
{bow(436, 568, 1.4)}
<div style="position: absolute; left: 70px; top: 1390px; width: 940px; text-align: center; font-weight: 500; font-size: 38px; line-height: 1.25; color: {HAND}">точную стоимость посчитаю в переписке — зависит от веса, начинки и декора</div>
{pill("НАПИСАТЬ В TELEGRAM", 230, 1530, 32)}
{doodles("", red_heart(918, 1580, 1.0))}"""
    return story("Шаблон — цены", body)


def build_stories():
    out = {
        "Vazhno-1-Kak-zakazat": vazhno_contacts(),
        "Vazhno-2-Chto-napisat": vazhno_message(),
        "Vazhno-3-Sroki": vazhno_terms(),
        "Vazhno-4-Khranenie": vazhno_storage(),
        "Tpl-1-Rabota-primer": tpl_work(True),
        "Tpl-2-Rabota-pustoy": tpl_work(False),
        "Tpl-3-Otzyv": tpl_review(),
        "Tpl-4-Novaya-nachinka": tpl_new_filling(),
        "Tpl-5-Skoro": tpl_soon(),
        "Tpl-6-Reels-oblozhka": tpl_reels_cover(),
        "Tpl-7-Ceny": tpl_prices(),
    }
    for name, html in out.items():
        (PROJECT / f"{name}.dc.html").write_text(html)


if __name__ == "__main__":
    build_stories()
