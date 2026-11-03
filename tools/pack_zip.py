"""Packs the rendered artboards into one ZIP to send by Telegram: JPG pictures in folders named by where they go
on the page, with a step-by-step «Как собрать страницу.txt».

    node tools/render.mjs        # fresh PNGs in export/
    python3 tools/pack_zip.py [out.zip]
"""
import io
import json
import re
import sys
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
EXPORT = ROOT / "export"

# (folder in the ZIP, artboards in upload order); the titles come from canvas.json.
GROUPS = [
    ("1 Аватар", ["Avatar-2-Obvodka-svetlo", "Avatar-3-Obvodka-temno", "Avatar-4-Kontur-svetlo", "Avatar-5-Kontur-temno",
                  "Avatar-6-Linii-svetlo", "Avatar-7-Linii-temno", "Avatar-1-Original"]),
    ("2 Обложки актуального", ["Hl-1-Otzyvy", "Hl-2-Raboty", "Hl-3-Nachinki", "Hl-4-Vazhno", "Hl-5-Ceny"]),
    ("2 Обложки актуального/Запасные варианты", ["Hl-3b-Nachinki-karamel", "Hl-3c-Nachinki-flatlay", "Hl-3d-Nachinki-kapkejk",
                                                  "Hl-4b-Vazhno-karamel"]),
    ("3 Истории в актуальное/Важно", ["Vazhno-1-Kak-zakazat", "Vazhno-2-Chto-napisat", "Vazhno-3-Sroki", "Vazhno-4-Khranenie"]),
    ("3 Истории в актуальное/Цены — новое меню (коричневое)", "Menu-S"),
    ("3 Истории в актуальное/Цены — прежний вариант", ["Ceny-1-Torty", "Ceny-2-Bento-traifly"]),
    ("3 Истории в актуальное/Начинки", ["Fill-0-Cakes", "Fill-1-Banan", "Fill-2-Vishnya", "Fill-3-Barkhat", "Fill-4-Limon",
                                        "Fill-5-Plombir", "Fill-6-Snickers", "Fill-7-Trifles"]),
    ("3 Истории в актуальное/Начинки — фото (вместо рисованных или вместе)",
     ["Fill-Foto-1-Banan", "Fill-Foto-2-Vishnya", "Fill-Foto-3-Barkhat", "Fill-Foto-4-Limon", "Fill-Foto-5-Plombir", "Fill-Foto-6-Snickers"]),
    ("4 Закреплённые посты/1 Заказ и доставка", ["Pin-1-Zakaz", "Pin-1b-Zakaz-kak", "Pin-1c-Zakaz-sroki"]),
    ("4 Закреплённые посты/2 Цены и начинки", ["Pin-2-Ceny", "Pin-2b-Ceny-torty", "Pin-2c-Ceny-bento", "Pin-2d-Ceny-nachinki"]),
    ("4 Закреплённые посты/3 Хранение и подача", ["Pin-3-Khranenie", "Pin-3b-Khranenie", "Pin-3c-Podacha"]),
    ("5 Пост-карусель «Меню и начинки»", "Menu-[0-9]"),
    ("5 Пост-карусель «Начинки» — прежний вариант", ["Fill-Post-1-Banan", "Fill-Post-2-Vishnya", "Fill-Post-3-Barkhat", "Fill-Post-4-Limon",
                                   "Fill-Post-5-Plombir", "Fill-Post-6-Snickers"]),
    ("6 Заготовки на будущее", ["Tpl-1-Rabota-primer", "Tpl-2-Rabota-pustoy", "Tpl-3-Otzyv", "Tpl-4-Novaya-nachinka",
                                "Tpl-5-Skoro", "Tpl-6-Reels-oblozhka"]),
    ("8 Другие варианты логотипа", [f"Logo-{n}" for n in ["1-Classic", "2-Cherry", "3-Script", "4-Stamp", "5-Mono", "6-Dark",
                                                          "7-Avatar", "8-Doily", "9-Vanilla", "10-Vanilla-karamel", "11-Caramel",
                                                          "12-Line", "13-Word-in-cake"]]),
    ("9 Как будет выглядеть", ["Main", "Style"]),
]
REELS = ("7 Reels", [("kapkejki-oblozhka.jpg", "Обложка Reels.jpg"), ("kapkejki-reels.mp4", "Reels с музыкой и текстом.mp4"),
                     ("kapkejki-reels-bez-muzyki.mp4", "Reels без музыки (под звук из Instagram).mp4")])
