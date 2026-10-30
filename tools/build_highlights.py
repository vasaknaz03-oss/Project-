"""Highlight covers, 1080×1080. «Отзывы» follows the original cover (word on top, berries below on a clean
background); the others each use their own way to get depth instead of a cut-out on a flat background:
«Работы» — the word set behind the cake in the real photo, «Начинки» — a cake taken apart into floating layers (three photo alternatives),
«Важно» — a chocolate slice on a fork under a spotlight on cocoa, «Цены» — a sharp kraft price tag over blurred caramel trifles.

Cut-outs come from tools/cutouts.py. Run `python3 tools/build.py` (it calls this module).
"""
from build import COCOA, PROJECT, page

CUT = {
    "malina": "/_blob/6e337375aa197f5ae76500d2a2c56f08", "barkhat": "/_blob/aa09a6fc09ca924ef383f077895fb3af",
    "banan": "/_blob/d67acf0d705c6ffc2d5a67853c319c83", "trifl": "/_blob/1b632c4ee3f7a61c0409caf9cd45dc04",
    "bento": "/_blob/458622d8f8bc36bd55cb9fe424af4ed3", "chai-full": "/_blob/27fe42987e573e2f936c47136d3bec8f",
    "shokolad": "/_blob/6cc559022b96d0a9dbe8a769308995fa",
}
PHOTO = {
    "chai": "/_blob/4053d6ba731c96bceb9810e75856a825", "trifly": "/_blob/e7f5be81caaf56665d59f4c94ec359e5",
    "kapkejk": "/_blob/339c8b88aa959a2aa969a1ba936be3d5", "razlet": "/_blob/8f0ee5d520d153d1e73b9c0891cb9ca2",
    "flatlay": "/_blob/c8cc432e1a071cfd25cf0b8436c25b18", "lozhka": "/_blob/28b75628e4c7758b70ac3bed327d8a37",
}
IVORY = "#FAF7F2"
CREAM = "#F6EBDD"
CONDENSED = "font-family: 'Oranienbaum', 'Playfair Display', serif"
VIBES = "font-family: 'Great Vibes', cursive"
SHADOW = "filter: drop-shadow(0 22px 26px rgba(74,46,36,0.20)) drop-shadow(0 4px 6px rgba(74,46,36,0.12))"
WARM = "filter: sepia(0.14) saturate(0.96) brightness(1.02)"


def cover(title, bg, body):
    return page(title, 1080, 1080, f"""<div style="position: relative; width: 1080px; height: 1080px; overflow: hidden; background: {bg}">
{body}
</div>""")


def cut(key, alt, left, top, width, rot=0, extra=""):
    turn = f"; transform: rotate({rot}deg)" if rot else ""
    return (f'<img src="{CUT[key]}" alt="{alt}" style="position: absolute; left: {left}px; top: {top}px; width: {width}px; '
            f'max-width: none; {extra or SHADOW}{turn}">')


def word(baseline, text, size, spacing=0):
    """Thin condensed didone, centred, placed by its baseline."""
    return (f'<svg role="img" aria-label="{text}" width="1080" height="1080" style="position: absolute; left: 0; top: 0">'
            f'<text x="540" y="{baseline}" text-anchor="middle" letter-spacing="{spacing}" '
            f'style="{CONDENSED}; font-size: {size}px" fill="{COCOA}">{text}</text></svg>')


def otzyvy():
    body = f"""{cut("malina", "Малина со сливками", -327, 24, 1681)}
<div style="position: absolute; left: 0; top: 0; width: 1080px; height: 520px; background: linear-gradient(180deg, {IVORY} 0%, {IVORY} 62%, rgba(250,247,242,0) 100%)"></div>
{word(376, "ОТЗЫВЫ", 228, 4)}"""
    return cover("Обложка — Отзывы", IVORY, body)


def raboty():
    """The real cake photo with «работы» set between the wall and the cake: the full-frame cut-out of the cake
    lies on top of the text, so the piped border and the ribbons pass in front of the letters."""
    frame = "position: absolute; left: 0; top: -225px; width: 1080px; max-width: none"   # source 960×1280, y 200…1160
    body = f"""<img src="{PHOTO["chai"]}" alt="" style="{frame}; {WARM}">
<div style="position: absolute; left: 0; right: 0; top: 150px; text-align: center; {VIBES}; font-size: 236px; line-height: 1; color: {COCOA}">работы</div>
<img src="{CUT["chai-full"]}" alt="Торт «время пить чай» с бантами" style="{frame}; {WARM}">"""
    return cover("Обложка — Работы", "#EDE9E4", body)


def nachinki_photo(key, alt, title, word="", word_top=96, word_colour=COCOA, glow=CREAM):
    """A full-bleed photo; optionally «начинки» in script on top, with a soft halo so it reads on any tone."""
    text = ""
    if word:
        text = (f'<div style="position: absolute; left: 0; right: 0; top: {word_top}px; text-align: center; {VIBES}; font-size: 236px; '
                f'line-height: 1; color: {word_colour}; text-shadow: 0 0 22px {glow}, 0 0 10px {glow}, 0 0 3px {glow}">{word}</div>')
    body = f"""<img src="{PHOTO[key]}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 1080px; height: 1080px; object-fit: cover; {WARM}">
{text}"""
    return cover(f"Обложка — Начинки, {title}", "#E9DFD2", body)


def nachinki():
    """A cake taken apart into its layers, floating — the same idea as the «в разлёте» filling stories."""
    return nachinki_photo("razlet", "Торт, разобранный на слои в воздухе", "слои в разлёте")


