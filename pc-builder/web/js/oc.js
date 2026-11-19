// Страница «Разгон»: короткие понятные гайды по разгону и андервольтингу, проверенные ссылки на авторов
// и инструменты, свежие материалы о разгоне из новостных лент.
import { el, icon, api } from './util.js';
import { newsCards } from './news.js';

let root = null;
let fresh = null;
let open = 'start';

const SECTIONS = [
  {
    id: 'start', title: 'С чего начать', icon: 'sparkles',
    intro: 'Разгон — работа деталей выше заводских настроек, андервольтинг — снижение напряжения при той же частоте. Самое полезное для большинства: включить профиль памяти, слегка снизить напряжение процессора и видеокарты. Это даёт +5–15% FPS там, где упор в память, и делает ПК тише и холоднее.',
    blocks: [
      { type: 'steps', title: 'Порядок действий', items: [
        'Обновите BIOS материнской платы до последней стабильной версии (на сайте производителя платы).',
        'Включите в BIOS профиль памяти: EXPO (AMD) или XMP (Intel). Это безопасно и рассчитано производителем памяти.',
        'Проверьте стабильность: 30–60 минут теста памяти и пара часов в играх без вылетов.',
        'Процессор: AMD — Curve Optimizer, Intel — понижение напряжения (Undervolt). Меняйте по одному параметру.',
        'Видеокарта: андервольт в MSI Afterburner или AMD Adrenalin.',
        'Только потом — ручная настройка таймингов памяти, если есть время и интерес.',
      ] },
      { type: 'tips', title: 'Подготовка', items: [
        'Поставьте HWiNFO (датчики) и OCCT или y-cruncher (тесты) — ссылки в разделе «Инструменты».',
        'Сфотографируйте заводские настройки BIOS и узнайте, как сбросить CMOS на вашей плате (кнопка, перемычка или батарейка).',
        'Меняйте одно значение за раз и записывайте, что поменяли: так легко найти причину нестабильности.',
        'Признаки нестабильности: вылеты игр, синие экраны, ошибки WHEA в HWiNFO, ошибки в тестах памяти.',
      ] },
    ],
  },
  {
    id: 'amd', title: 'Процессор AMD Ryzen', icon: 'cpu',
    intro: 'У Ryzen классический разгон множителем почти не нужен: процессор сам разгоняется (Precision Boost). Лучший результат даёт Curve Optimizer — понижение напряжения по кривой, после которого процессор держит более высокие частоты при той же температуре.',
    blocks: [
      { type: 'steps', title: 'Curve Optimizer (Ryzen 5000/7000/9000)', items: [
        'BIOS → Advanced → AMD Overclocking → Precision Boost Overdrive → Advanced.',
        'Curve Optimizer → All Cores → Negative, начните с 10 (для X3D — с 5–10).',
        'Проверка: OCCT или y-cruncher 30–60 минут, затем обычная работа и простой — нестабильность Curve Optimizer чаще проявляется в лёгкой нагрузке.',
        'Если стабильно — шагом 5 до 20–30; если ошибки — вернитесь на шаг назад. Опытные настраивают каждое ядро отдельно (утилита CoreCycler).',
      ] },
      { type: 'tips', title: 'Важно знать', items: [
        'Ryzen 7000/9000 под полной нагрузкой работают до 95 °C — это предусмотренный режим, а не перегрев: процессор сам держит температуру.',
        'На AM5 не поднимайте напряжение SoC выше 1,3 В — AMD ограничила его после случаев повреждения процессоров.',
        'Режим «Eco» или ограничение мощности (PPT) почти не снижает FPS в играх, но заметно уменьшает нагрев и шум.',
        'Ryzen 5800X3D/7800X3D не разгоняются множителем, но Curve Optimizer доступен; у X3D серии 9000 разгон разрешён.',
      ] },
    ],
  },
  {
    id: 'intel', title: 'Процессор Intel', icon: 'cpu',
    intro: 'Разгон множителем доступен у моделей с буквой K на платах Z. Для остальных главное — правильные лимиты мощности и понижение напряжения.',
    blocks: [
      { type: 'tips', title: 'Core 13 и 14 поколения', items: [
        'Обязательно обновите BIOS с исправленным микрокодом Intel (0x12B или новее): у этих процессоров была проблема с деградацией из-за повышенного напряжения.',
        'Выберите в BIOS профиль Intel Default Settings — он задаёт безопасные лимиты, рекомендованные Intel.',
        'Не повышайте напряжение ядра. Андервольт: Undervolt Protection выключить, затем смещение (offset) −0,05…−0,1 В или понижение AC Load Line.',
        'TjMax у Intel — 100 °C. В тестах лучше держать до 85–90 °C, в играх обычно гораздо ниже.',
      ] },
      { type: 'tips', title: 'Без буквы K (12400F, 13400F, 14400F)', items: [
        'Множитель закрыт, но на многих платах B660/B760 можно поднять лимиты мощности PL1/PL2 — нужен кулер с запасом.',
        'Память разгоняется и на B-платах: DDR4 — режим Gear 1 до 3600–3800 МГц, DDR5 — Gear 2.',
      ] },
      { type: 'tips', title: 'Core Ultra 200S', items: [
        'У K-моделей есть официальный профиль 200S Boost в BIOS — безопасный ускоренный режим от Intel.',
        'Поддерживается быстрая память CUDIMM DDR5 8000+ МГц.',
      ] },
    ],
  },
  {
    id: 'ram', title: 'Оперативная память', icon: 'ram',
    intro: 'Память — самый заметный разгон для игр, особенно у Ryzen. Без профиля EXPO/XMP модули работают на базовой частоте (DDR4 2133–2666, DDR5 4800).',
    blocks: [
      { type: 'table', title: 'Оптимальные режимы', rows: [
        ['AMD AM4, DDR4', '3600 МГц CL16 или 3200 CL14; FCLK = MCLK (1:1), до 1800–1900 МГц'],
        ['AMD AM5, DDR5', '6000 МГц CL30, UCLK = MCLK (1:1); FCLK 2000–2100 МГц'],
        ['Intel 12–14, DDR5', '6000–7200 МГц в режиме Gear 2 (зависит от платы и процессора)'],
        ['Intel 12–14, DDR4', '3200–3600 МГц в режиме Gear 1'],
      ] },
      { type: 'steps', title: 'Ручная настройка', items: [
        'Сначала частота, потом первичные тайминги (tCL, tRCD, tRP, tRAS).',
        'Затем tRFC — сильно влияет на задержки, у DDR5 его можно заметно уменьшить.',
        'Потом вторичные и третичные тайминги. После каждого шага — тест.',
        'Текущие тайминги на AMD удобно смотреть в ZenTimings.',
      ] },
      { type: 'tips', title: 'Напряжения и проверка', items: [
        'DDR4: для ежедневной работы обычно до 1,40–1,45 В при хорошем обдуве.',
        'DDR5: VDD/VDDQ для ежедневной работы обычно не выше 1,40 В; модули DDR5 не любят нагрев выше ~55 °C — появляются ошибки.',
        'Тесты: TestMem5 с популярными конфигами, MemTest86 (загрузочный), y-cruncher. Минимум 1–2 часа без ошибок.',
        'Первая загрузка с DDR5 после изменения настроек может идти 1–3 минуты (тренировка памяти) — это нормально.',
      ] },
    ],
  },
  {
    id: 'gpu', title: 'Видеокарта', icon: 'gpu',
    intro: 'Андервольт видеокарты — почти бесплатное улучшение: та же производительность при потреблении на 15–30% ниже, тише и холоднее. Разгон даёт 3–8%.',
    blocks: [
      { type: 'steps', title: 'Андервольт NVIDIA (MSI Afterburner)', items: [
        'Запустите игру и посмотрите частоту ядра, которую карта держит (например, 2700 МГц).',
        'В Afterburner откройте кривую напряжения (Ctrl+F).',
        'Найдите точку около 0,90–0,95 В и поднимите её до этой частоты, правее — сделайте ровной (Shift + выделение, перетащить ниже).',
        'Примените и проверьте в играх и 3DMark. Вылеты — уменьшите частоту на 15–30 МГц или поднимите напряжение на шаг.',
      ] },
      { type: 'tips', title: 'AMD Radeon и память', items: [
        'AMD: Adrenalin → Производительность → Настройка → Вручную: уменьшите максимальное напряжение на 50–100 мВ и проверьте стабильность.',
        'Память видеокарты: +500…+1000 МГц часто стабильно; признаки перебора — артефакты (мерцание, цветные точки) или падение FPS.',
        'Увеличение Power Limit даёт немного производительности ценой нагрева — смотрите на температуру памяти (Memory Junction) в HWiNFO.',
      ] },
    ],
  },
  {
    id: 'test', title: 'Тесты и температуры', icon: 'flame',
    intro: 'Без проверки стабильности разгон опасен для данных: ошибки памяти могут незаметно портить файлы.',
    blocks: [
      { type: 'table', title: 'Чем проверять', rows: [
        ['HWiNFO', 'Датчики: температуры, напряжения, частоты, ошибки WHEA'],
        ['OCCT', 'Тесты процессора, памяти, видеокарты и блока питания'],
        ['y-cruncher', 'Жёсткая проверка процессора и памяти'],
        ['Cinebench', 'Быстрая проверка процессора и сравнение результатов'],
        ['MemTest86', 'Загрузочный тест памяти без Windows'],
        ['3DMark', 'Стресс-тест видеокарты: стабильность от 97%'],
      ] },
      { type: 'table', title: 'Ориентиры температур под нагрузкой', rows: [
        ['Ryzen 7000/9000', 'до 95 °C — штатный предел'],
        ['Ryzen 5000', 'до 85–90 °C'],
        ['Intel 12–14, Core Ultra', 'до 85–90 °C в тестах, предел 100 °C'],
        ['Видеокарта: ядро', 'до 80–85 °C'],
        ['Видеокарта: память (Junction)', 'до 95–100 °C'],
        ['DDR5', 'до ~55 °C, выше — ошибки'],
      ] },
    ],
  },
];

