# Промпты для фото-карточек начинок

Картинки `assets/ai/nachinka-*.jpg` сгенерированы ИИ в Figma (`generate_image`, модель `gemini-3.1-flash-image`, 1024×1024) в файле
https://www.figma.com/design/XxXbd8aAvyPSslKC4E86qH. Это иллюстрации начинок, а не фото конкретных тортов.

Для новой начинки возьмите шаблон и подставьте 6 текстур фона и слои торта (сверху вниз):

```
Square professional food photography collage, editorial bakery menu style. Background: a 2-column by 3-row grid
of six edge-to-edge macro close-up texture photos, no gaps: top-left …; top-right …; middle-left …; middle-right …;
bottom-left …; bottom-right …. In the exact center, overlapping the grid, a tall rectangular cross-section of a
layered cake photographed perfectly straight-on, centered horizontally, about 45% of the image width and 85% of the
height, with a soft drop shadow. Cake layers from top to bottom: …. Clean straight cut edges, visible sponge pores,
soft natural daylight, warm tones, ultra realistic, high detail. No text, no letters, no logos, no plates, no hands.
```

| Начинка | Текстуры фона (6 клеток) | Слои торта |
|---|---|---|
| Банан-карамель | солёная карамель с хлопьями соли · крем-чиз · ломтики банана · карамельные полосы · ванильный бисквит · шоколадный бисквит | крем-чиз, ванильный бисквит, крем-чиз с бананом и солёной карамелью ×2 |
| Вишня-шоколад | вишня с черешками · шоколадный крем-чиз · вишнёвое конфи · белый крем-чиз · шоколадный бисквит · шоколадная стружка | шоколадный крем-чиз, шоколадный бисквит, крем-чиз с вишнёвым конфи и половинками вишни ×2 |
| Красный бархат | малина · крем-чиз · половинки клубники · ягодное конфи · бисквит красный бархат · вишня | крем-чиз, красный бархат, крем-чиз с тонким слоем конфи ×2 |
| Лимон-мак | лимонный курд · крем-чиз · лимоны с листьями · мак · маковый бисквит · ломтики лимона | крем-чиз, маковый бисквит, крем-чиз с лимонным курдом ×2 |
| Ягодный пломбир | клубника · ванильное мороженое · малина · клубнично-малиновая начинка · ванильный бисквит · крем-чиз | крем-чиз, ванильный бисквит, крем-чиз с клубнично-малиновой начинкой ×2 |
| Сникерс | жареный арахис · крем-чиз · солёная карамель · карамель с арахисом · шоколадный бисквит · молочный шоколад | крем-чиз, шоколадный бисквит, крем-чиз с солёной карамелью и арахисом ×2 |

После генерации: сохраните картинку в `assets/ai/nachinka-<имя>.jpg`, загрузите её на канвас, добавьте `"photo": "/_blob/<id>"`
к начинке в `tools/fillings.json` и id → путь в `tools/assets.json`, затем `python3 tools/build.py` и `node tools/render.mjs Fill-`.