README = """Dessertopia — новое оформление Instagram
Номер в начале названия папки — порядок, в котором всё ставить.

1. АВАТАР — папка «1 Аватар». Ваш логотип с обводкой рисунка, 7 вариантов.
   Первый (светло-коричневая обводка) — рекомендую. Последний — исходный без обводки, для сравнения.
   Профиль → Редактировать → Изменить фото.

2. ИМЯ: Диана | торты · бенто · трайфлы | Минск

3. ШАПКА (скопируйте целиком):
Dessertopia — сладкая страна чудес
бенто и торты до 2 кг · трайфлы
самовывоз: м. Аэродромная (Минск Мир)
заказ за 3–4 дня — пишите в Telegram ↓
   Ссылка: t.me/BMU_GS

4. АКТУАЛЬНОЕ — папка «3 Истории в актуальное»:
   Важно — 4 истории; Цены — новое меню (3 истории) или прежний вариант (2); Начинки — общий список,
   по истории на каждую начинку и трайфлы.
   Отзывы и Работы — скриншоты отзывов и фото тортов, фон для них в «6 Заготовки на будущее».
   Выкладывайте истории и сохраняйте в нужный кружок. В истории «Важно 01» поставьте стикер «Ссылка»
   на t.me/BMU_GS поверх кнопки, чтобы на неё можно было нажать.
   Instagram ставит первым кружок, куда добавили позже, поэтому добавляйте с конца:
   Цены → Важно → Начинки → Работы → Отзывы.

5. ОБЛОЖКИ КРУЖКОВ — папка «2 Обложки актуального».
   Удерживайте кружок → Редактировать актуальное → Редактировать обложку → значок галереи → картинка.
   В «Запасных вариантах» другие обложки для Начинок и Важно — можно взять любую.

6. ЗАКРЕПЛЁННЫЕ ПОСТЫ — папка «4 Закреплённые посты», каждая подпапка — одна карусель, фото по порядку.
   Размер 3:4: при публикации выберите формат «вертикальный», чтобы ничего не обрезалось.
   Закрепляйте с конца: сначала «Хранение и подача», потом «Цены и начинки», последним «Заказ и доставка».

7. REELS — папка «7 Reels». Если ставите версию с музыкой, добавьте в подпись строку:
   Music: «Autumn Day» Kevin MacLeod (incompetech.com), CC BY 4.0
   Хотите трендовый звук из Instagram — берите версию без музыки и выбирайте звук в редакторе.

«5 Пост-карусель «Меню и начинки»» — для ленты, 4:5: обложка, торты, десерты, «Начинки», начинки в разрезе, десерты на фото.
   Его можно закрепить вместо «Цены и начинки». «Начинки — прежний вариант» — карусель с фото-коллажами.
«8 Другие варианты логотипа» — новые логотипы, если когда-нибудь захотите сменить.
«9 Как будет выглядеть» — макет готового профиля и фирменный стиль: цвета и шрифты.
"""


def safe(title):
    return re.sub(r'[\\/:*?"<>|]+', "-", title).strip()


def main(out):
    boards = json.loads((ROOT / "canvas" / "project" / "canvas.json").read_text())["boards"]
    pngs = {p.stem: p for p in EXPORT.glob("*/*.png")}
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("Как собрать страницу.txt", README)
        for folder, names in GROUPS:
            if isinstance(names, str):          # a glob: boards whose count follows the fillings
                names = sorted(n for n in pngs if Path(n).match(names + "*"))
            for i, name in enumerate(names, 1):
                buf = io.BytesIO()
                Image.open(pngs[name]).convert("RGB").save(buf, "JPEG", quality=95, subsampling=0, optimize=True)
                title = boards[f"{name}.dc.html"]["title"]
                z.writestr(f"{folder}/{i:02d} {safe(title)}.jpg", buf.getvalue(), compress_type=zipfile.ZIP_STORED)
        folder, files = REELS
        for src, dst in files:
            z.write(EXPORT / "07-reels" / src, f"{folder}/{dst}", compress_type=zipfile.ZIP_STORED)
    print(out, f"{Path(out).stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / "Dessertopia-Instagram.zip")
