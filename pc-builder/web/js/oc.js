// Страница «Разгон»: короткие понятные гайды по разгону и андервольтингу, проверенные ссылки на авторов
// и инструменты, свежие материалы о разгоне из новостных лент.
import { el, icon, api, copyText, toast } from './util.js';
import { newsCards } from './news.js';
import { state } from './state.js';
import { researchBlock, youtubeBlock } from './ai.js';
import { BIOS, PLATFORMS, vendorOf, platformOf, memoOf } from './ocdata.js';

let root = null;
let fresh = null;
let open = 'start';
let tab = 'memo';
let vendorSel = null;
let biosSide = 'amd';
const memo = { platform: null, vendor: null, mem: null };
const search = { q: '', items: null, loading: false, shown: '' };

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
  { name: 'r/overclocking', text: 'Reddit: вопросы и результаты разгона по конкретным процессорам и памяти (англ.)', url: 'https://www.reddit.com/r/overclocking/' },
  { name: 'Конференция iXBT', text: 'Темы владельцев плат и процессоров, разгон на русском', url: 'https://forum.ixbt.com/' },
  { name: 'DRAM Calculator for Ryzen (1usmus)', text: 'Калькулятор таймингов DDR4 для AM4 (на AM5 не рассчитан)', url: 'https://www.techpowerup.com/download/ryzen-dram-calculator/' },
];

