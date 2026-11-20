// Страница «Подбор по бюджету».
import { el, icon, api, money, toast, modal, closeModal, promptText, copyText, download, thumb, plural } from './util.js';
import { reviewsPanel, reviewChip } from './reviews.js';
import { explainPart } from './explain.js';
import { state, SLOTS, specChips, shopLinks, linkFor, slim, saveBuilds, buildText } from './state.js';
import { openFacetModal, loadFacets, summarize, countActive } from './facets.js';
import { adChips, adLink, hideButton, isHidden, isViewed, hiddenToggle } from './kufarui.js';
import { watchButton } from './watch.js';
import { offersTable, historyBlock, openBuyPlan } from './shops.js';
import { fpsTable, powerDraw, monthlyCost, RESOLUTIONS } from './games.js';

const Compat = window.Compat;
const Catalog = window.Catalog;
// Пункты сетапа как «слоты» сборки
const SETUP_SLOTS = Catalog.SETUP.map((x) => ({ key: x.id, label: x.label, icon: x.icon, cat: x.id, setup: true }));

const PURPOSES = [
  { id: 'gaming', title: 'Игры', text: 'Максимум FPS: упор на видеокарту', icon: 'gamepad' },
  { id: 'universal', title: 'Универсальный', text: 'Игры, учёба, стримы, всё понемногу', icon: 'layers' },
  { id: 'work', title: 'Работа', text: 'Монтаж, 3D, программирование', icon: 'film' },
  { id: 'office', title: 'Офис и учёба', text: 'Документы, браузер, видео', icon: 'book' },
];

const PRESETS_BYN = [1500, 2500, 3500, 5000, 8000, 12000];

// Стили сборки: наборы фильтров и настроек, которые видно и можно поправить в форме
const STYLES = [
  { id: '', title: 'Обычный', text: 'Максимум за свои деньги' },
  { id: 'quiet', title: 'Тихий', text: 'Кулер с запасом, корпус с вентиляторами, БП Gold', set: { quiet: true } },
  { id: 'white', title: 'Белый', text: 'Белые корпус и память', filters: { chassis: { color_shassis: ['white'] }, dram: { dramcolor: ['white', 'silver'] } } },
  { id: 'rgb', title: 'С подсветкой', text: 'ARGB-вентиляторы и память с подсветкой', filters: { chassis: { coocolor_shassis: ['argb', 'multicolor', 'rgbfix'] }, dram: { dramlight: 1 } } },
  { id: 'compact', title: 'Компактный', text: 'Плата mATX в небольшом корпусе Mini Tower', set: { form: 'matx' }, filters: { chassis: { case_class: ['minitower'] } } },
  { id: 'stream', title: 'Для стриминга', text: 'NVIDIA (кодировщик NVENC), 32 ГБ памяти, упор и на процессор', set: { purpose: 'universal', gpuBrand: 'nvidia', ram: '32' } },
];

/** Включить стиль: снимаем фильтры прошлого стиля и ставим новые. */
function applyStyle(id) {
  const prev = STYLES.find((x) => x.id === (form.style || ''));
  if (prev && prev.filters) {
    for (const [cat, f] of Object.entries(prev.filters)) {
      for (const k of Object.keys(f)) if (form.filters[cat]) delete form.filters[cat][k];
      if (form.filters[cat] && !Object.keys(form.filters[cat]).length) delete form.filters[cat];
    }
  }
  if (prev && prev.set) {
    if (prev.set.quiet) form.quiet = false;
    if (prev.set.form) form.form = 'any';
    if (prev.set.gpuBrand) form.gpuBrand = 'any';
    if (prev.set.ram) form.ram = 'auto';
  }
  const st = STYLES.find((x) => x.id === id) || STYLES[0];
  for (const [cat, f] of Object.entries(st.filters || {})) form.filters[cat] = { ...(form.filters[cat] || {}), ...JSON.parse(JSON.stringify(f)) };
  Object.assign(form, st.set || {});
  form.style = st.id;
  persistForm();
  render();
}

const HAVE = [
  ['gpu', 'Видеокарта'],
  ['case', 'Корпус'],
  ['psu', 'Блок питания'],
  ['ssd', 'SSD'],
  ['cooler', 'Кулер'],
];

const DEFAULT_FORM = {
  budget: 3500, currency: 'BYN', purpose: 'gaming', cpuBrand: 'any', gpuBrand: 'any', ram: 'auto', storage: 'auto',
  hdd: 0, platform: 'any', form: 'any', wifi: false, trustedOnly: false, have: {}, advOpen: false, filters: {}, setup: [], pins: {},
};

// Фильтры Onliner по комплектующим: [категория Onliner, название, иконка, ключ «у меня уже есть»]
const FILTER_SLOTS = [
  ['cpu', 'Процессор', 'cpu'],
  ['videocard', 'Видеокарта', 'gpu', 'gpu'],
  ['motherboard', 'Материнская плата', 'board'],
  ['dram', 'Оперативная память', 'ram'],
  ['ssd', 'SSD', 'ssd', 'ssd'],
  ['hdd', 'Жёсткий диск', 'hdd'],
  ['powersupply', 'Блок питания', 'psu', 'psu'],
  ['chassis', 'Корпус', 'case', 'case'],
  ['fan', 'Охлаждение', 'fan', 'cooler'],
];
// Эти условия подбор задаёт сам (корпус без БП, крепление кулера под сокет)
const BUILDER_HIDE = { chassis: ['type_chassis'], fan: ['fan_socket'] };
// У каждой категории Onliner свои фильтры; в подборе оставляем только значения, из которых можно собрать ПК
const PC_SOCKETS = ['am4', 'am5', 'lga1200', 'lga1700', 'lga1851'];
const BUILDER_ONLY = {
  cpu: { socket_cpu: PC_SOCKETS },
  motherboard: { socket_cpu: PC_SOCKETS, mem_type_mother: ['ddr4', 'ddr5', 'ddr5cudimm'], type_mother: ['atx', 'matx', 'miniitx'] },
  dram: { dramkit: ['ddr4dimm', 'ddr5dimm'] },
  ssd: { form_ssd: ['m2', '25'] },
  powersupply: { ffactorsize: ['atx'] },
  fan: { type_fan: ['cpu', 'syslcp'] },
};

let form = { ...DEFAULT_FORM };
let root;
const panels = {}; // slot -> 'shops' | 'alts' | 'used'
const usedCache = {}; // id -> items

export function initBuild(container, savedForm) {
  root = container;
  document.addEventListener('fill-missing', () => fillMissing());
  if (savedForm) {
    form = {
      ...DEFAULT_FORM, ...savedForm, have: { ...(savedForm.have || {}) },
      filters: JSON.parse(JSON.stringify(savedForm.filters || {})),
      setup: Array.isArray(savedForm.setup) ? savedForm.setup.filter((id) => Catalog.setupById[id]) : [],
      pins: savedForm.pins && typeof savedForm.pins === 'object' ? { ...savedForm.pins } : {},
    };
  }
  if (state.settings.currency && !savedForm) form.currency = state.settings.currency;
  // «Тонких настроек» больше нет: старые сохранённые значения не должны тайком ограничивать подбор.
  // Их задают только стили сборки (видно по выбранному стилю) и фильтры.
  Object.assign(form, { cpuBrand: 'any', gpuBrand: 'any', platform: 'any', ram: 'auto', storage: 'auto', hdd: 0, form: 'any', wifi: false, quiet: false });
  const st = STYLES.find((x) => x.id === (form.style || ''));
  if (st && st.set) Object.assign(form, st.set);
  money.currency = form.currency;
  if (form.mode === 'custom') openCustomBuild();
  render();
}

export function rerenderBuild() {
  if (root) render();
}

function persistForm() {
  api('/api/store/lastForm', { method: 'PUT', body: form }).catch(() => {});
}

function render() {
  root.replaceChildren(renderForm(), el('div.results#results', renderResults()));
}

// ------------------------------------------------------------------ форма

function niceRound(v) {
  if (v >= 100000) return Math.round(v / 5000) * 5000;
  if (v >= 10000) return Math.round(v / 500) * 500;
  if (v >= 1000) return Math.round(v / 100) * 100;
  if (v >= 100) return Math.round(v / 50) * 50;
  return Math.round(v);
}

/** Переключатель режимов: подбор по бюджету или своя сборка. */
function modeTabs() {
  return el('div.mode-tabs',
    el('button.mode-tab', { type: 'button', class: form.mode !== 'custom' ? 'on' : '', onclick: () => setMode('budget') }, icon('wand'), 'Подбор по бюджету'),
    el('button.mode-tab', { type: 'button', class: form.mode === 'custom' ? 'on' : '', onclick: () => setMode('custom') }, icon('plus'), 'Собрать самому — по ссылкам'));
}

function setMode(mode) {
  form.mode = mode;
  persistForm();
  if (mode === 'custom') openCustomBuild();
  else if (state.result && state.result.custom) state.result = null;
  render();
}

/** Своя сборка как обычный «результат» с одним вариантом — работают все панели деталей. */
function openCustomBuild() {
  const parts = {};
  for (const sl of SLOTS) if (form.customParts && form.customParts[sl.key]) parts[sl.key] = form.customParts[sl.key];
  state.result = {
    custom: true, budget: totalOf(parts), purpose: form.purpose, purposeLabel: 'Своя сборка',
    variants: [{ id: 'custom', label: 'Своя сборка', hint: '', budget: totalOf(parts), build: { parts, setup: {}, alternatives: {}, setupAlternatives: {}, custom: true } }],
    warnings: [], stats: { ms: 0, cpus: 0, gpus: 0, boards: 0 },
  };
  state.lastBuildForm = { have: {} };
  state.variant = 'custom';
}

