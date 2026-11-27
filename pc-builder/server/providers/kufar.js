'use strict';
// Kufar: объявления (в основном б/у) через публичный API поиска.

const { getJSON, qs } = require('../http');
const perf = require('../perfdb');
const { parseSpecs } = require('../parsers');
const condition = require('../kufarCondition');

const API = 'https://api.kufar.by/search-api/v2/search/rendered-paginated';
const fullDescriptions = new WeakMap();
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
  const result = {
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
  const model = perf.gpuModel(result.name);
  if (String(result.params.cct?.v) === '11' || /видеокарт/i.test(result.componentType)
      || ((model.model || model.kind === 'mining') && !offTopic(result.name))) {
    result.gpu = classifyGpu(result, excerpt);
    result.risk = gpuRisk(result.risk, result.gpu);
  }
  if (fullText) fullDescriptions.set(result, fullText);
  return result;
}

/**
 * Модель видеокарты из объявления. Поле «чип» продавцы иногда заполняют неверно («GeForce 6600 GT»
 * с чипом «RTX 4070»), поэтому ему верим, только если номер модели из поля есть в названии
 * или в названии вообще нет номера модели.
 */
function classifyGpu(it, description) {
  const name = it.name || '';
  const title = perf.gpuModel(name);
  const chip = it.params?.ccvc?.vl || '';
  const field = perf.gpuModel(chip);
  const text = String(description || '');
  const modified = /(?<!без )(?<!не )(?<!не на )мобильн\p{L}*\s+(?:чип|gpu)|(?:чип|передел\p{L}*)\s+из\s+ноутбука/iu.test(text);
  const bad = { mobile: 'Мобильная видеокарта или переделка из ноутбука', mining: 'Специализированная карта для майнинга', fake: 'В объявлении указана подделка или переделка видеокарты' };
  const altered = /(?:^|[.!?\n])\s*(?:(?:это|видеокарта)\s+)?(?:фейк|подделка|реплика|франкенштейн)(?!\p{L})/iu.test(text);
  const invalid = bad[title.kind] ? title.kind : bad[field.kind] ? field.kind : modified ? 'mobile' : altered ? 'fake' : null;
  if (invalid) return { key: null, variant: null, issue: { level: 'blocked', reason: bad[invalid] }, specs: {} };
  if (title.kind === 'professional') return { key: null, variant: null, specs: {} };

  const nameKey = perf.gpuKey(name);
  const fieldKey = perf.gpuKey(chip);
  const num = (chip.match(/\d{3,4}/) || [])[0];
  const nums = name.match(/\d{3,4}/g) || [];
  const fallback = !title.model && (!num || !nums.length || nums.includes(num));
  const key = nameKey || (fallback ? fieldKey : null);
  const specs = parseSpecs('videocard', text, name);
  const titleRam = perf.gpuVram(name);
  const fieldRam = perf.gpuVram(String(it.params?.cdr?.vl || ''));
  const sizes = new Set([titleRam, fieldRam, specs.vramGb].filter(Boolean));
  const vramGb = sizes.size === 1 ? [...sizes][0] : null;
  const variant = perf.gpuVariantKey(key, vramGb);
  let reason;
  if (nameKey && field.model && title.model !== field.model) reason = 'Модель в заголовке и в характеристиках различается';
  else if (sizes.size > 1 || /\d\s*[/／]\s*\d{1,2}\s*(?:GB|ГБ|G)(?![\p{L}\d])/iu.test(name)) reason = 'В объявлении указан разный объём видеопамяти';
  else if (key && !variant) reason = 'Нужно уточнить объём видеопамяти этой версии';
  return { key, vramGb, variant, specs: { ...specs, vramGb }, issue: reason && { level: 'caution', reason } };
}

function adGpuInfo(it) {
  return cachedDetail(it)?.gpu || it.gpu || classifyGpu(it, it.description);
}