const TOOLS = [
  { name: 'HWiNFO', url: 'https://www.hwinfo.com/' },
  { name: 'OCCT', url: 'https://www.ocbase.com/' },
  { name: 'ZenTimings', url: 'https://zentimings.protonrom.com/' },
  { name: 'MSI Afterburner', url: 'https://www.msi.com/Landing/afterburner/graphics-cards' },
  { name: 'y-cruncher', url: 'http://www.numberworld.org/y-cruncher/' },
  { name: 'MemTest86', url: 'https://www.memtest86.com/' },
  { name: 'Cinebench', url: 'https://www.maxon.net/en/cinebench' },
  { name: 'Thaiphoon Burner (чипы памяти)', url: 'http://www.softnology.biz/' },
  { name: 'TestMem5', url: 'https://github.com/CoolCmd/TestMem5' },
  { name: 'CoreCycler (Curve Optimizer по ядрам)', url: 'https://github.com/sp00n/corecycler' },
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

// ------------------------------------------------------------------ вкладки

const TABS = [
  ['memo', 'Памятка для моей сборки', 'check'],
  ['bios', 'BIOS по производителям', 'board'],
  ['calc', 'Калькулятор таймингов', 'ram'],
  ['guides', 'Гайды', 'book'],
  ['links', 'Авторы и инструменты', 'external'],
];

function render() {
  root.replaceChildren(
    el('div.page-head', el('div',
      el('h1', 'Разгон и настройка'),
      el('p', 'Поиск по статьям и форумам о разгоне, пошаговая памятка под вашу сборку, где что находится в BIOS ASUS, Gigabyte, MSI, ASRock и других, калькулятор таймингов памяти.'))),
    el('div.notice.compact', icon('alert'), el('div', el('b', 'Разгон — на свой риск. '), 'Профиль EXPO/XMP и андервольт безопасны; повышение напряжений производители обычно не считают гарантийным случаем. Меняйте по одному параметру и следите за температурами.')),
    searchCard(),
    el('div.oc-tabs', TABS.map(([id, label, ic]) => el('button.oc-tab', { class: id === tab ? 'on' : '', type: 'button', onclick: () => { tab = id; render(); } }, icon(ic), label))),
    el('div.oc-view', { 'data-tab': tab },
      tab === 'memo' ? memoView() : tab === 'bios' ? biosView() : tab === 'calc' ? calcView() : tab === 'guides' ? guidesView() : linksView()));
}

// ------------------------------------------------------------------ поиск по источникам

function searchCard() {
  const input = el('input.input', {
    type: 'search', value: search.q, placeholder: 'Что разогнать? Например: Ryzen 7 7800X3D Curve Optimizer, DDR5 Hynix 6400, RTX 4070 андервольт',
    oninput: (e) => (search.q = e.target.value),
    onkeydown: (e) => { if (e.key === 'Enter') go(); },
  });
  const go = async () => {
    const q = search.q.trim();
    if (!q) return;
    search.shown = q;
    search.loading = true;
    search.items = null;
    render();
    try {
      search.items = (await api('/api/oc/search?q=' + encodeURIComponent(q))).items;
    } catch {
      search.items = [];
    }
    search.loading = false;
    render();
  };
  const q = search.shown;
  const e = encodeURIComponent;
  return el('div.card.oc-search',
    el('div.row', { style: { gap: '8px' } }, el('div.search-input', icon('search'), input), el('button.btn.btn-primary', { onclick: go }, 'Искать')),
    q ? el('div.oc-results',
      el('div.ext-links', el('span.dim', 'Искать на форумах:'),
        el('a', { href: `https://www.google.com/search?q=${e(q + ' site:forums.overclockers.ru')}`, target: '_blank', rel: 'noopener' }, 'Overclockers.ru'),
        el('a', { href: `https://www.google.com/search?q=${e(q + ' site:forum.ixbt.com')}`, target: '_blank', rel: 'noopener' }, 'iXBT'),
        el('a', { href: `https://www.overclock.net/search/?q=${e(q)}`, target: '_blank', rel: 'noopener' }, 'Overclock.net'),
        el('a', { href: `https://www.reddit.com/r/overclocking/search/?q=${e(q)}`, target: '_blank', rel: 'noopener' }, 'r/overclocking'),
        el('a', { href: `https://www.youtube.com/results?search_query=${e(q + ' разгон')}`, target: '_blank', rel: 'noopener' }, 'YouTube')),
      el('div.oc-res-grid',
        el('div',
          el('div.panel-title', 'Статьи и обсуждения'),
          search.loading ? el('div.row', el('div.spinner.inline'), el('span.muted', 'Ищем на Хабре, Overclock.net, Overclockers.ru, 3DNews…'))
            : search.items && search.items.length ? newsCards(search.items.slice(0, 16), { compact: true })
              : el('p.muted', 'В открытых лентах ничего не нашлось — попробуйте другие слова или кнопки поиска по форумам выше.')),
        el('div', { style: { display: 'grid', gap: '12px', alignContent: 'start' } },
          researchBlock(q, { mode: 'oc', title: 'ИИ: опыт людей с форумов и из гайдов' }),
          youtubeBlock(q + ' разгон', { title: 'Видео-гайды' })))) : null);
}

// ------------------------------------------------------------------ памятка

function currentParts() {
  const r = state.result;
  const v = r && r.variants && r.variants.find((x) => x.id === state.variant);
  return (v && v.build && v.build.parts) || {};
}

function memoView() {
  const parts = currentParts();
  if (memo.platform == null) memo.platform = platformOf(parts.cpu) || 'am5';
  if (memo.vendor == null) memo.vendor = vendorOf(parts.motherboard) || 'asus';
  if (memo.mem == null) memo.mem = (parts.ram && parts.ram.specs && parts.ram.specs.type) || (PLATFORMS[memo.platform].mem);
  const sel = (key, options, label) => el('div.field', el('label', label),
    el('select.select', { onchange: (e) => { memo[key] = e.target.value; render(); } },
      options.map(([v, l]) => el('option', { value: v, selected: memo[key] === v }, l))));
  const m = memoOf(memo.platform, memo.vendor, memo.mem, parts);
  const text = () => [m.title, '', ...m.steps.map((st, i) => `${i + 1}. ${st.title}\n   ${st.text.join('\n   ')}`), '', 'Безопасные пределы:', ...m.limits.map((x) => '- ' + x)].join('\n');
  return el('div.card.oc-section',
    el('h2', icon('check'), ' Памятка по разгону'),
    parts.cpu ? el('p.dim.small', 'Подставлено из текущей сборки: ', [parts.cpu, parts.motherboard, parts.ram].filter(Boolean).map((x) => x.name).join(' · '), '. Можно поменять.') : el('p.dim.small', 'Выберите платформу, производителя платы и тип памяти — или подберите сборку, и памятка заполнится сама.'),
    el('div.memo-pick',
      sel('platform', Object.entries(PLATFORMS).map(([k, x]) => [k, x.name]), 'Процессор и платформа'),
      sel('vendor', Object.entries(BIOS).map(([k, x]) => [k, x.short]), 'Производитель материнской платы'),
      sel('mem', [['DDR5', 'DDR5'], ['DDR4', 'DDR4']], 'Память')),
    el('h3', m.title),
    el('ol.memo-steps', m.steps.map((st) => el('li',
      el('b', st.title),
      st.text.map((t) => el('div', t)),
      st.path ? el('div.bios-path', icon('board'), el('span', st.path)) : null))),
    el('div.oc-block', el('h4', 'Безопасные пределы'), el('ul.oc-tips', m.limits.map((t) => el('li', t)))),
    el('div.row', { style: { gap: '8px', marginTop: '12px' } },
      el('button.btn.btn-sm', { onclick: async () => { await copyText(text()); toast('Памятка скопирована'); } }, icon('copy'), 'Скопировать памятку'),
      el('a.btn.btn-sm.btn-ghost', { href: BIOS[memo.vendor].support, target: '_blank', rel: 'noopener' }, icon('external'), 'Руководство и BIOS для платы')));
}

// ------------------------------------------------------------------ BIOS по производителям

function biosView() {
  const id = vendorSel || vendorOf(currentParts().motherboard) || 'asus';
  const v = BIOS[id];
  const side = v.amd && v.intel ? biosSide : v.amd ? 'amd' : 'intel';
  const rows = [
    ['Вход в BIOS', v.enter], ['Простой / расширенный режим', v.modes], v.search ? ['Поиск по пунктам', v.search] : null, ['Сохранить и выйти', v.save],
    ...(v[side] || []).map(([a, b]) => [a, b]),
    ['Вентиляторы', v.fans], ['Resizable BAR', v.rebar], ['Сохранить свой профиль', v.profiles],
    ['Обновить BIOS', v.flash], ['Обновить без процессора / при сбое', v.flashback], ['Сброс настроек (CMOS)', v.cmos],
  ].filter(Boolean);
  return el('div.card.oc-section',
    el('h2', icon('board'), ' Где что в BIOS'),
    el('p.dim.small', 'Названия пунктов немного отличаются в зависимости от модели и версии BIOS. Если пункта нет на месте — включите расширенный режим, воспользуйтесь поиском (если он есть) или откройте руководство к своей плате: ссылка внизу.'),
    el('div.vendor-chips', Object.entries(BIOS).map(([k, x]) => el('button.chip.toggle-chip', { class: k === id ? 'on' : '', type: 'button', onclick: () => { vendorSel = k; render(); } }, x.short))),
    v.amd && v.intel ? el('div.seg', { style: { margin: '10px 0' } },
      el('button', { type: 'button', class: side === 'amd' ? 'on' : '', onclick: () => { biosSide = 'amd'; render(); } }, 'Платы для AMD'),
      el('button', { type: 'button', class: side === 'intel' ? 'on' : '', onclick: () => { biosSide = 'intel'; render(); } }, 'Платы для Intel')) : null,
    el('p.oc-intro', v.look),
    el('table.tbl.oc-table.bios-table', el('tbody', rows.map(([a, b]) => el('tr', el('td', el('b', a)), el('td', b))))),
    v.note ? el('div.notice', icon('info'), el('div', v.note)) : null,
    el('div.row', { style: { gap: '8px', marginTop: '12px' } },
      el('a.btn.btn-sm', { href: v.support, target: '_blank', rel: 'noopener' }, icon('external'), `Поддержка ${v.short}: BIOS и руководства`),
      v.sources ? el('span.dim.small', 'Сверено с: ', v.sources.map((s2, i) => [i ? ', ' : '', el('a', { href: s2.url, target: '_blank', rel: 'noopener' }, s2.name)])) : null));
}

// ------------------------------------------------------------------ калькулятор таймингов

const calc = { type: 'DDR5', mts: 6000, cl: 30, trcd: 38, trp: 38, tras: 76, trfc: 884, target: 6400 };

function calcView() {
  const num = (key, label, step = 1, hint) => el('div.field', el('label', label),
    el('input.input', { type: 'number', min: '0', step, value: calc[key], oninput: (e) => { calc[key] = +e.target.value || 0; out.replaceChildren(...results()); } }),
    hint ? el('div.dim.small', hint) : null);
  const out = el('div.calc-out');
  const ns = (clk, mts = calc.mts) => (mts ? (clk * 2000) / mts : 0);
  const clkAt = (nsv, mts) => Math.ceil((nsv * mts) / 2000);
  const f = (v) => v.toFixed(2).replace('.', ',');
  function results() {
    const tl = ns(calc.cl);
    const rfcNs = ns(calc.trfc);
    const trc = calc.tras + calc.trp;
    const rows = [
      ['Реальная задержка (CL)', `${f(tl)} нс`, tl <= 10.5 ? 'отлично' : tl <= 12.5 ? 'хорошо' : 'обычно', 'CL × 2000 / частота. Меньше — быстрее. Сравнивайте комплекты по ней, а не по одному CL: 6000 CL30 = 6400 CL32 = 10 нс.'],
      ['tRCD / tRP в нс', `${f(ns(calc.trcd))} / ${f(ns(calc.trp))} нс`, '', 'Задержки открытия и закрытия строки.'],
      ['tRC (минимум)', `${trc} тактов`, '', 'tRC = tRAS + tRP. Ставить меньше нельзя.'],
      ['tRFC в нс', `${f(rfcNs)} нс`, '', 'Обновление ячеек. Сильно влияет на задержки; минимум зависит от чипов памяти — смотрите таблицы по чипам в гайдах (вкладка «Авторы и инструменты»).'],
    ];
    const t = calc.target;
    const keep = t ? [['CL', calc.cl], ['tRCD', calc.trcd], ['tRP', calc.trp], ['tRAS', calc.tras], ['tRFC', calc.trfc]].map(([n, v]) => [n, clkAt(ns(v), t)]) : [];
    return [
      el('table.tbl.oc-table', el('tbody', rows.map(([a, b, c, d]) => el('tr', el('td', el('b', a)), el('td', el('b', b), c ? el('span.chip.ok', { style: { marginLeft: '6px' } }, c) : null), el('td.dim.small', d))))),
      t ? el('div.oc-block', el('h4', `Те же задержки на ${t} МТ/с`),
        el('p.dim.small', 'Чтобы при повышении частоты не стало хуже, задержка в наносекундах должна остаться прежней: тактов нужно больше. Это стартовые значения — дальше проверка стабильности и постепенное уменьшение.'),
        el('div.row.wrap', { style: { gap: '6px' } }, keep.map(([n, v]) => el('span.chip', `${n} ${v}`)))) : null,
    ];
  }
  out.replaceChildren(...results());
  return el('div.card.oc-section',
    el('h2', icon('ram'), ' Калькулятор таймингов памяти'),
    el('p.oc-intro', 'Введите частоту и тайминги из профиля EXPO/XMP (их видно в BIOS, ZenTimings или на наклейке модуля). Калькулятор переведёт их в наносекунды, проверит tRC и посчитает стартовые тайминги для другой частоты.'),
    el('div.calc-grid',
      el('div.field', el('label', 'Тип'), el('select.select', { onchange: (e) => { calc.type = e.target.value; render(); } }, ['DDR5', 'DDR4'].map((x) => el('option', { value: x, selected: calc.type === x }, x)))),
      num('mts', 'Частота, МТ/с (6000, 3600…)', 100), num('cl', 'CL'), num('trcd', 'tRCD'), num('trp', 'tRP'), num('tras', 'tRAS'), num('trfc', 'tRFC', 1, 'в тактах'), num('target', 'Пересчитать на частоту', 100)),
    out,
    el('div.oc-block', el('h4', 'Как разгонять по шагам'), el('ol.oc-steps', [
      'Узнайте чипы памяти: Thaiphoon Burner (бесплатная версия) или HWiNFO → SPD. Для DDR5 лучшие для разгона — SK Hynix A-die и M-die, для DDR4 — Samsung B-die.',
      'Включите EXPO/XMP и проверьте стабильность (TestMem5 / MemTest86, 1–2 часа). Без этого шага дальше не идите.',
      'Поднимайте частоту на шаг (DDR5 +200 МТ/с, DDR4 +100), тайминги — по калькулятору выше. Тест после каждого шага.',
      'Затем уменьшайте tRFC и вторичные тайминги по таблицам для ваших чипов. Напряжения — только в безопасных пределах из памятки.',
    ].map((t) => el('li', t)))));
}

function guidesView() {
  const sec = SECTIONS.find((x) => x.id === open) || SECTIONS[0];
  return el('div',
    el('div.seg.guide-tabs', SECTIONS.map((x) => el('button', { type: 'button', class: x.id === open ? 'on' : '', onclick: () => { open = x.id; render(); } }, x.title))),
    el('div.card.oc-section',
      el('h2', icon(sec.icon), ' ', sec.title),
      el('p.oc-intro', sec.intro),
      el('div.oc-blocks', sec.blocks.map(block))));
}

function linksView() {
  return el('div.layout-2',
    el('div',
      el('div.card',
        el('h3', icon('flame'), ' Свежие материалы о разгоне'),
        fresh == null ? el('div.row', el('div.spinner.inline'), el('span.muted', 'Загружаем…'))
          : fresh.length ? newsCards(fresh.slice(0, 12), { compact: true })
            : el('p.muted', 'В новостных лентах сейчас нет материалов о разгоне — загляните позже или в раздел «Новости».'))),
    el('div.side',
      el('div.card', el('h3', icon('book'), ' Авторы, форумы и гайды'),
        el('div.oc-links', AUTHORS.map((a) => el('a.oc-link', { href: a.url, target: '_blank', rel: 'noopener' }, el('b', a.name), el('span', a.text))))),
      el('div.card', el('h3', icon('gear'), ' Инструменты'),
        el('div.row.wrap', { style: { gap: '6px' } }, TOOLS.map((t) => el('a.chip', { href: t.url, target: '_blank', rel: 'noopener' }, t.name, ' ↗'))))));
}