/** Детали своей сборки сохраняем, чтобы она не пропала после перезапуска. */
function saveCustomParts() {
  const v = current();
  if (!state.result || !state.result.custom || !v) return;
  form.customParts = Object.fromEntries(Object.entries(v.build.parts).filter(([, x]) => x).map(([k, x]) => [k, slim(x)]));
  state.result.budget = totalOf(v.build.parts);
  v.budget = state.result.budget;
  persistForm();
}

function renderCustomHero() {
  const area = el('textarea.input.links-input', {
    rows: 5,
    placeholder: 'Вставьте ссылки на детали или названия моделей — по одной в строке. Например:\nhttps://catalog.onliner.by/videocard/…\nhttps://www.kufar.by/item/…\nhttps://www.21vek.by/…\nRyzen 5 7500F\nKingston Fury Beast 2x16GB DDR5 6000',
  });
  const status = el('div.links-status');
  const btn = el('button.btn.btn-primary.btn-lg', {
    type: 'button',
    onclick: async () => {
      if (!area.value.trim()) return toast('Вставьте хотя бы одну ссылку или название', 'err');
      btn.disabled = true;
      status.replaceChildren(el('div.row', el('div.spinner.inline'), el('span.muted', 'Разбираем ссылки: открываем товары и определяем характеристики…')));
      try {
        const r = await api('/api/part/links', { method: 'POST', body: { text: area.value } });
        if (!state.result || !state.result.custom) openCustomBuild();
        const v = current();
        for (const x of r.items) {
          if (x.setup) continue;
          v.build.parts[x.slot] = x.item;
          pinPart(x.slot, x.item, true);
        }
        saveCustomParts();
        status.replaceChildren(
          r.items.length ? el('div.notice.ok', icon('check'), el('div', `Добавлено: ${r.items.map((x) => x.item.name).join(', ')}.`,
            r.items.some((x) => x.approx) ? el('div', el('b', ' Проверьте: '), r.items.filter((x) => x.approx).map((x) => x.item.name).join(', '), ' — нашлась похожая, а не точно та же модель.') : null,
            r.items.some((x) => x.needPrice) ? el('div', 'Цену из другого магазина поправьте кнопкой «Цена» у детали.') : null)) : null,
          r.unknown.length ? el('div.notice', icon('alert'), el('div', el('b', 'Не распознано: '), el('ul.compact-list', r.unknown.map((u) => el('li', `${u.line.slice(0, 80)} — ${u.reason}`))),
            el('div.dim.small', 'Такие детали можно добавить кнопкой «Своя деталь из любого магазина»: тип, название и цена.'))) : null);
        area.value = '';
        document.getElementById('results').replaceChildren(...renderResults());
      } catch (e) {
        status.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message)));
      }
      btn.disabled = false;
    },
  }, icon('plus'), 'Добавить в сборку');
  return el('div.card.hero',
    modeTabs(),
    el('h1', 'Соберите компьютер сами'),
    el('p.lead', 'Вставьте ссылки на детали из любых магазинов и с Kufar или просто названия моделей. Программа определит, что это, проверит совместимость, покажет итог, FPS и где купить дешевле. Недостающее можно добавить по одной детали или подобрать автоматически под бюджет.'),
    area,
    el('div.row', { style: { marginTop: '12px', gap: '12px' } }, btn,
      el('button.btn', { type: 'button', onclick: () => { form.customParts = {}; persistForm(); openCustomBuild(); render(); } }, icon('trash'), 'Начать заново')),
    status);
}

function renderForm() {
  const budgetInput = el('input', {
    type: 'text', inputmode: 'decimal', value: String(form.budget), 'aria-label': 'Бюджет',
    oninput: (e) => {
      const v = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.'));
      form.budget = isNaN(v) ? 0 : v;
      persistForm();
      if (form.setup.length) refreshSetupBlock();
    },
    onkeydown: (e) => e.key === 'Enter' && submit(),
  });
  const curSelect = el('select.select', {
    'aria-label': 'Валюта',
    onchange: (e) => {
      const old = form.currency;
      const next = e.target.value;
      // пересчитываем введённую сумму в новую валюту
      if (form.budget > 0 && money.rates[old] && money.rates[next]) {
        form.budget = niceRound((form.budget * money.rates[old]) / money.rates[next]);
      }
      form.currency = next;
      money.currency = next;
      persistForm();
      render();
      document.dispatchEvent(new CustomEvent('currency-change'));
    },
  }, (state.rates ? state.rates.currencies : [{ code: 'BYN' }]).map((c) => el('option', { value: c.code }, c.code)));
  curSelect.value = form.currency;

  const presets = el('div.presets', PRESETS_BYN.map((byn) => {
    const v = niceRound(money.toCur(byn, form.currency));
    return el('button.chip', {
      type: 'button',
      onclick: () => {
        form.budget = v;
        budgetInput.value = String(v);
        persistForm();
      },
    }, money.fmt(money.fromCur(v, form.currency), form.currency, { round: true }));
  }));

  const purposeGrid = el('div.purpose-grid', PURPOSES.map((p) => el('button.purpose', {
    type: 'button', class: form.purpose === p.id ? 'on' : '',
    onclick: (e) => {
      form.purpose = p.id;
      persistForm();
      for (const b of purposeGrid.children) b.classList.toggle('on', b === e.currentTarget);
    },
  }, icon(p.icon, 'p-ico'), el('div', el('b', p.title), el('span', p.text)))));

  const haveChips = el('div.row.wrap', HAVE.map(([k, label]) => el('button.chip.toggle-chip', {
    type: 'button', class: form.have[k] ? 'on' : '',
    onclick: (e) => {
      form.have[k] = !form.have[k];
      e.currentTarget.classList.toggle('on', form.have[k]);
      persistForm();
      refreshFilters();
    },
  }, label)));

  const submitBtn = el('button.btn.btn-primary.btn-lg#buildBtn', { type: 'button', onclick: submit }, icon('sparkles'), 'Подобрать сборку');
  const filtersBlock = renderFilters();
  const setupBlock = renderSetupBlock();

  if (form.mode === 'custom') return renderCustomHero();
  return el('div.card.hero',
    modeTabs(),
    el('h1', 'Соберём компьютер под ваш бюджет'),
    el('p.lead', 'Живые цены из каталога Onliner (сотни магазинов Беларуси) и объявления Kufar. Подбор учитывает совместимость, мощность блока питания и охлаждение, а к каждой детали покажет альтернативы и б/у предложения.'),
    el('div.budget-row',
      el('div.field', el('label', 'Бюджет'), el('div.budget-input', budgetInput, curSelect)),
      el('div.field', el('label', 'Быстрый выбор'), presets)),
    purposeGrid,
    el('div.field.style-field', el('label', 'Стиль сборки'),
      el('div.style-chips', STYLES.map((st) => el('button.chip.toggle-chip.style-chip', {
        type: 'button', class: (form.style || '') === st.id ? 'on' : '', title: st.text,
        onclick: () => applyStyle(st.id),
      }, st.title))),
      form.style ? el('div.dim.small', STYLES.find((x) => x.id === form.style).text + '. Фильтры стиля видны ниже — их можно поправить.') : null),
    setupBlock,
    el('div.field.have-field', el('label', 'Уже есть — не покупать'), haveChips,
      el('div.dim.small', 'Отметьте детали, которые у вас уже есть: подбор их не купит, а бюджет уйдёт на остальное.')),
    filtersBlock,
    renderPinsBlock(),
    el('div.form-foot', submitBtn, el('span.dim', 'Обычно занимает 3–8 секунд: приложение просматривает несколько тысяч товаров.')));
}

// ------------------------------------------------------------------ фильтры Onliner

/** Категории с фильтрами: комплектующие ПК + выбранные пункты сетапа. */
function filterSlots() {
  return FILTER_SLOTS.concat(form.setup.map((id) => [id, Catalog.setupById[id].label, Catalog.setupById[id].icon]));
}

