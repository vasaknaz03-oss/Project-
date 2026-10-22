"""The profile preview (Main) and the brand sheet (Style).

Run `python3 tools/build.py` (it calls this module).
"""
from build import CARAMEL, CARAMEL_TEXT, CHERRY, CONFETTI, CREAM, HAND, INK, PAPER, PROJECT, RULE, page, paper_noise

# Highlight covers, set A (rendered from canvas/project/Hl-A*.dc.html, see assets/mockup).
HIGHLIGHTS = [("936dc86e4b7294856e31df0b80822a2c", "Отзывы"), ("ee03acc4f89781860405ca13865aa8c0", "Работы"),
              ("796950df6ef1f70221e2e2d0d1ca78df", "Начинки"), ("7999d2873ee7cec572a053094090d0e2", "Важно"),
              ("8912bc48b5b1efa146edf85c153810c6", "Цены"), ("b5ea2827d31f2897c4f9f28f212e5ac2", "Десерты")]
GRID = [
    ("005080349611d3189dfe90de2a8bd929", "Закреплённый пост «Заказ и доставка»", "pin"),
    ("2ceec1c35d367293e7617c2252eb7139", "Закреплённый пост «Цены и начинки»", "pin"),
    ("4c7e3755ee36408cef662a32834a595e", "Закреплённый пост «Хранение и подача»", "pin"),
    ("f8fcf921f8e249a7b206a12603d5a9c9", "Карусель начинок", "carousel"),
    ("4e531b87e15dad19504aaaad31d66a47", "Карусель «Повод не нужен»", "carousel"),
    ("0192b5076a120dafd266790ff9ee6270", "Пост «Десерты в стаканчиках»", ""),
    ("3f2f924fea4a3947ce2a07ae1027e553", "Пост «Что написать на твоём торте?»", ""),
    ("acc311caf7482b23272767a83e2e6cb5", "Пост «Торты, которые говорят за тебя»", ""),
    ("4053d6ba731c96bceb9810e75856a825", "Торт «время пить чай»", ""),
]
BIO = [
    "Dessertopia — сладкая страна чудес",
    "бенто и торты до 2 кг · трайфлы",
    "самовывоз: м. Аэродромная (Минск Мир)",
    "заказ за 3–4 дня — пишите в Telegram ↓",
]
TAPE = "rgba(173,122,79,0.32)"


def highlight(blob, label):
    return f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 186px">
<div style="width: 176px; height: 176px; border-radius: 50%; box-shadow: 0 0 0 3px #0C0C0C, 0 0 0 6px #363636; overflow: hidden">
<img src="/_blob/{blob}" alt="Обложка «{label}»" style="display: block; width: 176px; height: 176px; object-fit: cover"></div>
<div style="font-size: 27px; color: #F2F2F2">{label}</div>
</div>"""


def tile(blob, alt, badge):
    icon = ""
    if badge == "pin":
        icon = ('<svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" style="position: absolute; right: 14px; top: 14px" fill="#FFFFFF">'
                '<path d="M15 3l6 6-3 1-3 3 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 3-3z"></path></svg>')
    if badge == "carousel":
        icon = ('<svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" style="position: absolute; right: 14px; top: 14px" fill="none" stroke="#FFFFFF" stroke-width="2">'
                '<rect x="3" y="7" width="13" height="14" rx="2"></rect><path d="M8 3h11a2 2 0 0 1 2 2v11"></path></svg>')
    return (f'<div style="position: relative; height: 477px; overflow: hidden; background: #1C1C1C">'
            f'<img src="/_blob/{blob}" alt="{alt}" style="display: block; width: 100%; height: 100%; object-fit: cover">{icon}</div>')


def main_board():
    stats = "".join(f'<div style="display: flex; flex-direction: column; align-items: flex-start"><div style="font-weight: 600; font-size: 40px">{n}</div>'
                     f'<div style="font-size: 28px; color: #D6D6D6">{t}</div></div>' for n, t in [("11", "публикации"), ("31", "подписчики"), ("10", "подписки")])
    bio = "".join(f"<div>{line}</div>" for line in BIO)
    body = f"""<div style="position: relative; width: 1080px; height: 2610px; overflow: hidden; background: #0C0C0C; font-family: 'Montserrat', sans-serif; color: #F5F5F5">
