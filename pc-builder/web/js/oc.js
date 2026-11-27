// Раздел «Разгон»: данные о реальной сборке, документация и поиск материалов.
import { el, icon, api, copyText, toast } from './util.js';
import { newsCards } from './news.js';
import { state } from './state.js';
import { BIOS, FOCUS, GOALS, FIELDS, GUIDES, SOURCES, cleanProfile, partsForProfile, importProfile, memoOf, timingNs, timingsAt } from './ocdata.js';

const TABS = [
  ['memo', 'Моя сборка', 'check'],
  ['bios', 'BIOS по производителям', 'board'],
  ['calc', 'Калькулятор таймингов', 'ram'],
  ['guides', 'Гайды', 'book'],
  ['links', 'Материалы и инструменты', 'external'],
];

const TOOLS = [
  SOURCES.hwinfo,
  SOURCES.memtest,
  ['ZenTimings · просмотр настроек памяти AMD', 'https://zentimings.protonrom.com/'],
  ['OCCT · тестирование', 'https://www.ocbase.com/'],
  ['Cinebench · замер производительности процессора', 'https://www.maxon.net/en/cinebench'],
];

let root;
let tab = 'memo';
let vendorSel;
let profile = {};
let touched = false;
let fresh = null;
let freshLoading = false;
const calc = {};
const search = { q: '', shown: '', items: [], loading: false };

export function initOc(node) {
  root = node;
  api('/api/store/ocProfile').then(({ value }) => {
    if (touched) return;
    profile = cleanProfile(value);
    if (!root.hidden && tab === 'memo') render();
  }).catch(() => {});
}

export function rerenderOc() {
  if (root) render();
}

const link = ([label, href]) => el('a', { href, target: '_blank', rel: 'noopener' }, label);
const links = (sources) => el('p.dim.small', sources.map((source, i) => [i ? ' · ' : '', link(source)]));

function render() {
  root.replaceChildren(
    el('div.page-head', el('div', el('h1', 'Разгон и настройка'),
      el('p', 'Заполните данные сборки и сверьте возможности деталей с документацией производителей.'))),
    el('div.oc-tabs', TABS.map(([id, label, ic]) => el('button.oc-tab', {
      class: tab === id ? 'on' : '', type: 'button',
      onclick: () => { tab = id; render(); },
    }, icon(ic), label))),
    el('div.oc-view', { 'data-tab': tab }, { memo: memoView, bios: biosView, calc: calcView, guides: guidesView, links: linksView }[tab]()));
}

function currentParts() {
  return state.result?.variants?.find((variant) => variant.id === state.variant)?.build?.parts || {};
}

function guideCard(guide) {
  return el('div.oc-block', el('h3', guide.title), el('p', guide.text),
    el('p', el('b', 'Граница применения. '), guide.boundary), links(guide.sources));
}