function renderFilters() {
  const total = Object.values(form.filters || {}).reduce((n, f) => n + countActive(f), 0);
  const buttons = filterSlots().filter(([cat]) => cat !== 'hdd' || Number(form.hdd) > 0 || countActive(form.filters.hdd)).map(([cat, label, ic, haveKey]) => {
    const n = countActive(form.filters[cat]);
    const owned = haveKey && form.have[haveKey];
    return el('button.btn.btn-sm.filter-btn', {
      type: 'button', class: n ? 'on' : '', disabled: !!owned,
      title: owned ? 'Отмечено «уже есть» — в сборку не входит' : `Фильтры Onliner для категории «${label}»`,
      onclick: async () => {
        const res = await openFacetModal(cat, label, form.filters[cat], { hide: BUILDER_HIDE[cat], only: BUILDER_ONLY[cat] || {} });
        if (res === null) return;
        if (countActive(res)) form.filters[cat] = res;
        else delete form.filters[cat];
        persistForm();
        refreshFilters();
      },
    }, icon(ic), label, n ? el('span.badge-count', String(n)) : null);
  });
  const summary = el('div.filter-summary');
  const box = el('div.filters-block#filtersBlock',
    el('div.row.wrap', { style: { justifyContent: 'space-between' } },
      el('div', el('div.label', 'Фильтры комплектующих — как на Onliner'),
        el('div.dim.small', 'Производитель, чипсет, частоты, подсветка, цвет, размеры… Подбор возьмёт только подходящие товары.')),
      total ? el('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: () => { form.filters = {}; persistForm(); refreshFilters(); } }, 'Сбросить все фильтры') : null),
    el('div.row.wrap.filter-buttons', buttons),
    summary);
  fillSummary(summary);
  return box;
}

function refreshFilters() {
  const old = document.getElementById('filtersBlock');
  if (old) old.replaceWith(renderFilters());
}

async function fillSummary(box) {
  const active = filterSlots().filter(([cat]) => countActive(form.filters[cat]));
  if (!active.length) return;
  const rows = [];
  for (const [cat, label] of active) {
    let meta = null;
    try {
      meta = await loadFacets(cat);
    } catch {}
    const parts = meta ? summarize(meta, form.filters[cat]) : [`${countActive(form.filters[cat])} фильтр(а)`];
    rows.push(el('div.filter-line',
      el('b', label + ':'), el('span.muted', ' ' + parts.join(' · ')),
      el('button.icon-btn.small-x', {
        type: 'button', title: 'Убрать фильтры этой категории',
        onclick: () => { delete form.filters[cat]; persistForm(); refreshFilters(); },
      }, icon('x'))));
  }
  box.replaceChildren(...rows);
}

// ------------------------------------------------------------------ закреплённые детали

const SLOT_LABEL = Object.fromEntries(SLOTS.map((x) => [x.key, x.label]));

/** Закрепить или открепить деталь: при пересборке закреплённое остаётся, остальное подбирается под бюджет. */
/** Своя сборка → подбор недостающего: ваши детали закреплены, остальное под общий бюджет. */
async function fillMissing() {
  const v = current();
  const have = totalOf(v.build.parts);
  const value = await promptText('Подобрать недостающее', `Общий бюджет на всю сборку, ${money.currency} (ваши детали уже стоят ${money.fmt(have)})`, String(Math.round(money.toCur(have + 1500))));
  if (!value) return;
  const budget = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
  if (!(budget > 0)) return toast('Введите бюджет числом', 'err');
  form.pins = Object.fromEntries(Object.entries(v.build.parts).filter(([, x]) => x).map(([k, x]) => [k, { ...slim(x), keep: true }]));
  form.budget = budget;
  form.mode = 'budget';
  persistForm();
  render();
  submit();
}

/** Цена детали из другого магазина (своя сборка). */
function editPrice(slotKey, it) {
  promptText('Цена', `Цена «${it.name}», ${money.currency}`, String(Math.round(money.toCur(it.price || 0)))).then((val) => {
    if (val == null) return;
    const n = parseFloat(String(val).replace(/\s/g, '').replace(',', '.'));
    if (!(n >= 0)) return toast('Введите цену числом', 'err');
    replacePart(slotKey, { ...it, price: money.fromCur(n) });
  });
}

/** Окно «Своя деталь»: ссылка, название, цена → деталь в сборке (закреплённая). */
function openCustomPart(slotKey) {
  const slotSel = el('select.select', SLOTS.map((sl) => el('option', { value: sl.key, selected: sl.key === slotKey }, sl.label)));
  const url = el('input.input', { type: 'url', placeholder: 'https://… (необязательно)' });
  const name = el('input.input', { placeholder: 'Например: MSI MAG B650 Tomahawk WiFi' });
  const price = el('input.input', { type: 'number', min: '0', step: '0.01', placeholder: `цена, ${money.currency}` });
  const status = el('div.dim.small');
  const btn = el('button.btn.btn-primary', {
    onclick: async () => {
      btn.disabled = true;
      status.textContent = 'Определяем характеристики…';
      try {
        const body = { slot: slotSel.value, url: url.value.trim(), name: name.value.trim(), price: price.value ? money.fromCur(+price.value) : 0 };
        const { item, exact } = await api('/api/part/custom', { method: 'POST', body });
        replacePart(slotSel.value, item);
        pinPart(slotSel.value, item, true);
        closeModal();
        toast(exact ? `Добавлено с каталога Onliner: ${item.name}` : `Добавлено: ${item.name}. Характеристики определены по названию — проверьте совместимость справа.`);
      } catch (e) {
        status.textContent = e.message;
        btn.disabled = false;
      }
    },
  }, 'Добавить в сборку');
  modal('Своя деталь', el('div.form-grid',
    el('div.field', el('label', 'Что это'), slotSel),
    el('div.field', el('label', 'Ссылка на товар'), url, el('div.dim.small', 'Для ссылки на каталог Onliner характеристики возьмём оттуда точно.')),
    el('div.field', el('label', 'Название (модель)'), name),
    el('div.field', el('label', 'Цена'), price),
    el('div.row', btn, status)), { narrow: true });
}

function pinPart(slotKey, item, on) {
  if (on && item) form.pins[slotKey] = slim(item);
  else delete form.pins[slotKey];
  persistForm();
  const old = document.getElementById('pinsBlock');
  if (old) old.replaceWith(renderPinsBlock());
}

function isPinned(slotKey, item) {
  const p = form.pins[slotKey];
  return !!(p && item && p.id === item.id && p.source === item.source);
}

function renderPinsBlock() {
  const keys = Object.keys(form.pins || {}).filter((k) => form.pins[k]);
  if (!keys.length) return el('div#pinsBlock', { hidden: true });
  return el('div.pins-block#pinsBlock',
    el('div.row.wrap', { style: { justifyContent: 'space-between' } },
      el('div.label', icon('pin'), ' Закреплённые детали — подбор оставит их и подберёт остальное'),
      el('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: () => { form.pins = {}; persistForm(); pinPart('', null, false); rerenderResults(); } }, 'Открепить все')),
    el('div.filter-summary', keys.map((k) => {
      const it = form.pins[k];
      return el('div.filter-line', el('b', (SLOT_LABEL[k] || k) + ':'),
        el('span.muted', ` ${it.name} · ${money.fmt(it.price)} · ${it.source === 'kufar' ? 'Kufar (объявление)' : 'Onliner'}`),
        el('button.icon-btn.small-x', { type: 'button', title: 'Открепить', onclick: () => { pinPart(k, null, false); rerenderResults(); } }, icon('x')));
    })));
}

// ------------------------------------------------------------------ сетап целиком

function renderSetupBlock() {
  const budgetByn = money.fromCur(form.budget || 0, form.currency);
  const chips = Catalog.SETUP.map((x) => {
    const on = form.setup.includes(x.id);
    return el('button.chip.toggle-chip.setup-chip', {
      type: 'button', class: on ? 'on' : '',
      title: `Примерно ${money.fmt(Catalog.setupTarget(x.id, budgetByn), form.currency, { round: true })} из бюджета`,
      onclick: () => {
        form.setup = on ? form.setup.filter((id) => id !== x.id) : form.setup.concat(x.id);
        persistForm();
        refreshSetupBlock();
        refreshFilters();
      },
    }, icon(x.icon), x.label);
  });
  const reserve = form.setup.reduce((sum, id) => sum + Catalog.setupTarget(id, budgetByn), 0);
  return el('div.setup-block#setupBlock',
    el('div.row.wrap', { style: { justifyContent: 'space-between' } },
      el('div', el('div.label', 'Сетап целиком'),
        el('div.dim.small', 'Отметьте, что купить вместе с компьютером. Бюджет разделится, монитор подберётся под мощность видеокарты.')),
      form.setup.length ? el('div.small.muted', `На сетап ≈ ${money.fmt(reserve, form.currency, { round: true })}, на ПК ≈ ${money.fmt(Math.max(0, budgetByn - reserve), form.currency, { round: true })}`) : null),
    el('div.row.wrap.setup-chips', chips));
}

function refreshSetupBlock() {
  const old = document.getElementById('setupBlock');
  if (old) old.replaceWith(renderSetupBlock());
}

// ------------------------------------------------------------------ запрос

const STEPS = [
  'Загружаем процессоры и видеокарты с Onliner…',
  'Смотрим материнские платы и оперативную память…',
  'Подбираем SSD, блок питания и корпус…',
  'Перебираем тысячи совместимых комбинаций…',
  'Проверяем совместимость и считаем мощность…',
];

async function submit() {
  if (!(form.budget > 0)) {
    toast('Введите бюджет', 'err');
    const res = document.getElementById('results');
    if (res) res.replaceChildren(el('div.notice.err', icon('alert'), el('div', el('b', 'Укажите бюджет больше нуля. '), 'Например, 2500 р. — или нажмите одну из кнопок «Быстрый выбор».')));
    document.dispatchEvent(new CustomEvent('mascot', { detail: { id: 'budget-empty', level: 'warn', text: 'Сначала впишите бюджет — например, 2500 р. Для игр в 1080p обычно хватает 2500–3500 р., для 1440p — от 4500 р.' } }));
    return;
  }
  const btn = document.getElementById('buildBtn');
  btn.disabled = true;
  const results = document.getElementById('results');
  const step = el('div.loading-step', STEPS[0]);
  results.replaceChildren(el('div.card.loading', el('div.spinner'), el('b', 'Подбираем сборку'), step));
  let i = 0;
  const timer = setInterval(() => (step.textContent = STEPS[Math.min(++i, STEPS.length - 1)]), 1300);
  try {
    const body = { ...form, budget: form.budget, currency: form.currency, trustedOnly: !!state.settings.trustedOnly };
    state.result = await api('/api/build', { method: 'POST', body });
    state.lastBuildForm = { ...form, have: { ...form.have }, filters: JSON.parse(JSON.stringify(form.filters || {})) };
    state.variant = state.result.variants.find((v) => v.id === 'optimal' && v.build) ? 'optimal' : (state.result.variants.find((v) => v.build) || {}).id || 'optimal';
    for (const k of Object.keys(panels)) delete panels[k];
    results.replaceChildren(...renderResults());
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    prefetchUsed();
    loadHybrid(body, state.result);
  } catch (e) {
    results.replaceChildren(el('div.notice.err', icon('error'), el('div', el('b', 'Не получилось подобрать. '), e.message)));
    document.dispatchEvent(new CustomEvent('mascot', { detail: { id: 'build-fail:' + String(e.message).slice(0, 40), level: 'warn', title: 'Не получилось', text: /фильтр|противореч/i.test(e.message) ? 'Похоже, фильтры противоречат друг другу или слишком узкие. Нажмите «Сбросить все фильтры» и попробуйте снова.' : /бюджет/i.test(e.message) ? e.message : 'Проверьте интернет и попробуйте ещё раз — иногда сайты магазинов отвечают с задержкой.' } }));
  } finally {
    clearInterval(timer);
    btn.disabled = false;
  }
}

// ------------------------------------------------------------------ результаты

function current() {
  const r = state.result;
  if (!r) return null;
  return r.variants.find((v) => v.id === state.variant) || null;
}

function totalOf(parts) {
  return Object.values(parts || {}).reduce((s, it) => s + (it ? it.price || 0 : 0), 0);
}

/** Итог: компьютер + сетап. */
function fullTotal(b) {
  return totalOf(b.parts) + totalOf(b.setup);
}

function hasSetup(b) {
  return !!(b.setup && (Object.keys(b.setup).length || Object.keys(b.setupAlternatives || {}).length));
}

function renderResults() {
  const r = state.result;
  if (!r) {
    return [el('div.card.empty-state', icon('wand', 'big-ico'),
      el('h3', 'Укажите бюджет и назначение'),
      el('p.muted', 'Приложение подберёт три варианта сборки: экономный, оптимальный и с запасом. Всё можно поменять вручную.'))];
  }
  const out = [];
  const usedFilters = state.lastBuildForm && state.lastBuildForm.filters ? filterSlots().filter(([cat]) => countActive(state.lastBuildForm.filters[cat])) : [];
  if (usedFilters.length && r.variants.some((v) => v.id !== 'saved')) {
    out.push(el('div.notice.info', { style: { marginBottom: '12px' } }, icon('info'),
      el('div', 'Учтены ваши фильтры: ', usedFilters.map(([cat, label]) => `${label} (${countActive(state.lastBuildForm.filters[cat])})`).join(', '), '.')));
  }
  if (r.warnings && r.warnings.length) {
    out.push(el('div.notice', { style: { marginBottom: '12px' } }, icon('alert'), el('div', r.warnings.join('. '))));
  }
  const opt = r.variants.find((v) => v.id === 'optimal');
  if (!r.custom && r.variants.some((v) => v.id === 'optimal') && (!opt || !opt.build)) {
    out.push(el('div.notice.err', icon('alert'), el('div',
      el('b', 'Бюджета не хватает на работающую сборку. '),
      r.minNeeded ? `Самая дешёвая совместимая сборка из того, что сейчас в наличии, стоит около ${money.fmt(r.minNeeded)}${money.currency !== 'BYN' ? ` (${money.fmt(r.minNeeded, 'BYN')})` : ''}`
        + (r.minSetup ? ` (компьютер ${money.fmt(r.minNeeded - r.minSetup)} + самая доступная периферия ${money.fmt(r.minSetup)})` : '') + '. ' : '',
      'Увеличьте бюджет, отметьте детали, которые у вас уже есть, или посмотрите б/у на Kufar через «Поиск».')));
  }
  if (!r.custom) out.push(renderVariants());
  const v = current();
  if (v && v.build) out.push(renderBuild(v));
  return out;
}

/** Четвёртый вариант «Новое + б/у»: считается отдельно, после основного подбора (нужен Kufar). */
async function loadHybrid(body, result) {
  const opt = result.variants.find((v) => v.id === 'optimal');
  if (!opt || !opt.build) return;
  const v = { id: 'hybrid', label: 'Новое + б/у', hint: 'Процессор и/или видеокарта с Kufar, остальное новое', budget: opt.budget, build: null, loading: true };
  result.variants.push(v);
  const redraw = () => {
    if (state.result !== result) return;
    const box = document.getElementById('variantsBox');
    if (box) box.replaceWith(renderVariants());
  };
  redraw();
  try {
    const r = await api('/api/build/hybrid', { method: 'POST', body });
    if (r.none) v.none = r.reason;
    else {
      v.build = r.build;
      v.base = r.base;
    }
  } catch (e) {
    v.none = e.message;
  }
  v.loading = false;
  redraw();
}

function hybridTag(v) {
  if (!v.build || !v.base) return null;
  const opt = state.result.variants.find((x) => x.id === 'optimal');
  const saved = Math.round(v.base.total - v.build.total);
  const gain = v.base.index && v.base.index.gaming && v.build.index.gaming ? Math.round((v.build.index.gaming / v.base.index.gaming - 1) * 100) : 0;
  const text = gain >= 3 ? `мощнее на ${gain}%` : saved > 30 ? `дешевле на ${money.fmt(saved, money.currency, { round: true })}` : 'с б/у деталями';
  return el('span.chip.v-tag.ok', { title: `По сравнению с полностью новой сборкой на тот же бюджет${opt ? '' : ''}` }, text);
}

function renderVariants() {
  const r = state.result;
  const box = el('div.variants', r.variants.map((v) => {
    const b = v.build;
    const total = b ? fullTotal(b) : null;
    if (v.id === 'hybrid' && !b) {
      return el('button.variant.hybrid', { type: 'button', disabled: true, title: v.none || '' },
        el('div.v-label', icon('recycle'), ' ', v.label),
        el('div.v-total', v.loading ? el('span.spinner.inline') : '—'),
        el('div.v-tier', v.loading ? 'Ищем выгодные б/у процессоры и видеокарты на Kufar…' : v.none || 'Не получилось'));
    }
    return el('button.variant', {
      type: 'button', class: (v.id === state.variant ? 'on ' : '') + (v.id === 'hybrid' ? 'hybrid' : ''), disabled: !b,
      onclick: () => {
        state.variant = v.id;
        document.getElementById('results').replaceChildren(...renderResults());
        prefetchUsed();
      },
    },
    el('div.v-label', v.id === 'hybrid' ? icon('recycle') : null, v.id === 'hybrid' ? ' ' : null, v.label),
    el('div.v-total', b ? money.fmt(total) : '—'),
    el('div.v-tier', b ? Compat.indices(b.parts, ((state.lastBuildForm && state.lastBuildForm.have) || {}).gpu).tier : `Не уложиться в ${money.fmt(v.budget)}`),
    v.id === 'hybrid' ? hybridTag(v) : v.same ? el('span.chip.v-tag', 'как оптимальная') : el('span.chip.v-tag', { title: v.hint }, `до ${money.fmt(v.budget, money.currency, { round: true })}`));
  }));
  return el('div#variantsBox', box,
    el('div.row', { style: { justifyContent: 'flex-end', marginTop: '8px' } },
      el('button.btn.btn-ghost.btn-sm', { onclick: compareVariants }, icon('scale'), 'Сравнить варианты')));
}

function renderBuild(v) {
  const b = v.build;
  const have = (state.lastBuildForm && state.lastBuildForm.have) || form.have || {};
  const parts = b.parts;
  const total = fullTotal(b);
  const pcTotal = totalOf(parts);
  const setupTotal = totalOf(b.setup);
  const idx = Compat.indices(parts, have.gpu);
  const checks = Compat.check(parts, have);
  // Персонаж-подсказчик сам решит, есть ли о чём предупредить (повторы он отсеивает)
  setTimeout(() => document.dispatchEvent(new CustomEvent('build-checked', { detail: { checks, parts, custom: !!b.custom } })), 400);
  const budgetByn = state.result.budget;
  const left = budgetByn - total;
  const t = money.both(total);

  const summary = el('div.card.summary',
    el('div.sum-total',
      el('div.dim.small', b.custom ? 'Своя сборка — итог по вашим деталям' : `${state.result.purposeLabel} · ${v.label.toLowerCase()}`),
      el('div.t', t.main),
      b.custom
        ? (t.sub ? el('div.s', t.sub) : null)
        : el('div.s', t.sub ? t.sub + ' · ' : '', left >= 0 ? `остаток от бюджета ${money.fmt(left)}` : `больше бюджета на ${money.fmt(-left)}`),
      hasSetup(b) ? el('div.s', `компьютер ${money.fmt(pcTotal)} + сетап ${money.fmt(setupTotal)}`) : null),
    meter('Игровой индекс', idx.gaming, 300, idx.tier),
    meter('Рабочий индекс', idx.work, 300, 'монтаж, рендер, компиляция'),
    el('div.sum-actions',
      b.custom ? el('button.btn.btn-primary', { title: 'Оставить ваши детали и подобрать недостающее под бюджет', onclick: fillMissing }, icon('sparkles'), 'Подобрать недостающее') : null,
      el('button.btn', { onclick: () => saveCurrent(v) }, icon('save'), 'Сохранить'),
      el('button.btn', { title: 'В каком магазине (или паре магазинов) есть вся сборка и сколько это стоит', onclick: () => openBuyPlan(Object.values(parts).concat(Object.values(b.setup || {}))) }, icon('store'), 'Где купить всё'),
      el('button.btn', { onclick: () => copyText(buildText(textTitle(v), parts, total, '', b.setup)) }, icon('copy'), 'Копировать список'),
      el('button.btn', { onclick: () => download(`Сборка ${new Date().toLocaleDateString('ru-RU')}.txt`, buildText(textTitle(v), parts, total, '', b.setup)) }, icon('download'), 'В файл .txt')));

  // Анимация появления деталей — только для новой сборки, а не при каждом открытии панели
  const fresh = lastAnimated !== v;
  lastAnimated = v;
  const partsBox = el('div.parts', { class: fresh ? 'enter' : '' }, SLOTS.map((s) => renderPart(s, v)).filter(Boolean));
  if (b.original) {
    partsBox.prepend(el('div.notice.info', icon('info'), el('div.grow', 'Сборка изменена вручную, выбранные детали закреплены. Совместимость и итог пересчитаны.'),
      el('button.btn.btn-sm.btn-primary', { onclick: submit, title: 'Оставить закреплённые детали и подобрать остальное под бюджет' }, icon('sparkles'), 'Пересобрать остальное'),
      el('button.btn.btn-sm', { onclick: () => { b.parts = { ...b.original }; delete b.original; rerenderResults(); } }, 'Вернуть как было')));
  }
  partsBox.append(el('div.row.custom-part-row',
    el('button.btn.btn-sm', { onclick: () => openCustomPart() }, icon('plus'), 'Своя деталь из любого магазина'),
    el('span.dim.small', 'Вставьте ссылку (Onliner, 21vek, DNS, Kufar…), название и цену — деталь встанет в сборку, совместимость проверится.')));
  // Сетап: монитор, периферия, рабочее место
  if (hasSetup(b)) {
    const rows = SETUP_SLOTS.filter((sl) => (b.setup && b.setup[sl.key]) || (b.setupAlternatives && b.setupAlternatives[sl.key])).map((sl) => renderPart(sl, v)).filter(Boolean);
    partsBox.append(el('div.setup-head',
      el('h3', icon('monitor'), 'Сетап: периферия и рабочее место'),
      el('span.price', money.fmt(setupTotal))));
    partsBox.append(...rows);
    if (b.originalSetup) {
      partsBox.append(el('div.notice.info', icon('info'), el('div.grow', 'Сетап изменён вручную.'),
        el('button.btn.btn-sm', { onclick: () => { b.setup = { ...b.originalSetup }; delete b.originalSetup; rerenderResults(); } }, 'Вернуть как было')));
    }
  }

  const need = Compat.psuNeed(parts.cpu, parts.gpu, have.gpu ? 250 : 0);
  const side = el('div.side',
    el('div.card',
      el('h3', 'Совместимость'),
      el('div.checks', checks.map((c) => el('div.ck', { class: c.level }, icon({ ok: 'check', warn: 'alert', error: 'error', info: 'info' }[c.level], 'ci'), el('div', c.text))))),
    renderFps(parts, have),
    el('div.card',
      el('h3', 'Питание и охлаждение'),
      el('div.kv',
        el('span', 'Пиковая нагрузка'), el('span', `~${need.load} Вт`),
        el('span', 'Рекомендуемый БП'), el('span', `от ${need.rec} Вт`),
        el('span', 'Выбранный БП'), el('span', parts.psu ? `${parts.psu.specs.watts} Вт` : have.psu ? 'ваш' : '—'),
        el('span', 'Нужен кулер'), el('span', Compat.coolerNeed(parts.cpu) ? `от ${Compat.coolerNeed(parts.cpu)} Вт` : 'в комплекте')),
      renderPowerCost(parts)),
    renderUsedSummary(v),
    el('div.card',
      el('h3', 'Откуда цены'),
      el('p.muted.small', { style: { margin: 0 } },
        'Цена — минимальная среди магазинов на Onliner на сейчас. Кнопка «Магазины» покажет все предложения с гарантией. ',
        `Подбор занял ${(state.result.stats.ms / 1000).toFixed(1)} с, просмотрено ${state.result.stats.cpus} процессоров, ${state.result.stats.gpus} моделей видеокарт, ${state.result.stats.boards} плат.`)));

  return el('div', summary, el('div.layout-2', partsBox, side));
}

let fpsRes = '1080';

/** Примерный FPS в популярных играх. */
function renderFps(parts, have) {
  const rows = fpsTable(parts, fpsRes, have.gpu);
  if (!rows) return null;
  const card = el('div.card.fps-card');
  const seg = el('div.seg.small-seg', RESOLUTIONS.map(([v, l]) => el('button', {
    class: v === fpsRes ? 'on' : '', type: 'button',
    onclick: () => { fpsRes = v; card.replaceWith(renderFps(parts, have)); },
  }, l)));
  const max = Math.max(...rows.map((r) => r.fps), 60);
  card.append(
    el('div.card-head', el('h3', icon('gamepad'), ' FPS в играх'), seg),
    el('div.fps-list', rows.map((r) => el('div.fps-row', { title: `${r.preset}. Ограничивает ${r.limit === 'cpu' ? 'процессор' : 'видеокарта'}` },
      el('span.fps-game', r.name),
      el('span.fps-bar', el('i', { class: r.fps >= 144 ? 'hi' : r.fps >= 60 ? 'mid' : 'lo', style: { width: `${Math.min(100, (r.fps / Math.min(max, 300)) * 100)}%` } })),
      el('b.fps-num', r.fps >= 300 ? '300+' : String(r.fps))))),
    el('p.dim.small', 'Ориентир ±20% для высоких настроек без апскейлинга (DLSS/FSR добавят 30–60%). Наведите на игру — покажем, что ограничивает FPS.'));
  return card;
}

/** Потребление и счёт за электроэнергию. */
function renderPowerCost(parts) {
  const draw = powerDraw(parts);
  if (!draw) return null;
  const st = state.settings;
  const opts = { tariff: +st.tariff || 0.27, gameHours: st.gameHours != null ? +st.gameHours : 4, officeHours: st.officeHours != null ? +st.officeHours : 4 };
  const m = monthlyCost(draw, opts);
  return el('div.kv', { style: { marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' } },
    el('span', 'В играх'), el('span', `~${draw.game} Вт`),
    el('span', 'Браузер, офис'), el('span', `~${draw.office} Вт`),
    el('span', { title: `${opts.gameHours} ч игр и ${opts.officeHours} ч работы в день, тариф ${opts.tariff} р. за кВт·ч — меняется в «Настройках»` }, 'Свет в месяц'),
    el('span', `≈ ${money.fmt(m.cost)} (${m.kwh} кВт·ч)`));
}

function textTitle(v) {
  return `Сборка ПК «${state.result.purposeLabel}» (${v.label.toLowerCase()})`;
}

function meter(label, value, max, sub) {
  const pct = value == null ? 0 : Math.min(100, (value / max) * 100);
  return el('div.meter',
    el('div.meter-top', el('span', label), el('b', value == null ? '—' : String(value))),
    el('div.meter-bar', el('i', { style: { width: pct + '%' } })),
    el('div.meter-sub', sub));
}

let lastAnimated = null;
let justOpened = null;
const moreOpen = {};

function rerenderResults() {
  const box = document.getElementById('results');
  const y = document.getElementById('main').scrollTop;
  box.replaceChildren(...renderResults());
  document.getElementById('main').scrollTop = y;
}

// ------------------------------------------------------------------ строка детали

function altsOf(b, slot) {
  if (slot.setup) return (b.setupAlternatives && b.setupAlternatives[slot.key]) || [];
  return (b.alternatives && b.alternatives[slot.key]) || [];
}

function renderPart(slot, v) {
  const b = v.build;
  const it = slot.setup ? (b.setup || {})[slot.key] : b.parts[slot.key];
  const have = (state.lastBuildForm && state.lastBuildForm.have) || form.have || {};
  const alts = altsOf(b, slot);
  if (!it && slot.setup) {
    const row = el('div.part.empty',
      el('div.part-main',
        el('div.thumb.ph', icon(slot.icon)),
        el('div', el('div.part-kind', icon(slot.icon), slot.label), el('div.part-name.muted', 'Убрано из сетапа')),
        el('div.part-side', alts.length ? el('button.btn.btn-sm', { onclick: () => togglePanel(slot.key, 'alts') }, icon('plus'), 'Вернуть') : null)));
    if (panels[slot.key] === 'alts') row.append(el('div.part-panel', renderAlts(slot, v)));
    return row;
  }
  if (!it && b.custom) {
    if (slot.key === 'hdd') return null;
    const optional = slot.key === 'gpu' ? 'не обязательно, если у процессора есть встроенная графика' : slot.key === 'cooler' ? 'не нужен, если кулер в комплекте с процессором' : 'не выбрано';
    return el('div.part.empty.custom-slot', { 'data-slot': slot.key },
      el('div.part-main',
        el('div.thumb.ph', icon(slot.icon)),
        el('div', el('div.part-kind', icon(slot.icon), slot.label), el('div.part-name.muted', optional)),
        el('div.part-side.row', { style: { gap: '6px', flexDirection: 'row' } },
          el('button.btn.btn-sm', { onclick: () => document.dispatchEvent(new CustomEvent('goto-search', { detail: { cat: slot.cat, slot: slot.key } })) }, icon('search'), 'Найти'),
          el('button.btn.btn-sm', { onclick: () => openCustomPart(slot.key) }, icon('plus'), 'Ссылка или название'))));
  }
  if (!it) {
    if (slot.key === 'hdd') return null;
    if (slot.key === 'cooler' && !Compat.coolerNeed(b.parts.cpu)) return null;
    if (slot.key === 'gpu' && !have.gpu && !alts.length) return null;
    const why = have[slot.key] ? 'У вас уже есть' : slot.key === 'gpu' ? 'Встроенная графика процессора' : 'Не выбрано';
    const row = el('div.part.empty', { 'data-slot': slot.key },
      el('div.part-main',
        el('div.thumb.ph', icon(slot.icon)),
        el('div', el('div.part-kind', icon(slot.icon), slot.label), el('div.part-name.muted', why)),
        el('div.part-side', alts.length ? el('button.btn.btn-sm', { onclick: () => togglePanel(slot.key, 'alts') }, icon('plus'), 'Добавить') : null)));
    if (panels[slot.key] === 'alts') row.append(el('div.part-panel', renderAlts(slot, v)));
    return row;
  }
  const p = money.both(it.price);
  const changed = slot.setup ? b.originalSetup && b.originalSetup[slot.key] !== it : b.original && b.original[slot.key] !== it;
  const note = slot.setup && b.setupNotes && b.setupNotes[slot.key] && !changed ? b.setupNotes[slot.key] : null;
  const openBtn = (kind, ic, label) => el('button.btn.btn-sm', { class: panels[slot.key] === kind ? 'on' : '', onclick: () => togglePanel(slot.key, kind) }, icon(ic), label);

  const row = el('div.part', { class: changed ? 'changed' : '', 'data-slot': slot.key, 'data-setup': slot.setup ? '1' : null },
    el('div.part-main',
      thumb(it.image, slot.icon),
      el('div',
        el('div.part-kind', icon(slot.icon), slot.label, it.perf && it.perf.score ? el('span.chip', { style: { marginLeft: '6px' } }, `индекс ${it.perf.score}`) : null,
          it.perf && it.perf.gaming ? el('span.chip', { style: { marginLeft: '6px' } }, `игры ${it.perf.gaming} · многопоток ${it.perf.multi}`) : null),
        el('div.part-name', el('a', { href: it.url, target: '_blank', rel: 'noopener' }, it.name)),
        el('div.part-specs', note ? el('span.chip.ok', note) : null,
          it.source === 'kufar' ? el('span.badge.kufar', 'Kufar · объявление') : null,
          b.custom && !it.price ? el('button.chip.warn', { title: 'Укажите цену — иначе итог будет неполным', onclick: () => editPrice(slot.key, it) }, 'цена не указана — указать') : null,
          it.shopUrl ? el('a.chip', { href: it.shopUrl, target: '_blank', rel: 'noopener' }, 'ссылка на магазин ↗') : null,
          it.usedCount && it.usedMin ? el('a.chip', { href: it.usedUrl, target: '_blank', rel: 'noopener', title: 'Б/у на барахолке Onliner' }, `б/у на Onliner от ${money.fmt(it.usedMin)}`) : null,
          it.kufarNote ? el('span.chip.warn', it.kufarNote) : null,
          specChips(slot.cat, it),
          reviewChip(it))),
      el('div.part-side',
        el('div.price', p.main),
        p.sub ? el('div.price-sub', p.sub) : null,
        el('div.price-sub', it.offers ? `${it.offers} ${plural(it.offers, 'предложение', 'предложения', 'предложений')}` : ''))),
    // Главные действия — всегда на виду; остальные — под «Ещё», чтобы карточка не превращалась в стену кнопок
    el('div.part-actions',
      !slot.setup && explainPart(slot.key, it, b.parts).length ? openBtn('why', 'help', 'Почему эта') : null,
      openBtn('reviews', 'chat', it.source === 'onliner' && it.reviews ? `Отзывы (${it.reviews})` : 'Отзывы и обзоры'),
      alts.length || (slot.key === 'gpu' && b.alternatives && b.alternatives.gpuSame && b.alternatives.gpuSame.length) ? openBtn('alts', 'swap', `Заменить (${alts.length + ((slot.key === 'gpu' && b.alternatives && b.alternatives.gpuSame) ? b.alternatives.gpuSame.length : 0)})`) : null,
      openBtn('used', 'recycle', 'Б/у'),
      isPinned(slot.key, it) ? el('span.chip.accent', { title: 'При пересборке эта деталь останется' }, icon('pin'), 'закреплено') : null,
      el('button.btn.btn-sm.btn-ghost.more-btn', {
        class: moreOpen[slot.key] ? 'on' : '', 'aria-expanded': moreOpen[slot.key] ? 'true' : 'false',
        onclick: () => { moreOpen[slot.key] = !moreOpen[slot.key]; justOpened = moreOpen[slot.key] ? 'more:' + slot.key : null; rerenderResults(); },
      }, moreOpen[slot.key] ? 'Свернуть' : 'Ещё', icon('down'))),
    moreOpen[slot.key] ? el('div.part-actions.more-actions', { class: justOpened === 'more:' + slot.key ? 'opening' : '' },
      it.source === 'onliner' ? openBtn('shops', 'store', 'Цены в магазинах') : null,
      it.source === 'onliner' ? openBtn('history', 'chart', 'История цены') : null,
      watchButton(it, rerenderResults),
      el('a.btn.btn-sm.btn-ghost', { href: it.url, target: '_blank', rel: 'noopener' }, icon('external'), 'Открыть на сайте'),
      b.custom && !slot.setup ? el('button.btn.btn-sm.btn-ghost', { title: 'Поменять цену (например, цена в другом магазине)', onclick: () => editPrice(slot.key, it) }, icon('tag'), 'Цена') : null,
      !slot.setup ? el('button.btn.btn-sm.btn-ghost', {
        class: isPinned(slot.key, it) ? 'on' : '',
        title: isPinned(slot.key, it) ? 'Открепить' : 'Закрепить: при пересборке эта деталь останется, остальное подберётся под бюджет',
        onclick: () => { pinPart(slot.key, it, !isPinned(slot.key, it)); rerenderResults(); },
      }, icon('pin'), isPinned(slot.key, it) ? 'Открепить' : 'Закрепить') : null,
      el('button.btn.btn-sm.btn-ghost', { title: 'Убрать из сборки', onclick: () => replacePart(slot.key, null, slot.setup) }, icon('trash'), 'Убрать')) : null);
  const kind = panels[slot.key];
  if (kind) {
    const panel = el('div.part-panel', { class: justOpened === slot.key + ':' + kind ? 'opening' : '' });
    row.append(panel);
    if (kind === 'shops') loadShops(panel, it);
    if (kind === 'alts') panel.append(renderAlts(slot, v));
    if (kind === 'used') loadUsed(panel, slot, it);
    if (kind === 'history') historyBlock(it).then((node) => panel.append(node));
    if (kind === 'why') {
      panel.append(el('div.panel-title', 'Почему выбрана эта деталь — простыми словами'),
        el('ul.why-list', explainPart(slot.key, it, b.parts).map((t) => el('li', { class: t.startsWith('⚠') ? 'warn' : '' }, t.replace(/^⚠\s*/, '')))));
    }
    if (kind === 'reviews') {
      panel.append(el('div.row', el('div.spinner', { style: { width: '20px', height: '20px', borderWidth: '2px' } }), el('span.muted', 'Загружаем отзывы покупателей…')));
      reviewsPanel(it).then((node) => panel.replaceChildren(node));
    }
  }
  return row;
}

function togglePanel(slot, kind) {
  panels[slot] = panels[slot] === kind ? null : kind;
  justOpened = panels[slot] ? slot + ':' + kind : null;
  rerenderResults();
  justOpened = null;
}

function replacePart(slotKey, item, isSetup = false) {
  queueMicrotask(saveCustomParts);
  const v = current();
  if (!v || !v.build) return;
  const b = v.build;
  if (isSetup) {
    if (!b.setup) b.setup = {};
    if (!b.originalSetup) b.originalSetup = { ...b.setup };
    b.setup = { ...b.setup, [slotKey]: item };
    if (!item) delete b.setup[slotKey];
  } else {
    if (!b.original) b.original = { ...b.parts };
    b.parts = { ...b.parts, [slotKey]: item };
    // Выбранное вручную закрепляем: при пересборке оно останется
    if (item) pinPart(slotKey, item, true);
    else pinPart(slotKey, null, false);
  }
  panels[slotKey] = null;
  rerenderResults();
  toast(item ? (isSetup ? 'Добавлено в сетап' : 'Деталь заменена') : 'Убрано из сборки');
}

export function replaceFromSearch(item, slotKey, isSetup = false) {
  const v = current();
  if (!v || !v.build) return false;
  replacePart(slotKey, item, isSetup);
  return true;
}

/** Из поиска: объявление Kufar → в сборку (для комплектующих) или в сетап. */
export async function takeKufarToBuild(slotKey, u, isSetup = false) {
  const slot = isSetup ? SETUP_SLOTS.find((x) => x.key === slotKey) : SLOTS.find((x) => x.key === slotKey);
  if (!slot || !hasActiveBuild()) return false;
  await takeFromKufar(slot, u);
  return true;
}

export function hasActiveBuild() {
  const v = current();
  return !!(v && v.build);
}

// ------------------------------------------------------------------ панели

function relPerf(slotKey, item, cur) {
  if (!cur || !item.perf || !cur.perf) return null;
  const p = (a, b) => {
    const d = Math.round((a / b - 1) * 100);
    return d === 0 ? '±0%' : (d > 0 ? '+' : '') + d + '%';
  };
  if (slotKey === 'cpu') return `игры ${p(item.perf.gaming, cur.perf.gaming)}, многопоток ${p(item.perf.multi, cur.perf.multi)}`;
  if (slotKey === 'gpu') return `${item.perf.name}: производительность ${p(item.perf.score, cur.perf.score)}`;
  return null;
}

function altRow(slot, a, cur, onPick) {
  const it = a.item;
  const diff = cur ? it.price - cur.price : it.price;
  const note = relPerf(slot.key, it, cur) || a.perf || '';
  return el('div.alt',
    thumb(it.image, slot.icon),
    el('div',
      el('div.alt-name', el('a', { href: it.url, target: '_blank', rel: 'noopener' }, it.name)),
      el('div.alt-note', note, it.noname ? ' · малоизвестный бренд' : '', it.reviews ? ' ' : '', reviewChip(it))),
    el('div.alt-price', el('b', money.fmt(it.price)),
      cur ? el('span.diff', { class: diff > 0 ? 'up' : 'down' }, `${diff > 0 ? '+' : '−'}${money.fmt(Math.abs(diff))}`) : null),
    el('button.btn.btn-sm', { onclick: onPick }, cur ? 'Выбрать' : 'Добавить'));
}

function renderAlts(slot, v) {
  const b = v.build;
  const cur = slot.setup ? (b.setup || {})[slot.key] : b.parts[slot.key];
  const alts = altsOf(b, slot);
  const box = el('div');
  if (alts.length) {
    box.append(el('div.panel-title', slot.key === 'gpu' ? 'Другие видеокарты' : slot.setup ? 'Другие варианты с хорошими отзывами' : 'Совместимые альтернативы'),
      el('div.alt-list', alts.map((a) => altRow(slot, a, cur, () => replacePart(slot.key, a.item, slot.setup)))));
  }
  if (slot.key === 'gpu' && b.alternatives && b.alternatives.gpuSame && b.alternatives.gpuSame.length) {
    box.append(el('div.panel-title', { style: { marginTop: '12px' } }, 'Тот же чип у других производителей'),
      el('div.alt-list', b.alternatives.gpuSame.map((a) => altRow(slot, a, cur, () => replacePart(slot.key, a.item)))));
  }
  box.append(el('div.row', { style: { marginTop: '10px' } },
    el('button.btn.btn-sm.btn-ghost', {
      onclick: () => document.dispatchEvent(new CustomEvent('goto-search', { detail: { cat: slot.cat, slot: slot.key } })),
    }, icon('search'), 'Найти другую в поиске')));
  return box;
}

async function loadShops(panel, it) {
  panel.append(el('div.row', el('div.spinner', { style: { width: '20px', height: '20px', borderWidth: '2px' } }), el('span.muted', 'Загружаем предложения магазинов…')));
  try {
    const { offers } = await api('/api/offers?key=' + encodeURIComponent(it.id));
    const table = offersTable(offers, 15);
    const other = el('div', { style: { marginTop: '14px' } }, el('div.panel-title', 'Другие площадки'), el('div.muted.small', 'Ищем на Wildberries…'));
    loadOtherSites(other, it);
    panel.replaceChildren(
      el('div.panel-title', offers.length ? `${offers.length} ${plural(offers.length, 'предложение', 'предложения', 'предложений')} на Onliner (21vek, 5 элемент и сотни других магазинов)` : 'Сейчас нет предложений'),
      offers.length ? table : el('div.muted', 'Товар закончился в магазинах.'),
      it.usedCount ? el('div.ext-links', el('span.dim', 'Б/у на барахолке Onliner:'), el('a', { href: it.usedUrl, target: '_blank', rel: 'noopener' }, `${it.usedCount} ${plural(it.usedCount, 'объявление', 'объявления', 'объявлений')}${it.usedMin ? ` от ${money.fmt(it.usedMin)}` : ''} ↗`)) : null,
      other,
      el('div.ext-links', el('span.dim', 'Все цены:'), el('a', { href: it.pricesUrl || it.url, target: '_blank', rel: 'noopener' }, 'Onliner'),
        el('span.dim', { style: { marginLeft: '8px' } }, 'Искать в других магазинах:'),
        shopLinks().map((l) => el('a', { href: linkFor(l.url, searchName(it)), target: '_blank', rel: 'noopener' }, l.name))));
  } catch (e) {
    panel.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message)));
  }
}

/** Та же модель на Wildberries: оставляем объявления, где есть все «модельные» слова. */
async function loadOtherSites(box, it) {
  const q = searchName(it);
  try {
    const r = await api('/api/wb?q=' + encodeURIComponent(q));
    const tokens = q.toLowerCase().split(/[\s,()]+/).filter((w) => w.length >= 3 && /\d/.test(w));
    const same = r.items.filter((x) => tokens.every((t) => x.name.toLowerCase().replace(/\s+/g, ' ').includes(t))).sort((a, b) => a.price - b.price);
    if (r.blocked) {
      box.replaceChildren(el('div.panel-title', 'Другие площадки'),
        el('div.muted.small', 'Wildberries не ответил на автоматический запрос — откройте поиск на сайте: '),
        el('div.ext-links', el('a', { href: r.url, target: '_blank', rel: 'noopener' }, 'Wildberries ↗'),
          el('a', { href: linkFor('https://ozon.by/search/?text={q}', q), target: '_blank', rel: 'noopener' }, 'Ozon ↗'),
          el('a', { href: linkFor('https://aliexpress.ru/wholesale?SearchText={q}', q), target: '_blank', rel: 'noopener' }, 'AliExpress ↗')));
      return;
    }
    box.replaceChildren(el('div.panel-title', `Wildberries: ${same.length ? `${same.length} ${plural(same.length, 'предложение', 'предложения', 'предложений')} этой модели` : 'этой модели не нашлось'}`,
      el('a.link-btn', { href: r.url, target: '_blank', rel: 'noopener', style: { marginLeft: '10px' } }, 'поиск на Wildberries ↗')),
    same.length ? el('table.tbl', el('tbody', same.slice(0, 5).map((x) => el('tr',
      el('td', el('a', { href: x.url, target: '_blank', rel: 'noopener' }, x.name)),
      el('td', x.reviews ? `★ ${x.rating} (${x.reviews})` : '—'),
      el('td.num', el('b', money.fmt(x.price)), x.price < it.price ? el('span.diff.down', ` −${Math.round((1 - x.price / it.price) * 100)}%`) : null))))) : null);
  } catch (e) {
    box.replaceChildren(el('div.panel-title', 'Другие площадки'), el('div.muted.small', e.message));
  }
}

/** Короткое название модели для поиска на других сайтах. */
function searchName(it) {
  if (it.perf && it.perf.name && it.category === 'videocard') return it.perf.name;
  return it.name.replace(/\((BOX|OEM|MPK|Multipack)\)/gi, '').replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

function usedQuery(it) {
  if (it.category === 'videocard' && it.perf) return it.perf.name;
  if (it.category === 'cpu') return it.name.replace(/^(AMD|Intel)\s+/i, '').replace(/\(.*?\)/g, '').trim();
  // Для остальных: бренд + 2–3 слова модели без артикулов
  return it.name.replace(/\[[^\]]*\]|\([^)]*\)/g, '').split(/\s+/).filter((w) => !/^[A-Z0-9-]{9,}$/.test(w)).slice(0, 4).join(' ');
}

async function fetchUsed(it) {
  if (usedCache[it.id]) return usedCache[it.id];
  const kind = it.category === 'cpu' || it.category === 'videocard' ? it.category : 'other';
  const key = it.perf ? it.perf.key || '' : '';
  const q = usedQuery(it);
  const r = await api(`/api/used?kind=${kind}&key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&price=${it.price || ''}`);
  usedCache[it.id] = { items: r.items, total: r.total || r.items.length, url: r.url, market: r.market || null };
  return usedCache[it.id];
}

function kufarRow(slot, u, it, label = 'В сборку', onChange) {
  const row = el('div.alt', { class: isViewed(u) ? 'viewed' : '' },
    thumb(u.image, slot.icon),
    el('div',
      el('div.alt-name', adLink(u, u.name, () => row.classList.add('viewed'))),
      el('div.alt-note', [u.perf && u.perf.name ? u.perf.name : null, u.perf && u.perf.gaming && it && it.perf && it.perf.gaming ? `игры ${perfDiff(u.perf.gaming, it.perf.gaming)}` : null,
        u.perf && u.perf.score && it && it.perf && it.perf.score ? `мощность ${perfDiff(u.perf.score, it.perf.score)}` : null,
        u.condition, u.location].filter(Boolean).join(' · ')),
      el('div.row.wrap.ad-chips', adChips(u))),
    el('div.alt-price', el('b', money.fmt(u.price)), it && it.price ? savingTag(u.price, it.price) : null),
    el('div.row', { style: { gap: '6px' } },
      hideButton(u, onChange),
      el('a.btn.btn-sm.btn-ghost', { href: u.url, target: '_blank', rel: 'noopener', title: 'Открыть объявление', onclick: () => row.classList.add('viewed') }, icon('external')),
      el('button.btn.btn-sm', { onclick: (e) => takeFromKufar(slot, u, e.currentTarget) }, icon('plus'), label)));
  return row;
}

/** Список объявлений Kufar со скрытием и переключателем «Показать скрытые». */
function kufarList(slot, items, it, limit, note) {
  const box = el('div');
  let showHidden = false;
  const draw = () => {
    const visible = items.filter((u) => showHidden || !isHidden(u));
    const hidden = items.length - items.filter((u) => !isHidden(u)).length;
    box.replaceChildren(
      visible.length ? el('div.alt-list', visible.slice(0, limit).map((u) => kufarRow(slot, u, it, 'В сборку', draw))) : el('div.muted.small', 'Подходящих объявлений не нашлось.'),
      visible.length > limit && note ? el('div.dim.small', { style: { marginTop: '6px' } }, note(visible.length)) : null,
      hiddenToggle(hidden, showHidden, () => { showHidden = !showHidden; draw(); }));
  };
  draw();
  return box;
}

function perfDiff(a, b) {
  const d = Math.round((a / b - 1) * 100);
  return d === 0 ? '±0%' : (d > 0 ? '+' : '') + d + '%';
}

/** Взять объявление Kufar в сборку: получаем характеристики, заменяем и закрепляем деталь. */
async function takeFromKufar(slot, u, btn) {
  if (btn) btn.disabled = true;
  try {
    if (slot.setup) {
      replacePart(slot.key, { ...u, category: slot.cat }, true);
      return;
    }
    const { item } = await api('/api/kufar/enrich', { method: 'POST', body: { slot: slot.key, item: u } });
    replacePart(slot.key, item);
    pinPart(slot.key, item, true);
    toast('Деталь с Kufar добавлена и закреплена. Нажмите «Пересобрать остальное», чтобы подобрать остальное под неё.');
  } catch (e) {
    toast('Не удалось добавить: ' + e.message, 'err');
    if (btn) btn.disabled = false;
  }
}

/** Контекст совместимости для поиска на Kufar. */
function kufarCtx(b, slotKey) {
  const p = b.parts || {};
  const ctx = {};
  if (p.cpu && p.cpu.specs) ctx.socket = p.cpu.specs.socket;
  if (p.motherboard && p.motherboard.specs) {
    ctx.socket = ctx.socket || p.motherboard.specs.socket;
    ctx.mem = p.motherboard.specs.mem;
  }
  if (slotKey === 'psu') ctx.need = Compat.psuNeed(p.cpu, p.gpu, 0).rec;
  return ctx;
}

async function loadUsed(panel, slot, it) {
  const v = current();
  const b = v.build;
  panel.append(el('div.row', el('div.spinner', { style: { width: '20px', height: '20px', borderWidth: '2px' } }), el('span.muted', 'Ищем на Kufar…')));
  const q = usedQuery(it);
  const sameBox = el('div');
  const compBox = el('div', { style: { marginTop: '14px' } });
  // 1) Та же модель б/у
  const same = fetchUsed(it).then((r) => {
    if (!r.items.length) {
      sameBox.replaceChildren(el('div.panel-title', `Та же модель «${q}»`), el('div.muted.small', 'Объявлений этой модели дешевле нового не нашлось.'));
      return;
    }
    sameBox.replaceChildren(
      el('div.panel-title', `Та же модель «${q}» б/у: ${r.total}`, el('a.link-btn', { href: r.url, target: '_blank', rel: 'noopener', style: { marginLeft: '10px' } }, 'все на Kufar ↗')),
      r.market ? el('div.market-line', icon('tag'), `Обычная цена б/у: около ${money.fmt(r.market.median)} — половина объявлений от ${money.fmt(r.market.p25)} до ${money.fmt(r.market.p75)} (по ${r.market.n} объявлениям)`) : null,
      kufarList(slot, r.items, it, 10));
  }).catch((e) => sameBox.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message))));
  // 2) Совместимые варианты (тот же сокет / тип памяти / видеокарты близкой мощности)
  const comp = slot.setup ? Promise.resolve() : api('/api/kufar/compatible', { method: 'POST', body: { slot: slot.key, part: slimForApi(it), ctx: kufarCtx(b, slot.key) } }).then((r) => {
    const list = r.items.filter((u) => !(u.sameModel));
    compBox.replaceChildren(
      el('div.panel-title', `Совместимые на Kufar${r.criteria ? ` (${r.criteria})` : ''}: ${r.total.toLocaleString('ru-RU')} объявлений`,
        r.url ? el('a.link-btn', { href: r.url, target: '_blank', rel: 'noopener', style: { marginLeft: '10px' } }, 'все на Kufar ↗') : null),
      kufarList(slot, list, it, 15, (n) => `Показаны 15 самых дешёвых из ${n} подходящих. Остальные — по ссылке «все на Kufar».`));
  }).catch((e) => compBox.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message))));
  await Promise.allSettled([same, comp]);
  panel.replaceChildren(sameBox, slot.setup ? null : compBox,
    el('p.dim.small', 'Б/у покупайте с проверкой: тесты, отсутствие следов вскрытия, по возможности — с остатком гарантии. «В сборку» добавит объявление и закрепит деталь.'));
}