function adGpuKey(it) {
  return adGpuInfo(it).key;
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
async function usedFor(kind, key, query, newPrice, vramGb) {
  // Две страницы по 50 объявлений, чтобы не терять предложения
  const first = await search({ query, condition: 'used', size: 50 });
  let pool = first.items;
  if (first.next) {
    try {
      pool = pool.concat((await search({ query, condition: 'used', size: 50, cursor: first.next })).items);
    } catch {}
  }
  const variant = perf.gpuVariantKey(key, vramGb);
  const matches = (it) => {
    if (kind === 'cpu') return perf.cpuKey(it.name) === key;
    const gpu = adGpuInfo(it);
    return gpu.key === key && (!variant || gpu.variant === variant);
  };
  const floor = newPrice ? newPrice * 0.2 : 1;
  const items = pool.filter((it) => {
    if (!it.price || it.price < floor) return false;
    if (newPrice && it.price > newPrice * 1.05) return false;
    if (offTopic(it.name)) return false;
    return matches(it);
  });
  items.sort((a, b) => a.price - b.price);
  await inspect(items, { limit: 20 });
  return prioritize(items.filter(matches));
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
async function item(id, { fresh = false } = {}) {
  const data = await getJSON('https://api.kufar.by/search-api/v2/item/' + encodeURIComponent(id) + '/rendered', {
    ttl: fresh ? 0 : 10 * 60 * 1000, useRemote: !fresh, timeout: 5000, retries: 0,
  });
  return data && data.result ? normalize(data.result, true) : null;
}

const details = new Map();
const pendingDetails = new Map();
const stamp = (ad) => [ad.id, ad.date || '', ad.name || ''].join('|');

function cachedDetail(ad) {
  const entry = details.get(stamp(ad));
  return entry && entry.until > Date.now() ? entry : null;
}

function risk(ad, gpu = ad.gpu) {
  const entry = cachedDetail(ad);
  const direct = Object.hasOwn(ad, 'description');
  const assessment = ad.risk && (!ad.risk.until || ad.risk.until > Date.now()) ? ad.risk : condition.assess(ad.name);
  return gpuRisk(direct ? assessment : entry?.risk || assessment, direct ? gpu : entry?.gpu || gpu);
}

function forCompatibility(ad) {
  if (Object.hasOwn(ad, 'description')) return ad;
  const found = cachedDetail(ad)?.evidence;
  return { ...ad, description: found?.description || fullDescriptions.get(ad) || '', params: { ...ad.params, ...found?.params } };
}

function gpuRisk(base, gpu) {
  const issue = gpu?.issue;
  if (!issue || base.reasons.includes(issue.reason) || base.level === 'blocked') return base;
  return { ...base, level: issue.level, confidence: issue.level === 'blocked' ? 'high' : 'medium', reasons: [issue.reason, ...base.reasons] };
}

function enrichRisk(ad) {
  const gpu = cachedDetail(ad)?.gpu;
  if (gpu) ad.gpu = gpu;
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
    details.set(key, { until, risk: assessment, gpu: found?.gpu, evidence: found && { description: found.description, params: found.params } });
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
  const rank = (ad) => condition.order(ad.risk) + (ad.gpuPriceRisk && ad.risk.level === 'clear' ? 1.5 : 0);
  return ads.map(enrichRisk).sort((a, b) => rank(a) - rank(b));
}

function rejectBroken(ad) {
  const assessment = risk(ad);
  if (assessment.level === 'blocked') throw new Error(assessment.reasons[0]);
}

function verified(ad) {
  const state = risk(ad);
  return state.full && state.level === 'clear';
}

function requireVerified(ad) {
  rejectBroken(ad);
  if (!verified(ad)) throw new Error(risk(ad).reasons[0] || 'Работоспособность детали по описанию не подтверждена.');
}

module.exports = { adGpuInfo, adGpuKey, search, count, usedFor, ratesFromAds, isJunk, offTopic, isMulti, item, normalize, inspect, risk, prioritize, rejectBroken, forCompatibility, verified, requireVerified, CAT_COMPONENTS, CAT_COMPUTERS };
