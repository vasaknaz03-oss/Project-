"""Highlight covers, 1080×1080. «Отзывы» follows the original cover (word on top, berries below on a clean
background); the others each use their own way to get depth instead of a cut-out on a flat background:
«Работы» — the word set behind the cake in the real photo, «Начинки» — a still life with depth of field,
«Важно» — a slice on a fork under a spotlight on cocoa, «Цены» — a sharp kraft price tag over blurred caramel trifles.

Cut-outs come from tools/cutouts.py. Run `python3 tools/build.py` (it calls this module).
"""
from build import COCOA, PROJECT, page

CUT = {
    "malina": "/_blob/6e337375aa197f5ae76500d2a2c56f08", "barkhat": "/_blob/aa09a6fc09ca924ef383f077895fb3af",
    "banan": "/_blob/d67acf0d705c6ffc2d5a67853c319c83", "trifl": "/_blob/1b632c4ee3f7a61c0409caf9cd45dc04",
    "bento": "/_blob/458622d8f8bc36bd55cb9fe424af4ed3", "chai-full": "/_blob/27fe42987e573e2f936c47136d3bec8f",
}
PHOTO = {"chai": "/_blob/4053d6ba731c96bceb9810e75856a825", "trifly": "/_blob/e7f5be81caaf56665d59f4c94ec359e5"}
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


def nachinki():
    """A small still life: the trifle sharp in front, two slices showing their layers behind it, out of focus,
    all standing on the same table."""
    room = ("radial-gradient(circle at 22% 18%, rgba(255,250,242,0.95) 0%, rgba(255,250,242,0) 46%), "
            "linear-gradient(180deg, #EFE6DA 0%, #E9DDCD 55%, #DCCAB4 58%, #E3D3BF 100%)")
    contact = lambda cx, cy, rx, o: (f'<div style="position: absolute; left: {cx - rx}px; top: {cy - rx // 8}px; width: {rx * 2}px; height: {rx // 4}px; '
                                     f'border-radius: 50%; background: rgba(60,36,24,{o}); filter: blur(10px)"></div>')
    soft = "filter: blur(5px) brightness(0.97)"
    body = f"""{contact(318, 728, 150, 0.30)}{contact(778, 728, 160, 0.30)}
{cut("barkhat", "Срез красного бархата", 168, 300, 300, -2, soft)}
{cut("banan", "Срез торта банан-карамель", 618, 262, 320, 2, soft)}
{contact(560, 1040, 300, 0.36)}
{cut("trifl", "Трайфл со сливочным кремом", 262, 190, 600)}"""
    return cover("Обложка — Начинки", room, body)


def vazhno():
    """A red velvet slice on a gold fork under a spotlight; «важно» in cream script behind its top edge."""
    light = "radial-gradient(circle at 50% 44%, #7A5141 0%, #4E3126 34%, #331E17 66%, #22130E 100%)"
    gold = "linear-gradient(90deg, #8E6A2E, #F1DCA6 45%, #A98642)"
    tines = "".join(f'<div style="position: absolute; left: {470 + i * 38}px; top: 850px; width: 16px; height: 120px; border-radius: 8px; background: {gold}"></div>'
                    for i in range(4))
    fork = (f'{tines}<div style="position: absolute; left: 470px; top: 950px; width: 130px; height: 46px; border-radius: 0 0 60px 60px; background: {gold}"></div>'
            f'<div style="position: absolute; left: 518px; top: 980px; width: 34px; height: 140px; border-radius: 17px; background: {gold}"></div>')
    rim = "filter: drop-shadow(0 0 1px rgba(255,236,214,0.6)) drop-shadow(0 30px 36px rgba(0,0,0,0.55))"
    body = f"""<div style="position: absolute; left: 0; right: 0; top: 150px; text-align: center; {VIBES}; font-size: 262px; line-height: 1; color: {CREAM}; text-shadow: 0 6px 24px rgba(0,0,0,0.35)">важно</div>
{fork}
{cut("barkhat", "Кусок красного бархата на вилке", 336, 318, 404, -4, rim)}"""
    return cover("Обложка — Важно", light, body)


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


if __name__ == "__main__":
    build_highlights()