function slimForApi(it) {
  if (!it) return null;
  const { name, price, specs, perf } = it;
  return { name, price, specs, perf };
}

// ------------------------------------------------------------------ б/у сводка

function savingTag(used, fresh) {
  const pct = Math.round((1 - used / fresh) * 100);
  if (!fresh || pct < 1) return el('span.diff', 'как новая');
  return el('span.diff.down', `−${pct}%`);
}

function renderUsedSummary(v) {
  const card = el('div.card#usedSummary', el('h3', 'Б/у на Kufar'));
  const rows = [];
  for (const key of ['gpu', 'cpu']) {
    const it = v.build.parts[key];
    if (!it) continue;
    const items = usedCache[it.id] && usedCache[it.id].items;
    const label = key === 'gpu' ? 'Видеокарта' : 'Процессор';
    if (!items) rows.push(el('div.row.small', el('span.muted.grow', label), el('span.dim', 'ищем…')));
    else if (!items.length) rows.push(el('div.row.small', el('span.muted.grow', label), el('span.dim', 'не найдено')));
    else {
      const best = items[0];
      rows.push(el('div.row.small',
        el('span.muted.grow', label),
        el('a', { href: '#', onclick: (e) => { e.preventDefault(); panels[key] = 'used'; rerenderResults(); } }, `от ${money.fmt(best.price)}`),
        savingTag(best.price, it.price)));
    }
  }
  if (!rows.length) return null;
  card.append(el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, rows));
  card.append(el('p.dim.small', { style: { margin: '10px 0 0' } }, 'Самые дорогие детали выгоднее всего брать с рук. Цены — самые низкие объявления той же модели.'));
  return card;
}