const AUTHORS = [
  { name: 'Buildzoid — Actually Hardcore Overclocking', text: 'Разгон памяти DDR4/DDR5, настройки BIOS, разбор питания плат (англ.)', url: 'https://www.youtube.com/@ActuallyHardcoreOverclocking' },
  { name: 'der8auer', text: 'Экстремальный разгон, скальпирование, термоинтерфейсы (англ.)', url: 'https://www.youtube.com/@der8auer-en' },
  { name: 'Gamers Nexus', text: 'Глубокие тесты, температуры, разборы проблем железа (англ.)', url: 'https://www.youtube.com/@GamersNexus' },
  { name: 'Hardware Unboxed', text: 'Сравнения процессоров, видеокарт и памяти в играх (англ.)', url: 'https://www.youtube.com/@Hardwareunboxed' },
  { name: 'iXBT Labs', text: 'Обзоры и тесты железа на русском', url: 'https://www.youtube.com/@ixbtlabs' },
  { name: 'Гайд по разгону DDR4 (integralfx)', text: 'Подробная пошаговая инструкция по таймингам (англ., GitHub)', url: 'https://github.com/integralfx/MemTestHelper/blob/oc-guide/DDR4%20OC%20Guide.md' },
  { name: 'Overclockers.ru', text: 'Статьи, блоги и форум о разгоне на русском', url: 'https://overclockers.ru/' },
  { name: 'Overclock.net', text: 'Крупнейший форум оверклокеров: темы по каждой плате и памяти (англ.)', url: 'https://www.overclock.net/' },
];

