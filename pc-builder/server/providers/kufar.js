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
    exchange: !!param(ad, 'possible_exchange'),
    date: ad.list_time,
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
const JUNK = /куплю|комплект|сборк|(?:^|[^а-яё])пк(?:$|[^а-яё])|компьютер|ноутбук|коробк|нерабоч|не\s*рабоч|запчаст|под\s*ремонт|только\s*обмен|\+/i;

/**
 * Б/у предложения конкретной модели (для альтернатив в сборке).
 * kind: 'cpu' | 'videocard'; key — ключ из perfdb; newPrice — цена нового в BYN.
 */
async function usedFor(kind, key, query, newPrice) {
  const res = await search({ query, condition: 'used', size: 50 });
  const matcher = kind === 'cpu' ? perf.cpuKey : perf.gpuKey;
  const floor = newPrice ? newPrice * 0.2 : 1;
  const items = res.items.filter((it) => {
    if (!it.price || it.price < floor) return false;
    if (newPrice && it.price > newPrice * 1.05) return false;
    if (JUNK.test(it.name)) return false;
    return matcher(it.name) === key;
  });
  items.sort((a, b) => a.price - b.price);
  return items;
}

module.exports = { search, count, usedFor, ratesFromAds, CAT_COMPONENTS, CAT_COMPUTERS };