async function prefetchUsed() {
  const v = current();
  if (!v || !v.build) return;
  const jobs = ['gpu', 'cpu'].map((k) => v.build.parts[k]).filter((it) => it && it.source === 'onliner').map((it) => fetchUsed(it).catch(() => (usedCache[it.id] = { items: [], total: 0 })));
  await Promise.all(jobs);
  const old = document.getElementById('usedSummary');
  const cur = current();
  if (old && cur && cur.build) {
    const fresh = renderUsedSummary(cur);
    if (fresh) old.replaceWith(fresh);
  }
}

// ------------------------------------------------------------------ сравнение и сохранение

function compareVariants() {
  const vs = state.result.variants.filter((v) => v.build);
  const head = el('tr', el('th', ''), vs.map((v) => el('th', v.label)));
  const rows = SLOTS.concat(SETUP_SLOTS).map((s) => {
    const src = (v) => (s.setup ? v.build.setup || {} : v.build.parts);
    if (!vs.some((v) => src(v)[s.key])) return null;
    return el('tr', el('td', el('b', s.label)), vs.map((v) => {
      const it = src(v)[s.key];
      return el('td', it ? [el('div', it.name), el('div.dim.small', money.fmt(it.price))] : el('span.dim', '—'));
    }));
  });
  const have = (state.lastBuildForm && state.lastBuildForm.have) || {};
  const idxRow = (label, fn) => el('tr', el('td', el('b', label)), vs.map((v) => el('td', fn(v))));
  const table = el('table.tbl.compare-table', el('thead', head), el('tbody', rows,
    idxRow('Итого', (v) => el('b', money.fmt(fullTotal(v.build)))),
    idxRow('Игровой индекс', (v) => String(Compat.indices(v.build.parts, have.gpu).gaming ?? '—')),
    idxRow('Рабочий индекс', (v) => String(Compat.indices(v.build.parts, have.gpu).work)),
    idxRow('Уровень', (v) => Compat.indices(v.build.parts, have.gpu).tier)));
  modal('Сравнение вариантов', el('div', { style: { overflowX: 'auto' } }, table));
}