NACHINKI_VARIANTS = {
    "karamel": lambda: nachinki_photo("lozhka", "Карамель стекает с ложки на капкейк", "карамель с ложки"),
    "flatlay": lambda: nachinki_photo("flatlay", "Ингредиенты начинок в пиалах вокруг кусочка торта", "ингредиенты"),
    "kapkejk": lambda: nachinki_photo("kapkejk", "Капкейк в разрезе с карамельной начинкой", "ваш капкейк в разрезе"),
}


def vazhno(light="radial-gradient(circle at 50% 44%, #8A5B45 0%, #57372A 34%, #351F17 66%, #22130E 100%)", word=CREAM, title="Обложка — Важно"):
    """A chocolate cake slice on a gold fork under a spotlight; «важно» in cream script behind its top edge."""
    gold = "linear-gradient(90deg, #8E6A2E, #F1DCA6 45%, #A98642)"
    tines = "".join(f'<div style="position: absolute; left: {470 + i * 38}px; top: 850px; width: 16px; height: 120px; border-radius: 8px; background: {gold}"></div>'
                    for i in range(4))
    fork = (f'{tines}<div style="position: absolute; left: 470px; top: 950px; width: 130px; height: 46px; border-radius: 0 0 60px 60px; background: {gold}"></div>'
            f'<div style="position: absolute; left: 518px; top: 980px; width: 34px; height: 140px; border-radius: 17px; background: {gold}"></div>')
    # a warm rim of light around the dark slice keeps it apart from the cocoa background
    rim = ("filter: drop-shadow(0 0 2px rgba(255,226,190,0.85)) drop-shadow(0 0 14px rgba(255,214,170,0.35)) "
           "drop-shadow(0 30px 36px rgba(0,0,0,0.55))")
    body = f"""<div style="position: absolute; left: 0; right: 0; top: 150px; text-align: center; {VIBES}; font-size: 262px; line-height: 1; color: {word}; text-shadow: 0 6px 24px rgba(0,0,0,0.35)">важно</div>
{fork}
{cut("shokolad", "Кусок шоколадного торта на вилке", 382, 286, 316, -4, rim)}"""
    return cover(title, light, body)


VAZHNO_VARIANTS = {
    "karamel": lambda: vazhno("radial-gradient(circle at 50% 44%, #E9CFAE 0%, #C99A6E 40%, #9C6C46 75%, #7A5236 100%)", "#FFF7EC",
                              "Обложка — Важно, карамельный фон"),
}


def ceny():
    """A kraft price tag on a string, sharp, over the caramel trifles thrown out of focus."""
    tag_shape = "polygon(18% 0, 82% 0, 100% 15%, 100% 100%, 0 100%, 0 15%)"
    body = f"""<img src="{PHOTO["trifly"]}" alt="" style="position: absolute; left: -40px; top: -160px; width: 1160px; max-width: none; filter: blur(9px) sepia(0.2) saturate(1.05) brightness(0.98)">
<div style="position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(40,24,16,0) 40%, rgba(40,24,16,0.28) 100%)"></div>
<svg aria-hidden="true" width="1080" height="1080" style="position: absolute; left: 0; top: 0" fill="none"><path d="M-20 40C150 90 330 150 490 238" stroke="#7A5A3E" stroke-width="5" stroke-linecap="round"></path></svg>
<div style="position: absolute; left: 262px; top: 214px; width: 480px; height: 620px; transform: rotate(-7deg); transform-origin: 50% 6%; filter: drop-shadow(0 34px 34px rgba(60,36,24,0.38)) drop-shadow(0 4px 6px rgba(60,36,24,0.2))">
<div style="position: absolute; inset: 0; clip-path: {tag_shape}; background: linear-gradient(160deg, #D5B48C 0%, #C7A27A 60%, #BA9469 100%)"></div>
<div style="position: absolute; left: 216px; top: 34px; width: 48px; height: 48px; border-radius: 50%; background: #F1E6D6; box-shadow: inset 0 3px 6px rgba(60,36,24,0.45), 0 0 0 7px #E2CDB0"></div>
<div style="position: absolute; left: 0; right: 0; top: 130px; text-align: center; {VIBES}; font-size: 186px; line-height: 1; color: {COCOA}">цены</div>
<div style="position: absolute; left: 90px; right: 90px; top: 352px; height: 3px; background: rgba(74,46,36,0.45)"></div>
<div style="position: absolute; left: 0; right: 0; top: 386px; text-align: center; font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 500; font-size: 128px; line-height: 1; color: {COCOA}">от 9 р</div>
</div>"""
    return cover("Обложка — Цены", "#E9DFD2", body)


COVERS = [("Otzyvy", otzyvy), ("Raboty", raboty), ("Nachinki", nachinki), ("Vazhno", vazhno), ("Ceny", ceny)]


def build_highlights():
    for old in list(PROJECT.glob("Cover-*.dc.html")) + list(PROJECT.glob("Hl-*.dc.html")):
        old.unlink()
    for i, (slug, fn) in enumerate(COVERS, 1):
        (PROJECT / f"Hl-{i}-{slug}.dc.html").write_text(fn())
    # alternatives to choose from, shown next to the main cover on the canvas
    for letter, (name, fn) in zip("bcd", NACHINKI_VARIANTS.items()):
        (PROJECT / f"Hl-3{letter}-Nachinki-{name}.dc.html").write_text(fn())
    for letter, (name, fn) in zip("b", VAZHNO_VARIANTS.items()):
        (PROJECT / f"Hl-4{letter}-Vazhno-{name}.dc.html").write_text(fn())


if __name__ == "__main__":
    build_highlights()
