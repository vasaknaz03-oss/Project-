'use strict';
// Kufar: объявления (в основном б/у) через публичный API поиска.

const { getJSON, qs } = require('../http');
const perf = require('../perfdb');

const API = 'https://api.kufar.by/search-api/v2/search/rendered-paginated';
const CAT_COMPONENTS = 16010; // Компьютерная техника → Комплектующие
const CAT_COMPUTERS = 16020; // Компьютеры / системные блоки

const SORTS = { price_asc: 'prc.a', price_desc: 'prc.d', new: 'lst.d' };

function param(ad, key) {
  const p = (ad.ad_parameters || []).find((x) => x.p === key);
  return p ? p.vl || p.v : null;
}

// Флаг из характеристик объявления («Да» / true)
function flag(ad, key) {
  const p = (ad.ad_parameters || []).find((x) => x.p === key);
  return !!p && (p.v === true || p.v === 1 || p.v === '1' || p.vl === 'Да');
}

function normalize(ad) {
  const img = ad.images && ad.images[0];
  const priceByn = ad.price_byn ? parseInt(ad.price_byn, 10) / 100 : 0;
  const area = param(ad, 'area');
  const region = param(ad, 'region');
  return {
    source: 'kufar',
    id: String(ad.ad_id),
    name: ad.subject,
    price: priceByn,
    priceUsd: ad.price_usd ? parseInt(ad.price_usd, 10) / 100 : null,
    url: ad.ad_link,
    image: img ? `https://rms.kufar.by/v1/list_thumbs_2x/${img.path}` : null,
    location: [area, region].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', '),
    condition: param(ad, 'condition') || '',
    componentType: param(ad, 'computers_component_type') || '',
    categoryName: param(ad, 'category') || '',
    company: !!ad.company_ad,
    // Характеристики из объявления (сокет, тип памяти и т. п.) — для проверки совместимости
    params: Object.fromEntries((ad.ad_parameters || []).filter((p) => p.pu && typeof p.v !== 'object').map((p) => [p.pu, { v: p.v, vl: p.vl }])),
    exchange: flag(ad, 'possible_exchange'),
    date: ad.list_time,
    seller: ((ad.account_parameters || []).find((p) => p.p === 'name') || {}).v || '',
    delivery: flag(ad, 'delivery_enabled'), // «Куфар Доставка»
    safedeal: flag(ad, 'safedeal_enabled'), // «Куфар Оплата» — безопасная сделка
    guarantee: flag(ad, 'shop_guarantee'),
    installment: flag(ad, 'installment_pro') || !!(ad.paid_services && ad.paid_services.halva),
  };
}

/** Курс из калькулятора цен Kufar (BYN за 1 единицу валюты). */
function ratesFromAds(ads) {
  const sums = {};
  for (const ad of ads || []) {
    const byn = (ad.calculator || []).find((c) => c.currency === 'BYN');
    if (!byn || !+byn.price) continue;
    for (const c of ad.calculator) {
      if (c.currency === 'BYN' || !+c.price) continue;
      (sums[c.currency] = sums[c.currency] || []).push(+byn.price / +c.price);
    }
  }
  const out = {};
  for (const [cur, arr] of Object.entries(sums)) {
    arr.sort((a, b) => a - b);
    out[cur] = arr[Math.floor(arr.length / 2)];
  }
  return out;
}

/**
 * Поиск объявлений.
 * opts: { query, cat, priceMin, priceMax (BYN), sort, condition: 'used'|'new'|'' , size }
 */