async function saveCurrent(v) {
  const total = fullTotal(v.build);
  const name = await promptText('Сохранить сборку', 'Название', `${state.result.purposeLabel} за ${money.fmt(total, money.currency, { round: true })}`);
  if (!name) return;
  const parts = {};
  for (const s of SLOTS) parts[s.key] = slim(v.build.parts[s.key]);
  const setup = {};
  for (const [id, it] of Object.entries(v.build.setup || {})) if (it) setup[id] = slim(it);
  state.builds.unshift({
    id: Date.now().toString(36),
    name,
    date: new Date().toISOString(),
    purpose: state.result.purpose,
    purposeLabel: state.result.purposeLabel,
    total,
    parts,
    setup,
    have: (state.lastBuildForm && state.lastBuildForm.have) || {},
  });
  await saveBuilds();
  toast('Сборка сохранена в «Мои сборки»');
}

/** Открыть сохранённую сборку на этой странице. */
export function openSaved(saved) {
  state.result = {
    budget: saved.total,
    purpose: saved.purpose,
    purposeLabel: saved.purposeLabel || 'Сохранённая',
    variants: [{ id: 'saved', label: saved.name, hint: '', budget: saved.total, build: { parts: { ...saved.parts }, setup: { ...(saved.setup || {}) }, alternatives: {}, setupAlternatives: {}, index: Compat.indices(saved.parts, saved.have && saved.have.gpu) } }],
    warnings: [],
    stats: { ms: 0, cpus: 0, gpus: 0, boards: 0 },
  };
  state.lastBuildForm = { have: saved.have || {} };
  state.variant = 'saved';
  for (const k of Object.keys(panels)) delete panels[k];
  render();
}