function memoView() {
  const imported = partsForProfile(currentParts());
  const status = el('div.small', { role: 'status' });
  const recap = el('div');
  function updateRecap() {
    const m = memoOf(profile);
    recap.replaceChildren(
      el('div.oc-block',
        el('h3', m.missing.length ? 'Что ещё нужно уточнить' : 'Данные для проверки собраны'),
        m.missing.length ? el('p.small', m.missing.join(', ') + '.') : null,
        el('p.small', 'Числовые настройки требуют источника и документированного предела для точной модели и версии BIOS. Пока сверяйте штатные параметры по руководствам.'),
        m.vendor ? links(m.vendor.example ? [m.vendor.support, m.vendor.example] : [m.vendor.support]) : null),
      el('div.oc-blocks', m.guides.map(guideCard)));
  }
  function set(key, value) {
    profile[key] = value;
    touched = true;
    status.textContent = '';
    updateRecap();
  }
  const field = (key) => {
    const [label, hint] = FIELDS[key];
    const id = 'oc-profile-' + key;
    return el('div.field', el('label', { for: id }, label),
      el('input.input', { id, type: 'text', maxlength: '240', value: profile[key] || '', 'aria-describedby': id + '-hint',
        oninput: (e) => set(key, e.target.value) }),
      el('div.dim.small', { id: id + '-hint' }, hint));
  };
  const select = (key, label, choices) => {
    const id = 'oc-profile-' + key;
    return el('div.field', el('label', { for: id }, label),
      el('select.select', { id, onchange: (e) => set(key, e.target.value) },
        el('option', { value: '', selected: !profile[key] }, 'Выберите'),
        Object.entries(choices).map(([value, name]) => el('option', { value, selected: value === profile[key] }, name))));
  };
  async function save() {
    const saved = cleanProfile(profile);
    try {
      await api('/api/store/ocProfile', { method: 'PUT', body: saved });
      status.textContent = 'Данные сохранены на этом устройстве.';
    } catch (error) {
      status.textContent = error.message;
    }
  }
  async function copy() {
    const m = memoOf(profile);
    const supplied = Object.entries(FIELDS).flatMap(([key, [label]]) => m.profile[key] ? [label + ' — ' + m.profile[key]] : []);
    const references = [...new Map(m.guides.flatMap((guide) => guide.sources).concat(m.vendor ? [m.vendor.support] : []).map((source) => [source[1], source])).values()];
    const text = ['Моя сборка', ...supplied,
      m.profile.focus ? 'Настройка — ' + FOCUS[m.profile.focus] : '', m.profile.goal ? 'Цель — ' + GOALS[m.profile.goal] : '',
      m.missing.length ? 'Уточнить — ' + m.missing.join(', ') : '',
      ...references.map(([label, url]) => label + ' — ' + url)].filter(Boolean).join('\n');
    await copyText(text);
    toast('Данные сборки скопированы');
  }

  updateRecap();
  return el('div.card.oc-section',
    el('h2', icon('check'), ' Моя сборка'),
    el('div.row.wrap',
      el('button.btn.btn-sm', { type: 'button', disabled: !Object.keys(imported).length,
        onclick: () => { profile = importProfile(profile, currentParts()); touched = true; render(); } }, icon('download'), 'Подставить детали из выбранной сборки')),
    el('p.dim.small', 'Если состав сборки изменился, подстановка очищает прежние ручные данные о прошивке, памяти и замерах.'),
    el('div.memo-pick', select('focus', 'Что хотите настроить', FOCUS), select('goal', 'Цель', GOALS)),
    el('h3', 'Комплектующие и настройки'),
    el('div.calc-grid', ['cpu', 'motherboard', 'boardRev', 'bios', 'ramName', 'ram', 'ramLayout', 'ramIcs', 'gpu', 'gpuDriver', 'cooler', 'psu', 'chassis', 'profile'].map(field)),
    el('h3', 'Замеры и стабильность'),
    el('div.calc-grid', ['cpuIdle', 'cpuLoad', 'gpuIdle', 'gpuLoad', 'gpuHotspot', 'test'].map(field)),
    el('div.row.wrap',
      el('button.btn.btn-primary.btn-sm', { type: 'button', onclick: save }, 'Сохранить данные'),
      el('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: copy }, icon('copy'), 'Скопировать памятку'),
      status),
    recap);
}

function biosView() {
  const selected = BIOS.find(({ id }) => id === vendorSel) || memoOf(profile).vendor;
  return el('div.card.oc-section',
    el('h2', icon('board'), ' BIOS по производителям'),
    el('p.oc-intro', 'Покрытие неполное: меню, функции и способы восстановления различаются по платам, ревизиям и версиям BIOS. Руководства ниже помогут найти инструкцию к своей модели.'),
    el('div.vendor-chips', BIOS.map((v) => el('button.chip.toggle-chip', { type: 'button', class: v === selected ? 'on' : '',
      onclick: () => { vendorSel = v.id; render(); } }, v.name))),
    selected ? links(selected.example ? [selected.support, selected.example] : [selected.support]) : null,
    el('p.dim.small', 'Если вашего бренда здесь нет, ищите страницу поддержки по маркировке на плате. Для готового компьютера откройте поддержку производителя ПК.'));
}

function calcView() {
  const inputs = [['mts', 'Исходная скорость, МТ/с'], ['cl', 'CL'], ['trcd', 'tRCD'], ['trp', 'tRP'], ['tras', 'tRAS'], ['trfc', 'tRFC'], ['target', 'Скорость для пересчёта, МТ/с']];
  const out = el('div.calc-out');
  const number = (v) => Number(String(v || '').trim().replace(',', '.'));
  const ns = (v) => v.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  function update() {
    const mts = number(calc.mts);
    const target = number(calc.target);
    const rows = inputs.slice(1, -1).flatMap(([key, label]) => {
      const value = number(calc[key]);
      const latency = timingNs(value, mts);
      if (latency === null) return [];
      const cycles = timingsAt(value, mts, target);
      return [el('tr', el('th', { scope: 'row' }, label), el('td', ns(latency) + ' нс'), el('td', cycles === null ? '—' : cycles + ' тактов'))];
    });
    out.replaceChildren(rows.length
      ? el('table.tbl.oc-table', el('thead', el('tr', ['Параметр', 'Задержка', 'Та же задержка при пересчёте'].map((label) => el('th', { scope: 'col' }, label)))), el('tbody', rows))
      : el('p.dim.small', 'Введите исходную скорость и хотя бы один тайминг.'));
  }
  const fields = inputs.map(([key, label]) => {
    const id = 'oc-calc-' + key;
    return el('div.field', el('label', { for: id }, label),
      el('input.input', { id, type: 'text', inputmode: 'decimal', value: calc[key] || '', maxlength: '12',
        oninput: (e) => { calc[key] = e.target.value; update(); } }));
  });
  update();
  return el('div.card.oc-section',
    el('h2', icon('ram'), ' Калькулятор таймингов памяти'),
    el('p.oc-intro', 'Переводит введённые тайминги из тактов в наносекунды и сохраняет ту же задержку при пересчёте. Применимость значений нужно проверять по данным комплекта и платы.'),
    el('div.calc-grid', fields), out, links([SOURCES.xmp, SOURCES.memory]));
}

function guidesView() {
  return el('div.card.oc-section', el('h2', icon('book'), ' Гайды и пределы'),
    el('div.oc-blocks', GUIDES.map(guideCard)));
}

function searchCard() {
  const input = el('input.input', { type: 'search', value: search.q, placeholder: 'Модель детали или тема',
    'aria-label': 'Модель детали или тема', oninput: (e) => { search.q = e.target.value; },
    onkeydown: (e) => { if (e.key === 'Enter') go(); } });
  async function go() {
    const q = search.q.trim();
    if (!q) return;
    search.shown = q;
    search.loading = true;
    render();
    try {
      const { items } = await api('/api/oc/search?q=' + encodeURIComponent(q));
      if (search.shown === q) search.items = items || [];
    } catch {
      if (search.shown === q) search.items = [];
    }
    if (search.shown === q) search.loading = false;
    if (tab === 'links') render();
  }
  return el('div.card.oc-search',
    el('h2', 'Поиск материалов'),
    el('p.dim.small', 'Статьи и обсуждения передают опыт авторов. Пределы для своей модели сверяйте с документацией производителя.'),
    el('div.row', el('div.search-input', icon('search'), input), el('button.btn.btn-primary', { type: 'button', onclick: go }, 'Искать')),
    !search.shown ? null : search.loading ? el('p.muted', 'Ищем материалы…')
      : search.items.length ? newsCards(search.items.slice(0, 16), { compact: true }) : el('p.muted', 'В открытых лентах ничего не нашлось.'));
}

function linksView() {
  if (!fresh && !freshLoading) {
    freshLoading = true;
    api('/api/news?topic=oc').then(({ items }) => { fresh = items || []; }).catch(() => { fresh = []; })
      .finally(() => { freshLoading = false; if (tab === 'links') render(); });
  }
  return el('div', searchCard(), el('div.card', el('h2', 'Инструменты'), links(TOOLS)),
    el('div.card', el('h2', 'Свежие материалы'),
      !fresh ? el('p.muted', 'Загружаем…') : fresh.length ? newsCards(fresh.slice(0, 12), { compact: true }) : el('p.muted', 'Свежих материалов пока нет.')));
}