const TOOLS = [
  { name: 'HWiNFO', url: 'https://www.hwinfo.com/' },
  { name: 'OCCT', url: 'https://www.ocbase.com/' },
  { name: 'ZenTimings', url: 'https://zentimings.protonrom.com/' },
  { name: 'MSI Afterburner', url: 'https://www.msi.com/Landing/afterburner/graphics-cards' },
  { name: 'y-cruncher', url: 'http://www.numberworld.org/y-cruncher/' },
  { name: 'MemTest86', url: 'https://www.memtest86.com/' },
  { name: 'Cinebench', url: 'https://www.maxon.net/en/cinebench' },
];

export function initOc(node) {
  root = node;
}

export function rerenderOc() {
  if (!root) return;
  render();
  if (!fresh) {
    api('/api/news?topic=oc').then((r) => { fresh = r.items; render(); }).catch(() => { fresh = []; render(); });
  }
}

function block(b) {
  if (b.type === 'steps') return el('div.oc-block', el('h4', b.title), el('ol.oc-steps', b.items.map((t) => el('li', t))));
  if (b.type === 'tips') return el('div.oc-block', el('h4', b.title), el('ul.oc-tips', b.items.map((t) => el('li', t))));
  if (b.type === 'table') return el('div.oc-block', el('h4', b.title), el('table.tbl.oc-table', el('tbody', b.rows.map(([a, c]) => el('tr', el('td', el('b', a)), el('td', c))))));
  return null;
}