<div style="position: absolute; left: 40px; top: 52px; display: flex; align-items: center; gap: 34px">
<svg aria-hidden="true" width="34" height="56" viewBox="0 0 17 28" fill="none" stroke="#F5F5F5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3L3 14L14 25"></path></svg>
<div style="font-weight: 600; font-size: 46px">desserto.pia</div>
</div>
<div style="position: absolute; left: 44px; top: 170px; width: 262px; height: 262px; border-radius: 50%; overflow: hidden; background: {CREAM}">
<img src="/_blob/a9eac0041f17fa83168692c9ca4fcb63" alt="Аватар: торт-сердце" style="position: absolute; left: 42px; top: 46px; width: 178px">
</div>
<div style="position: absolute; left: 350px; top: 178px; right: 40px; font-weight: 600; font-size: 34px; line-height: 1.25">Диана | торты · бенто · трайфлы | Минск</div>
<div style="position: absolute; left: 350px; top: 296px; right: 60px; display: flex; justify-content: space-between">{stats}</div>
<div style="position: absolute; left: 44px; top: 470px; right: 44px; font-size: 31px; line-height: 1.42; color: #EDEDED">{bio}
<div style="margin-top: 4px; font-weight: 600; color: #B9CCF5">t.me/BMU_GS</div></div>
<div style="position: absolute; left: 44px; right: 44px; top: 760px; display: flex; gap: 16px">
<div style="flex: 1; height: 84px; border-radius: 18px; background: #2A2A2A; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 31px">Подписаться</div>
<div style="flex: 1; height: 84px; border-radius: 18px; background: #2A2A2A; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 31px">Сообщение</div>
</div>
<div style="position: absolute; left: 30px; right: 30px; top: 900px; display: flex; justify-content: space-between">{"".join(highlight(k, l) for k, l in HIGHLIGHTS[:5])}</div>
<div style="position: absolute; left: 0; right: 0; top: 1160px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px">{"".join(tile(*t) for t in GRID)}</div>
</div>"""
    return page("Профиль — как будет выглядеть страница", 1080, 2610, body)


def style_board():
    swatches = [
        ("Крем", CREAM, "фон всех макетов"), ("Бумага", PAPER, "карточки, полароиды"), ("Какао", INK, "заголовки, кнопка"),
        ("Шоколад", HAND, "рукописный текст"), ("Карамель", CARAMEL, "дудлы, штампы"), ("Вишня", CHERRY, "сердечки, акцент"),
    ]
    sw = "".join(f"""<div style="display: flex; flex-direction: column; gap: 10px">
