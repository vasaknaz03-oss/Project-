'use strict';
// Фильтры Kufar. Отдельного публичного API для их описания нет, поэтому берём то же описание,
// что сайт kufar.by показывает в своей панели фильтров (данные страницы списка объявлений).
// У каждой категории и каждого «Типа» внутри неё свой набор фильтров.

const { getText, getJSON, qs } = require('../http');
const store = require('../store');

// Страницы kufar.by запрашиваем по одной и не чаще раза в 1,5 с, а описание храним на диске 3 дня
const PAGE_GAP = 1500;
const DISK_TTL = 3 * 24 * 60 * 60 * 1000;
let chain = Promise.resolve();
let lastPage = 0;

function fetchPageSerial(url) {
  const job = chain.then(async () => {
    const wait = lastPage + PAGE_GAP - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await getText(url);
    } finally {
      lastPage = Date.now();
    }
  });
  chain = job.catch(() => {});
  return job;
}

const REGIONS = [
  ['7', 'Минск'], ['5', 'Минская область'], ['1', 'Брестская область'], ['6', 'Витебская область'],
  ['2', 'Гомельская область'], ['3', 'Гродненская область'], ['4', 'Могилевская область'],
];

// Служебные параметры, которые не являются фильтрами для покупателя
const SKIP = new Set([
  'category', 'parent_category', 'remuneration_type', 'shop_guarantee', 'photo_3d', 'ribbons', 'season', 'sell_out',
  'currency', 'multiregion_enabled', 'multiregion_regions', 'regular_price', 'content_video', 'only_with_content_video',
  'b2c_availability', 'domestic_register_number', 'trademark', 'shop_address', 'egr_date', 'contact_person',
  'commercial_register_number', 'commercial_register_date', 'domestic_register_date', 'company_number', 'company_address',
  'other_parameters', 'vat_number', 'egr_number', 'egr_authority', 'import_link', 'name', 'users_synonyms', 'web_shop_link',
]);
const BASIC = ['rgn', 'ar', 'prc', 'cnd', 'cmp'];
const BUY = ['dle', 'sde', 'hlv', 'pse', 'oph'];
const UI_OK = new Set(['select', 'select_chips', 'multiselect', 'multiselect_or', 'checkbox', 'new_checkbox', 'input_range', 'range']);

function label(x) {
  return (x.labels && x.labels.name && (x.labels.name.ru || x.labels.name.by)) || x.name;
}

/**
 * Описание фильтров для категории Kufar.
 * preset — уже выбранные параметры (тип раздела и выбранный пользователем тип), hide — что не показывать.
 */
async function facets(cat, preset = {}, hide = []) {
  const params = new URLSearchParams({ cat: String(cat) });
  for (const [k, v] of Object.entries(preset)) if (v !== undefined && v !== '') params.set(k, String(v));
  const url = `https://www.kufar.by/l/r~belarus?${params}`;
  const disk = store.get('kufarFacets') || {};
  const saved = disk[url];
  let state = saved && Date.now() - saved.t < DISK_TTL ? saved.state : null;
  if (!state) {
    try {
      const html = await fetchPageSerial(url);
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) throw new Error('Kufar: не удалось прочитать фильтры категории');
      const full = JSON.parse(m[1]).props.initialState;
      // Храним только нужное: описание фильтров и регионы
      state = { filters: { currentFilters: full.filters.currentFilters }, location: { regions: full.location.regions } };
      disk[url] = { t: Date.now(), state };
      const keys = Object.keys(disk);
      if (keys.length > 80) delete disk[keys[0]];
      store.set('kufarFacets', disk);
    } catch (e) {
      if (saved) state = saved.state; // старое описание лучше, чем ничего
      else return facetsFromAds(cat, preset, hide);
    }
  }
  return build(cat, state, preset, hide);
}

function build(cat, state, preset, hide) {
  const defs = (state.filters && state.filters.currentFilters) || [];
  const regions = (state.location && state.location.regions) || {};

  const regionList = Object.entries(regions)
    .filter(([id]) => id !== 'default')
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
    .map(([id, r]) => ({ id, name: r.labels.ru }));
  const areasBy = {};
  for (const [id, r] of Object.entries(regions)) {
    if (id === 'default') continue;
    areasBy[id] = Object.entries(r.areas || {})
      .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
      .map(([aid, a]) => ({ id: aid, name: a.labels.ru }));
  }

  const items = [];
  let typeParam = null;
  for (const x of defs) {
    if (SKIP.has(x.name) || hide.includes(x.url_name)) continue;
    const ui = x.ui_component && x.ui_component.type;
    const id = x.url_name;
    if (x.name === 'region') {
      items.push({ id: 'rgn', type: 'dictionary', single: true, name: 'Регион', values: regionList });
      continue;
    }
    if (x.name === 'area') {
      items.push({ id: 'ar', type: 'dictionary', name: 'Город / район', dependsOn: 'rgn', valuesBy: areasBy, values: [] });
      continue;
    }
    if (!ui || !UI_OK.has(ui)) continue;
    if (ui === 'input_range' || ui === 'range') {
      items.push({ id, type: 'number_range', name: label(x), unit: x.name === 'price' ? 'р.' : '', ratio: 1, kufarPrice: x.name === 'price' });
      continue;
    }
    if (x.type === 'bool') {
      // «Продавец: частное лицо / компания» — выбор из двух, а не галочка
      if (ui === 'select_chips' && (x.values || []).length > 1) {
        items.push({ id, type: 'dictionary', single: true, name: label(x), values: x.values.map((v) => ({ id: String(v.value), name: v.labels ? v.labels.ru : String(v.value) })) });
      } else items.push({ id, type: 'boolean', boolType: 'checkbox', name: label(x) });
      continue;
    }
    const values = (x.values || []).map((v) => ({ id: String(v.value), name: v.labels ? v.labels.ru : String(v.value) }));
    if (!values.length) continue;
    const item = { id, type: 'dictionary', name: label(x), values, single: !/^multiselect/.test(ui) };
    if (x.is_type) {
      item.isType = true;
      typeParam = id;
    }
    items.push(item);
  }

  const pick = (pred) => items.filter(pred);
  const typeItems = pick((i) => i.isType);
  const groups = [
    { id: 'general', title: 'Основные', items: [...typeItems, ...BASIC.map((k) => items.find((i) => i.id === k)).filter(Boolean)] },
    { id: 'specs', title: 'Характеристики', items: pick((i) => !i.isType && !BASIC.includes(i.id) && !BUY.includes(i.id)) },
    { id: 'buy', title: 'Покупка и доставка', items: BUY.map((k) => items.find((i) => i.id === k)).filter(Boolean) },
  ].filter((g) => g.items.length);
  return { source: 'kufar', cat, typeParam, groups };
}

