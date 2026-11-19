// Страница «Ноутбук»: подбор ноутбука под бюджет и задачу.
import { el, icon, api, money, thumb, plural } from './util.js';
import { state } from './state.js';
import { watchButton } from './watch.js';

let root = null;
const F = { budget: 3000, currency: 'BYN', purpose: 'study', size: '', needOs: false };
let result = null;
let loading = false;
let error = null;

const PURPOSES = [
  { id: 'study', title: 'Учёба и офис', text: 'Документы, браузер, видео, долго от батареи', icon: 'book' },
  { id: 'gaming', title: 'Игры', text: 'Видеокарта и быстрый экран', icon: 'gamepad' },
  { id: 'work', title: 'Работа', text: 'Монтаж, код, графика: процессор и память', icon: 'film' },
];

export async function initLaptops(node) {
  root = node;
  try {
    const r = await api('/api/store/laptopForm');
    if (r.value && typeof r.value === 'object') Object.assign(F, r.value);
  } catch {}
  F.currency = state.settings.currency || F.currency;
  render();
}

export function rerenderLaptops() {
  if (root) render();
}

function save() {
  api('/api/store/laptopForm', { method: 'PUT', body: F }).catch(() => {});
}

function render() {
  root.replaceChildren(
    el('div.page-head', el('div',
      el('h1', 'Подбор ноутбука'),
      el('p', 'Бюджет и задача — программа разберёт характеристики ноутбуков в наличии на Onliner (процессор, видеокарта и её мощность, экран, память, батарея) и покажет самые выгодные.'))),
    el('div.card',
      el('div.purpose-grid', PURPOSES.map((p) => el('button.purpose', {
        type: 'button', class: F.purpose === p.id ? 'on' : '',
        onclick: () => { F.purpose = p.id; save(); render(); },
      }, icon(p.icon, 'p-ico'), el('div', el('b', p.title), el('span', p.text))))),
      el('div.row.wrap', { style: { marginTop: '16px', gap: '16px', alignItems: 'flex-end' } },
        el('div.field', el('label', 'Бюджет'),
          el('div.budget-input.small',
            el('input', { type: 'number', min: '600', step: '100', value: F.budget, oninput: (e) => { F.budget = +e.target.value; save(); }, onkeydown: (e) => e.key === 'Enter' && run() }),
            el('select.select', { onchange: (e) => { F.currency = e.target.value; save(); } },
              (state.rates ? state.rates.currencies : [{ code: 'BYN' }]).map((c) => el('option', { value: c.code, selected: c.code === F.currency }, c.code))))),
        el('div.field', el('label', 'Размер экрана'),
          el('div.seg', [['', 'Любой'], ['small', 'до 14"'], ['mid', '15–16"'], ['big', '17"+']].map(([v, l]) => el('button', {
            type: 'button', class: F.size === v ? 'on' : '', onclick: () => { F.size = v; save(); render(); },
          }, l)))),
        el('label.check', el('input', { type: 'checkbox', checked: F.needOs, onchange: (e) => { F.needOs = e.target.checked; save(); } }), 'Только с Windows / macOS'),
        el('button.btn.btn-primary.btn-lg', { disabled: loading, onclick: run }, icon('laptop'), loading ? 'Подбираем…' : 'Подобрать ноутбук'))),
    error ? el('div.notice.err', icon('error'), el('div', error)) : null,
    loading ? el('div.card.loading', el('div.spinner'), el('b', 'Смотрим ноутбуки в наличии…')) : null,
    result && !loading ? renderResult() : null);
}

async function run() {
  loading = true;
  error = null;
  render();
  try {
    result = await api('/api/laptops', { method: 'POST', body: F });
  } catch (e) {
    error = e.message;
    result = null;
  }
  loading = false;
  render();
}

function chips(s) {
  const out = [];
  const add = (t, cls) => t && out.push(el('span.chip', { class: cls || '' }, t));
  if (s.diag) add(`${s.diag}" ${s.resW && s.resH ? `${s.resW}×${s.resH}` : ''}`, 'accent');
  if (s.hz && s.hz > 60) add(`${s.hz} Гц`, s.hz >= 144 ? 'ok' : '');
  add(s.panel);
  add(s.cpu ? s.cpu.replace(/^(Intel|AMD)\s+/, '') : null);
  add(s.gpu ? `${s.gpu.replace(/^(NVIDIA|AMD|Intel)\s+(GeForce\s+)?/i, '')}${s.tgp ? ` · ${s.tgp} Вт` : ''}` : 'встроенная графика');
  if (s.ramGb) add(`${s.ramGb} ГБ ${s.ramType || ''}`);
  if (s.ssdGb) add(s.ssdGb >= 1000 ? `SSD ${s.ssdGb / 1000} ТБ` : `SSD ${s.ssdGb} ГБ`);
  if (s.battery) add(`батарея ${s.battery} Вт·ч`);
  if (s.os) add(s.os === 'нет' ? 'без ОС' : s.os, s.os === 'нет' ? 'warn' : '');
  return out;
}

function renderResult() {
  const r = result;
  if (!r.items.length) return el('div.notice', icon('info'), el('div', 'Под эти условия ноутбуков в наличии не нашлось — увеличьте бюджет или выберите «Любой» размер.'));
  const key = r.purpose === 'gaming' ? 'gaming' : 'work';
  return el('div',
    el('p.dim.small', { style: { margin: '14px 2px 8px' } }, `Просмотрено ${r.total} ${plural(r.total, 'ноутбук', 'ноутбука', 'ноутбуков')} в наличии. Сверху — лучшие по соотношению возможностей и цены для выбранной задачи.`),
    el('div.laptop-list', r.items.map((it, i) => el('div.card.laptop-card', { class: i === 0 ? 'best' : '' },
      thumb(it.image, 'laptop'),
      el('div.laptop-main',
        el('div.row.wrap', { style: { gap: '6px' } },
          i === 0 ? el('span.chip.ok', 'лучший выбор') : null,
          el('span.chip.accent', `${key === 'gaming' ? 'игры' : 'работа'} ${it.index[key]}`),
          it.reviews ? el('span.chip', `★ ${it.rating.toFixed(1)} · ${it.reviews} ${plural(it.reviews, 'отзыв', 'отзыва', 'отзывов')}`) : null),
        el('div.laptop-name', el('a', { href: it.url, target: '_blank', rel: 'noopener' }, it.name)),
        el('div.part-specs', chips(it.specs)),
        it.reasons.length ? el('div.dim.small', 'Плюсы: ' + it.reasons.join(', ')) : null),
      el('div.laptop-side',
        el('div.price', money.fmt(it.price)),
        it.offers ? el('div.price-sub', `${it.offers} ${plural(it.offers, 'предложение', 'предложения', 'предложений')}`) : null,
        watchButton(it, render))))),
    el('p.dim.small', 'Индексы примерные: та же шкала, что у ПК (RTX 4060 и Ryzen 5 5600 = 100). Мобильные видеокарты слабее настольных с тем же названием, сильнее всего влияет мощность (TGP).'));
}
