'use strict';
// Kufar: объявления (в основном б/у) через публичный API поиска.

const { getJSON, qs } = require('../http');
const perf = require('../perfdb');
const condition = require('../kufarCondition');

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

function normalize(ad, detail = false) {
  const img = ad.images && ad.images[0];
  const priceByn = ad.price_byn ? parseInt(ad.price_byn, 10) / 100 : 0;
  const area = param(ad, 'area');
  const region = param(ad, 'region');
  const fullText = condition.plain(ad.body || ad.ad_body || ad.description);
  const excerpt = fullText || condition.plain(ad.body_short);
  return {
    source: 'kufar',
    id: String(ad.ad_id),
    name: ad.subject,
    risk: condition.assess(ad.subject, excerpt, !!fullText),
    ...(detail ? { description: fullText } : {}),
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

/**
 * Модель видеокарты из объявления. Поле «чип» продавцы иногда заполняют неверно («GeForce 6600 GT»
 * с чипом «RTX 4070»), поэтому ему верим, только если номер модели из поля есть в названии
 * или в названии вообще нет номера модели.
 */
function adGpuKey(it) {
  const byName = perf.gpuKey(it.name || '');
  if (byName) return byName;
  const p = it.params && it.params.ccvc;
  const chip = p ? String(p.vl || '') : '';
  const key = chip && perf.gpuKey(chip);
  if (!key) return null;
  const num = (chip.match(/\d{3,4}/) || [])[0];
  const nums = String(it.name || '').match(/\d{3,4}/g) || [];
  if (num && nums.length && !nums.includes(num)) return null;
  return key;
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
  const params = { lang: 'ru', size: Math.min(opts.size || 30, 200) };
  if (opts.query) params.query = opts.query;
  const cat = opts.cat === undefined ? CAT_COMPONENTS : opts.cat;
  if (cat) params.cat = cat;
  if (opts.parent) params.prn = opts.parent;
  Object.assign(params, opts.params || {});
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.sort && SORTS[opts.sort]) params.sort = SORTS[opts.sort];
  if (opts.priceMin || opts.priceMax) {
    // Kufar больше не принимает открытый диапазон «r:5000,» (ошибка 422) — верхняя граница нужна всегда
    const lo = Math.round((opts.priceMin || 0) * 100);
    const hi = opts.priceMax ? Math.round(opts.priceMax * 100) : 99999999;
    params.prc = `r:${lo},${hi}`;
  }
  if (opts.condition === 'used') params.cnd = 1;
  if (opts.condition === 'new') params.cnd = 2;
  const data = await getJSON(`${API}?${qs(params)}`, { ttl: opts.noCache ? 0 : 5 * 60 * 1000 });
  const ads = (data.ads || []).filter((a) => a.type !== 'buy');
  const next = ((data.pagination && data.pagination.pages) || []).find((p) => p.label === 'next');
  return { items: ads.map((ad) => normalize(ad)), total: data.total || 0, rates: ratesFromAds(data.ads), next: next ? next.token : null };
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
const OTHER = /куплю|сборк|(?:^|[^а-яё])пк(?:$|[^а-яё])|компьютер|ноутбук|коробк|только\s*обмен|\+|заброниров|продан[оа]?(?![а-яё])|(?:^|[^а-яёa-z])(cmp|смр)\s*\d|frankenstein|франкен/i;

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
    if (offTopic(it.name)) return false;
    return matcher(it.name) === key;
  });
  items.sort((a, b) => a.price - b.price);
  await inspect(items, { limit: 20 });
  return prioritize(items);
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

const offTopic = (name) => OTHER.test(name || '') || isMulti(name);
const isJunk = (name) => offTopic(name) || condition.assess(name).level === 'blocked';

/** Одно объявление по номеру (для ссылок вида kufar.by/item/123). */
async function item(id) {
  const data = await getJSON('https://api.kufar.by/search-api/v2/item/' + encodeURIComponent(id) + '/rendered', { ttl: 10 * 60 * 1000, timeout: 5000, retries: 0 });
  return data && data.result ? normalize(data.result, true) : null;
}

const details = new Map();
const pendingDetails = new Map();
const stamp = (ad) => [ad.id, ad.date || '', ad.name || ''].join('|');

function cachedDetail(ad) {
  const entry = details.get(stamp(ad));
  return entry && entry.until > Date.now() ? entry : null;
}

function risk(ad) {
  const entry = cachedDetail(ad);
  if (entry?.risk) return entry.risk;
  if (ad.risk && (!ad.risk.until || ad.risk.until > Date.now())) return ad.risk;
  return condition.assess(ad.name);
}

function enrichRisk(ad) {
  ad.risk = risk(ad);
  if (ad.risk.level !== 'clear') {
    ad.best = false;
    delete ad.market;
  }
  return ad;
}

function detailRisk(ad) {
  const key = stamp(ad);
  if (pendingDetails.has(key)) return pendingDetails.get(key);
  const query = item(ad.id).catch(() => null).then((found) => {
    const until = Date.now() + (found?.risk.full ? 10 * 60 * 1000 : 90 * 1000);
    const assessment = found && (found.risk.full || found.risk.level !== 'unknown') ? { ...found.risk, until } : null;
    details.set(key, { until, risk: assessment });
    if (details.size > 1200) details.delete(details.keys().next().value);
  }).finally(() => pendingDetails.delete(key));
  pendingDetails.set(key, query);
  return query;
}

// У индекса тысячи объявлений. Подгружаем карточки порциями, не задерживая выдачу целиком.
async function inspect(ads, { limit = 16, timeout = 4000 } = {}) {
  const queue = ads.filter((ad) => {
    const r = risk(ad);
    return /^\d{1,16}$/.test(ad.id) && !r.full && r.level !== 'blocked' && !cachedDetail(ad);
  }).slice(0, limit);
  if (queue.length) {
    let stopped = false;
    let timer;
    const work = async () => {
      while (!stopped && queue.length) await detailRisk(queue.shift());
    };
    try {
      await Promise.race([
        Promise.all(Array.from({ length: Math.min(4, queue.length) }, work)),
        new Promise((resolve) => { timer = setTimeout(resolve, timeout); }),
      ]);
    } finally {
      stopped = true;
      clearTimeout(timer);
    }
  }
  return ads.map(enrichRisk);
}

function prioritize(ads) {
  return ads.map(enrichRisk).sort((a, b) => condition.order(a.risk) - condition.order(b.risk));
}

function rejectBroken(ad) {
  const assessment = risk(ad);
  if (assessment.level === 'blocked') throw new Error(assessment.reasons[0]);
}

module.exports = { adGpuKey, search, count, usedFor, ratesFromAds, isJunk, offTopic, isMulti, item, normalize, inspect, risk, prioritize, rejectBroken, CAT_COMPONENTS, CAT_COMPUTERS };