async function search(opts = {}) {
  const params = { lang: 'ru', size: Math.min(opts.size || 30, 50) };
  if (opts.query) params.query = opts.query;
  const cat = opts.cat === undefined ? CAT_COMPONENTS : opts.cat;
  if (cat) params.cat = cat;
  if (opts.parent) params.prn = opts.parent;
  Object.assign(params, opts.params || {});
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.sort && SORTS[opts.sort]) params.sort = SORTS[opts.sort];
  if (opts.priceMin || opts.priceMax) {
    const lo = Math.round((opts.priceMin || 0) * 100);
    const hi = opts.priceMax ? Math.round(opts.priceMax * 100) : '';
    params.prc = `r:${lo},${hi}`;
  }
  if (opts.condition === 'used') params.cnd = 1;
  if (opts.condition === 'new') params.cnd = 2;
  const data = await getJSON(`${API}?${qs(params)}`, { ttl: 5 * 60 * 1000 });
  const ads = (data.ads || []).filter((a) => a.type !== 'buy');
  const next = ((data.pagination && data.pagination.pages) || []).find((p) => p.label === 'next');
  return { items: ads.map(normalize), total: data.total || 0, rates: ratesFromAds(data.ads), next: next ? next.token : null };
}

/** Сколько объявлений подходит под условия. */
async function count(opts = {}) {
  const params = { lang: 'ru' };
  if (opts.query) params.query = opts.query;
  if (opts.cat) params.cat = opts.cat;
  if (opts.parent) params.prn = opts.parent;
  Object.assign(params, opts.params || {});
  const data = await getJSON(`https://api.kufar.by/search-api/v2/search/count?${qs(params)}`, { ttl: 2 * 60 * 1000 });
  return data.count || 0;
}

// Внимание: \b в JS не работает с кириллицей, поэтому границы слов заданы явно
const JUNK = /куплю|комплект|сборк|(?:^|[^а-яё])пк(?:$|[^а-яё])|компьютер|ноутбук|коробк|нерабоч|не\s*рабоч|запчаст|под\s*ремонт|только\s*обмен|\+|заброниров|продан[оа]?\b|деф+ект|неисправ|артефакт|(?:^|[^а-яёa-z])(cmp|смр)\s*\d|frankenstein|франкен/i;

/**
 * Б/у предложения конкретной модели (для альтернатив в сборке).
 * kind: 'cpu' | 'videocard'; key — ключ из perfdb; newPrice — цена нового в BYN.
 */
async function usedFor(kind, key, query, newPrice) {
  // Две страницы по 50 объявлений, чтобы не терять предложения
  const first = await search({ query, condition: 'used', size: 50 });
  let pool = first.items;
  if (first.next) {
    try {
      pool = pool.concat((await search({ query, condition: 'used', size: 50, cursor: first.next })).items);
    } catch {}
  }
  const matcher = kind === 'cpu' ? perf.cpuKey : perf.gpuKey;
  const floor = newPrice ? newPrice * 0.2 : 1;
  const items = pool.filter((it) => {
    if (!it.price || it.price < floor) return false;
    if (newPrice && it.price > newPrice * 1.05) return false;
    if (JUNK.test(it.name)) return false;
    return matcher(it.name) === key;
  });
  items.sort((a, b) => a.price - b.price);
  return items;
}

// Объявление сразу с несколькими моделями («Ryzen 5 5600, 3600, 2600», «RTX 3060 Ti и RTX 3060»):
// цена в нём относится к одной из них, для подбора и оценки рынка такие не годятся
function isMulti(name) {
  const n = String(name || '').toLowerCase();
  // Две и больше упоминаний модели: «RTX 3060 Ti и RTX 3060», «i5-9400F, i7-8700»
  const models = n.match(/(?:rtx|gtx|rx|gt|arc|ryzen\s*\d|i[3579])[\s-]*\d{3,5}/g) || [];
  if (models.length >= 2) return true;
  // Перечень номеров моделей: «5600, 3600, 2600, 2400G»
  const nums = new Set(n.match(/(?<![\d.])\d{4,5}(?!\d)/g) || []);
  return nums.size >= 3;
}

const isJunk = (name) => JUNK.test(name || '') || isMulti(name);

module.exports = { search, count, usedFor, ratesFromAds, isJunk, isMulti, CAT_COMPONENTS, CAT_COMPUTERS };