function render() {
  const sec = SECTIONS.find((s) => s.id === open) || SECTIONS[0];
  root.replaceChildren(
    el('div.page-head', el('div',
      el('h1', 'Разгон и настройка'),
      el('p', 'Короткие понятные гайды: профиль памяти, Curve Optimizer, андервольт процессора и видеокарты, проверка стабильности. Подробности — у авторов и на форумах по ссылкам ниже.'))),
    el('div.notice', icon('alert'), el('div', el('b', 'Разгон — на свой риск. '), 'Включение EXPO/XMP и андервольт безопасны, но поломки из-за повышения напряжений производители обычно не считают гарантийным случаем. Меняйте настройки постепенно и следите за температурами.')),
    el('div.oc-tabs', SECTIONS.map((s) => el('button.oc-tab', { class: s.id === open ? 'on' : '', type: 'button', onclick: () => { open = s.id; render(); } }, icon(s.icon), s.title))),
    el('div.card.oc-section', { key: sec.id },
      el('h2', icon(sec.icon), ' ', sec.title),
      el('p.oc-intro', sec.intro),
      el('div.oc-blocks', sec.blocks.map(block))),
    el('div.layout-2',
      el('div',
        el('div.card',
          el('h3', icon('flame'), ' Свежие материалы о разгоне'),
          fresh == null ? el('div.row', el('div.spinner', { style: { width: '18px', height: '18px', borderWidth: '2px' } }), el('span.muted', 'Загружаем…'))
            : fresh.length ? newsCards(fresh.slice(0, 12), { compact: true })
              : el('p.muted', 'В новостных лентах сейчас нет материалов о разгоне — загляните позже или в раздел «Новости».'))),
      el('div.side',
        el('div.card', el('h3', icon('book'), ' Авторы и гайды'),
          el('div.oc-links', AUTHORS.map((a) => el('a.oc-link', { href: a.url, target: '_blank', rel: 'noopener' }, el('b', a.name), el('span', a.text))))),
        el('div.card', el('h3', icon('gear'), ' Инструменты'),
          el('div.row.wrap', { style: { gap: '6px' } }, TOOLS.map((t) => el('a.chip', { href: t.url, target: '_blank', rel: 'noopener' }, t.name, ' ↗')))))));
}