/**
 * Запасной вариант, если kufar.by не отдал страницу: собираем фильтры из характеристик объявлений
 * (обычный API поиска). Значения — только те, что встретились в объявлениях.
 */
async function facetsFromAds(cat, preset, hide) {
  const base = { lang: 'ru', size: 50, cat: String(cat), ...preset };
  const data = await getJSON(`https://api.kufar.by/search-api/v2/search/rendered-paginated?${qs(base)}`, { ttl: 30 * 60 * 1000 });
  const SERVICE = new Set(['cat', 'rgn', 'ar', 'prc', 'cnd', 'rtr', 'dle', 'sde', 'hlv', 'pse', 'oph', 'cmp', 'trd', 'rprc', 'mle', 'mlr', 'sg', 'thph', 'rbs', 'so', 'b2c', 'cnvi', 'cp', 'sa', 'ca', 'cn', 'vn', 'en', 'ea', 'ed', 'drn', 'drd', 'crn', 'crde', 'il', 'nme', 'usn', 'wsl', 'othp', 'cur', 'season']);
  const found = new Map();
  for (const ad of data.ads || []) {
    for (const p of ad.ad_parameters || []) {
      if (!p.pu || SERVICE.has(p.pu) || hide.includes(p.pu) || typeof p.v === 'object' || p.vl === '' || p.vl == null) continue;
      if (!found.has(p.pu)) found.set(p.pu, { name: p.pl, values: new Map(), bool: typeof p.v === 'boolean' });
      found.get(p.pu).values.set(String(p.v), p.vl);
    }
  }
  const specs = [];
  for (const [id, f] of found) {
    if (f.bool) specs.push({ id, type: 'boolean', boolType: 'checkbox', name: f.name });
    else specs.push({ id, type: 'dictionary', name: f.name, values: [...f.values].map(([v, n]) => ({ id: v, name: n })).sort((a, b) => a.name.localeCompare(b.name, 'ru')) });
  }
  const groups = [
    { id: 'general', title: 'Основные', items: [
      { id: 'rgn', type: 'dictionary', single: true, name: 'Регион', values: REGIONS.map(([id, name]) => ({ id, name })) },
      { id: 'prc', type: 'number_range', name: 'Цена', unit: 'р.', ratio: 1, kufarPrice: true },
      { id: 'cnd', type: 'dictionary', single: true, name: 'Состояние', values: [{ id: '2', name: 'Новое' }, { id: '1', name: 'Б/у' }] },
    ] },
    { id: 'specs', title: 'Характеристики', items: specs },
    { id: 'buy', title: 'Покупка и доставка', items: [
      { id: 'dle', type: 'boolean', boolType: 'checkbox', name: 'Товары с Куфар Доставкой' },
      { id: 'sde', type: 'boolean', boolType: 'checkbox', name: 'Товары с Куфар Оплатой' },
      { id: 'pse', type: 'boolean', boolType: 'checkbox', name: 'Возможен обмен' },
    ] },
  ].filter((g) => g.items.length);
  return { source: 'kufar', cat, typeParam: null, groups, partial: true };
}

/** Фильтры интерфейса → параметры поиска Kufar. */
function toParams(filters) {
  const out = {};
  for (const [k, v] of Object.entries(filters || {})) {
    if (Array.isArray(v)) {
      if (!v.length) continue;
      out[k] = v.length > 1 ? 'v.or:' + v.join(',') : v[0];
    } else if (v && typeof v === 'object') {
      const kop = k === 'prc'; // цена у Kufar — в копейках
      const f = v.from !== undefined && v.from !== '' ? Math.round(Number(v.from) * (kop ? 100 : 1)) : '';
      const t = v.to !== undefined && v.to !== '' ? Math.round(Number(v.to) * (kop ? 100 : 1)) : '';
      // Открытый диапазон («от 5000», «до 30») Kufar отвергает с ошибкой 422 — подставляем крайние значения
      if (f !== '' || t !== '') out[k] = `r:${f === '' ? 0 : f},${t === '' ? 99999999 : t}`;
    } else if (v === 1) out[k] = '1';
  }
  return out;
}

module.exports = { facets, facetsFromAds, toParams };