<div style="height: 150px; border-radius: 18px; background: {c}; box-shadow: inset 0 0 0 2px rgba(46,32,25,0.10)"></div>
<div style="font-family: 'Marck Script', cursive; font-size: 40px; line-height: 1; color: {INK}">{n}</div>
<div style="font-family: 'Montserrat', sans-serif; font-weight: 500; font-size: 22px; letter-spacing: 0.1em; color: #6B4A3A">{c}</div>
<div style="font-weight: 500; font-size: 28px; line-height: 1.1; color: {HAND}">{d}</div></div>""" for n, c, d in swatches)
    confetti = "".join(f'<div style="width: 26px; height: 26px; border-radius: 50%; background: {c}"></div>' for c in CONFETTI.values())
    icons = "".join(f'<img src="/_blob/{k}" alt="Обложка «{l}»" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; box-shadow: 0 6px 16px rgba(74,46,36,0.16)">' for k, l in HIGHLIGHTS)
    fonts = [
        ("Cormorant Garamond", "заголовки", "font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 104px", "Повод не нужен"),
        ("Marck Script", "подписи от руки", "font-family: 'Marck Script', cursive; font-size: 72px", "для самой нежной"),
        ("Montserrat", "служебные надписи, кнопки", "font-family: 'Montserrat', sans-serif; font-weight: 500; font-size: 34px; letter-spacing: 0.3em", "СЛАДКИЙ АРХИВ"),
        ("Great Vibes", "каллиграфия, подпись", "font-family: 'Great Vibes', cursive; font-size: 92px", "с любовью, Диана"),
        ("Playfair Display SC", "закреплённые посты", "font-family: 'Playfair Display SC', serif; font-size: 64px; letter-spacing: 0.04em", "ХРАНЕНИЕ И ПОДАЧА"),
    ]
    fr = "".join(f"""<div style="padding: 26px 0; border-top: 2px solid {RULE}">
<div style="font-family: 'Montserrat', sans-serif; font-weight: 500; font-size: 22px; letter-spacing: 0.24em; color: {CARAMEL_TEXT}">{n.upper()} · {r.upper()}</div>
<div style="margin-top: 10px; line-height: 1.05; color: {INK}; {css}">{sample}</div></div>""" for n, r, css, sample in fonts)
    body = f"""<div style="position: relative; width: 1080px; height: 2380px; overflow: hidden; background: {CREAM}; font-family: 'Cormorant Garamond', serif; color: {INK}">
{paper_noise(1080, 2380)}
<div style="position: absolute; left: 70px; right: 70px; top: 70px; display: flex; justify-content: space-between; font-family: 'Montserrat', sans-serif; font-weight: 500; font-size: 24px; letter-spacing: 0.28em; color: #6B4A3A"><div>DESSERTOPIA</div><div>ФИРМЕННЫЙ СТИЛЬ</div></div>
<div style="position: absolute; left: 70px; right: 70px; top: 120px; height: 2px; background: {RULE}"></div>
<div style="position: absolute; left: 62px; top: 150px; font-style: italic; font-size: 160px; line-height: 1">Фирменный</div>
<div style="position: absolute; left: 72px; top: 310px; font-size: 92px; line-height: 1">стиль</div>
<div style="position: absolute; left: 430px; top: 330px; font-family: 'Marck Script', cursive; font-size: 46px; color: {CARAMEL_TEXT}; transform: rotate(-3deg)">как в «Сладком архиве»</div>
<div style="position: absolute; left: 70px; right: 70px; top: 470px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 34px 30px">{sw}</div>
<div style="position: absolute; left: 70px; top: 1150px; display: flex; gap: 18px; align-items: center"><div style="font-family: 'Marck Script', cursive; font-size: 40px; color: {HAND}">конфетти:</div>{confetti}</div>
<div style="position: absolute; left: 70px; right: 70px; top: 1230px">{fr}</div>
<div style="position: absolute; left: 70px; top: 2096px; font-family: 'Montserrat', sans-serif; font-weight: 500; font-size: 22px; letter-spacing: 0.24em; color: {CARAMEL_TEXT}">В ЛОГОТИПАХ ТАКЖЕ · LOBSTER · TENOR SANS</div>
<div style="position: absolute; left: 70px; top: 2140px; font-family: 'Marck Script', cursive; font-size: 40px; color: {HAND}">обложки актуального, набор A:</div>
<div style="position: absolute; left: 50px; right: 50px; top: 2206px; display: flex; justify-content: space-between">{icons}</div>
</div>"""
    return page("Фирменный стиль", 1080, 2380, body)


def build_profile():
    (PROJECT / "Main.dc.html").write_text(main_board())
    (PROJECT / "Style.dc.html").write_text(style_board())


if __name__ == "__main__":
    build_profile()
