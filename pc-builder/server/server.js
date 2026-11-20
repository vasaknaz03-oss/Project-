'use strict';
// Локальный HTTP-сервер: отдаёт интерфейс и API. Слушает только 127.0.0.1.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const onliner = require('./providers/onliner');
const kufar = require('./providers/kufar');
const currency = require('./currency');
const builder = require('./builder');
const filters = require('./filters');
const store = require('./store');
const { clearCache } = require('./http');

const WEB_DIR = path.join(__dirname, '..', 'web');
const VERSION = require('../package.json').version;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

const Catalog = require('../web/catalog');
const kufarFilters = require('./providers/kufarFilters');
const kufarCompat = require('./kufarCompat');
const wb = require('./providers/wildberries');
const market = require('./market');
const reviews = require('./reviews');
const kufarIndex = require('./kufarIndex');
const secrets = require('./secrets');
const telegram = require('./telegram');
const query = require('./query');
const watch = require('./watch');

// Возможности оболочки Electron (автозапуск, работа в фоне); в режиме браузера их нет
let appHooks = null;
function setAppHooks(h) {
  appHooks = h;
}
const PC_SCHEMAS = new Set(Object.keys(onliner.CATEGORIES));

/** Раздел каталога по id (или категории Onliner — для подбора). */
function sectionOf(cat) {
  if (!cat) return null;
  if (Catalog.byId[cat]) return Catalog.byId[cat];
  if (Catalog.ONLINER_SCHEMAS.has(cat)) return { id: cat, onliner: cat };
  return null;
}
const STORE_KEYS = new Set(['builds', 'settings', 'lastForm', 'kufarMarks', 'upgradeForm', 'laptopForm']);

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Слишком большой запрос'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('Некорректный JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(WEB_DIR, rel));
  if (!file.startsWith(WEB_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  });
}

const num = (v) => (v === undefined || v === null || v === '' || isNaN(+v) ? undefined : +v);

const ONLINER_SORT = { price_asc: 'price:asc', price_desc: 'price:desc', rating: 'rating:desc' };

/** Фильтры Onliner из параметра f (JSON). */
function parseFilters(p) {
  const raw = p.get('f');
  if (!raw || raw.length > 8000) return {};
  try {
    return filters.sanitize(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function searchOnliner(q, p) {
  const cat = p.get('cat') || '';
  const page = num(p.get('page')) || 1;
  const min = num(p.get('min'));
  const max = num(p.get('max'));
  const sort = p.get('sort') || '';
  const section = sectionOf(cat);
  if (section && section.onliner && q) return searchOnlinerText(section, q, p);
  if (section && section.onliner) {
    const f = parseFilters(p);
    const base = { order: ONLINER_SORT[sort] || (q ? undefined : 'rating:desc'), price: { from: min, to: max }, ...(section.onlinerPreset || {}) };
    if (q) base.query = q;
    if (section.onliner === 'fan' && !q && !f.type_fan) base.type_fan = ['cpu', 'syslcp'];
    const params = filters.merge(base, f);
    if (!params) return { items: [], total: 0, pages: 0 };
    const r = await onliner.categoryPage(section.onliner, params, page);
    return { items: r.items, total: r.total, pages: r.pages };
  }
  if (!q) return { items: [], total: 0, pages: 0 };
  const r = await onliner.search(q, page);
  let items = r.items;
  // Только то, что относится к компьютерам и сетапу (без телевизоров, холодильников и т. п.)
  if (p.get('onlyPc') !== '0') items = items.filter((it) => Catalog.ONLINER_SCHEMAS.has(it.category));
  if (min !== undefined) items = items.filter((it) => it.price && it.price >= min);
  if (max !== undefined) items = items.filter((it) => it.price && it.price <= max);
  if (sort === 'price_asc') items.sort((a, b) => (a.price || 1e9) - (b.price || 1e9));
  if (sort === 'price_desc') items.sort((a, b) => (b.price || 0) - (a.price || 0));
  if (sort === 'rating') items.sort((a, b) => b.rating - a.rating);
  return { items, total: r.total, pages: r.pages };
}

// Каталог Onliner внутри категории текстовый запрос не принимает, поэтому поиск по словам
// идёт через общий поиск Onliner с уточняющим словом раздела, а с фильтрами — по категории
// с отбором по словам в названии и описании.
const ONLINER_HINT = {
  cpu: 'процессор', videocard: 'видеокарта', motherboard: 'материнская плата', dram: 'оперативная память', ssd: 'ssd',
  hdd: 'жесткий диск', powersupply: 'блок питания', chassis: 'корпус', fan: 'охлаждение', soundcard: 'звуковая карта',
  desktoppc: 'компьютер', notebook: 'ноутбук', notebatteries: 'аккумулятор ноутбука', laptopstand: 'подставка для ноутбука',
  display: 'монитор', wallmount: 'кронштейн', keyboards: 'клавиатура', mouse: 'мышь', mousepad: 'коврик', headphones: 'наушники',
  microphones: 'микрофон', webcams: 'веб-камера', sound: 'колонки', controllers: 'геймпад', tablets: 'графический планшет',
  usbhub: 'usb хаб', externalhdd: 'внешний диск', office_chair: 'кресло', table: 'стол', desk_lamp: 'настольная лампа',
  wrouter: 'роутер', wirelessadapter: 'wi-fi адаптер', ups: 'ибп', voltageregulator: 'сетевой фильтр',
};
const PER_PAGE = 30;
const norm = (x) => String(x || '').toLowerCase().replace(/ё/g, 'е');
const words = (q) => norm(q).split(/[\s,;]+/).filter(Boolean);
function textMatches(it, toks) {
  const n = query.normalize(it.name + ' ' + (it.description || ''));
  const flat = n.replace(/[\s\-_]/g, '');
  return toks.every((t) => n.includes(t) || flat.includes(t.replace(/[\s\-_]/g, '')));
}

async function searchOnlinerText(section, q, p) {
  const schema = section.onliner;
  const page = num(p.get('page')) || 1;
  const min = num(p.get('min'));
  const max = num(p.get('max'));
  const sort = p.get('sort') || '';
  const f = parseFilters(p);
  const toks = words(query.normalize(q));
  let items;
  let capped = false;

  if (Object.keys(f).length || section.onlinerPreset) {
    // Есть фильтры: ищем в категории с фильтрами, бренд из запроса превращаем в фильтр производителя
    let rest = toks;
    const base = { order: ONLINER_SORT[sort] || 'rating:desc', price: { from: min, to: max }, ...(section.onlinerPreset || {}) };
    if (!f.mfr) {
      try {
        const meta = await filters.facets(schema);
        const mfr = meta.groups.flatMap((g) => g.items).find((i) => i.id === 'mfr');
        const hit = mfr && mfr.values.filter((v) => toks.includes(norm(v.name)) || (norm(v.name).includes(' ') && norm(q).includes(norm(v.name))));
        if (hit && hit.length) {
          base.mfr = hit.map((v) => v.id);
          const names = hit.map((v) => norm(v.name));
          rest = toks.filter((t) => !names.some((n) => n.split(' ').includes(t)));
        }
      } catch {}
    }
    const params = filters.merge(base, f);
    if (!params) return { items: [], total: 0, pages: 0 };
    const first = await onliner.categoryPage(schema, params, 1);
    const last = Math.min(first.pages, 10);
    capped = first.pages > 10;
    const more = await Promise.all(Array.from({ length: Math.max(0, last - 1) }, (_, i) => onliner.categoryPage(schema, params, i + 2).catch(() => ({ items: [] }))));
    items = first.items.concat(...more.map((x) => x.items)).filter((it) => textMatches(it, rest));
  } else {
    // Без фильтров: общий поиск Onliner со словом раздела, только товары этого раздела
    const hint = ONLINER_HINT[schema] || norm(section.name);
    const query = toks.some((t) => norm(hint).includes(t)) ? q : `${q} ${hint}`;
    const get = (qq) => Promise.all([1, 2, 3, 4].map((pg) => onliner.search(qq, pg, 50).catch(() => ({ items: [] }))));
    let pages = await get(query);
    items = pages.flatMap((x) => x.items).filter((it) => it.category === schema);
    if (items.length < 5 && query !== q) {
      pages = await get(q);
      items = items.concat(pages.flatMap((x) => x.items).filter((it) => it.category === schema));
    }
    const seen = new Set();
    items = items.filter((it) => (seen.has(it.id) ? false : seen.add(it.id)));
    if (min !== undefined) items = items.filter((it) => it.price && it.price >= min);
    if (max !== undefined) items = items.filter((it) => it.price && it.price <= max);
    if (sort === 'price_asc') items.sort((a, b) => (a.price || 1e9) - (b.price || 1e9));
    if (sort === 'price_desc') items.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  // Товары в наличии — первыми (порядок внутри групп сохраняется)
  if (!sort || sort === 'rating') items = items.filter((it) => it.price).concat(items.filter((it) => !it.price));
  const total = items.length;
  return { items: items.slice((page - 1) * PER_PAGE, page * PER_PAGE), total, pages: Math.ceil(total / PER_PAGE), capped };
}

/**
 * План покупки: в каком одном магазине (или паре магазинов) есть вся сборка и сколько это стоит
 * по сравнению с покупкой каждой детали там, где она дешевле всего.
 */
async function shopsPlan(items) {
  const offersBy = {};
  await Promise.all(items.map(async (it) => {
    try {
      offersBy[it.id] = await onliner.offers(it.id);
    } catch {
      offersBy[it.id] = [];
    }
  }));
  const shops = {};
  let piecewise = 0;
  const cheapestShops = new Set();
  for (const it of items) {
    const offers = offersBy[it.id];
    if (!offers.length) continue;
    piecewise += offers[0].price;
    cheapestShops.add(offers[0].shopId);
    for (const o of offers) {
      const sh = (shops[o.shopId] = shops[o.shopId] || { shopId: o.shopId, shop: o.shop, url: o.shopUrl, rating: o.rating, reviews: o.reviews, town: o.town, prices: {}, installment: null, delivery: null });
      if (!(it.id in sh.prices) || o.price < sh.prices[it.id]) sh.prices[it.id] = o.price;
      if (o.installment && !sh.installment) sh.installment = o.installment;
      if (o.delivery && !sh.delivery) sh.delivery = o.delivery;
    }
  }
  const ids = items.filter((it) => offersBy[it.id].length).map((it) => it.id);
  const sum = (sh) => ids.reduce((s, id) => s + (sh.prices[id] || 0), 0);
  const all = Object.values(shops);
  const single = all.filter((sh) => ids.every((id) => id in sh.prices)).map((sh) => ({ ...sh, total: Math.round(sum(sh) * 100) / 100 }))
    .sort((a, b) => a.total - b.total).slice(0, 6);
  // Пары магазинов: берём магазины с наибольшим охватом сборки
  const top = all.sort((a, b) => Object.keys(b.prices).length - Object.keys(a.prices).length).slice(0, 25);
  const pairs = [];
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const a = top[i];
      const b = top[j];
      if (!ids.every((id) => id in a.prices || id in b.prices)) continue;
      const assign = {};
      let total = 0;
      for (const id of ids) {
        const pa = a.prices[id];
        const pb = b.prices[id];
        const useA = pb === undefined || (pa !== undefined && pa <= pb);
        assign[id] = useA ? a.shopId : b.shopId;
        total += useA ? pa : pb;
      }
      if (Object.values(assign).every((x) => x === a.shopId) || Object.values(assign).every((x) => x === b.shopId)) continue;
      pairs.push({ shops: [a, b].map(({ prices, ...rest }) => rest), total: Math.round(total * 100) / 100, assign });
    }
  }
  pairs.sort((x, y) => x.total - y.total);
  // Если всей сборки нет ни в одном магазине: где больше всего деталей сразу
  const names = Object.fromEntries(items.map((it) => [it.id, it.name]));
  const coverage = all.map((sh) => {
    const have = ids.filter((id) => id in sh.prices);
    return { ...sh, prices: undefined, has: have.length, total: Math.round(have.reduce((a, id) => a + sh.prices[id], 0) * 100) / 100, missing: ids.filter((id) => !(id in sh.prices)).map((id) => names[id]) };
  }).filter((x) => x.has >= 2).sort((a, b) => b.has - a.has || a.total - b.total).slice(0, 3);
  return {
    coverage,
    count: ids.length,
    missing: items.filter((it) => !offersBy[it.id].length).map((it) => it.name),
    piecewise: { total: Math.round(piecewise * 100) / 100, shops: cheapestShops.size },
    single,
    pairs: pairs.slice(0, 3),
  };
}

// Категория Onliner → слот сборки
const SLOT_OF_SCHEMA = { cpu: 'cpu', videocard: 'gpu', motherboard: 'motherboard', dram: 'ram', ssd: 'ssd', hdd: 'hdd', powersupply: 'psu', chassis: 'case', fan: 'cooler' };
// «Тип» объявления Kufar (cct) → слот
const SLOT_OF_CCT = { 10: 'cpu', 11: 'gpu', 7: 'motherboard', 9: 'ram', 15: 'ssd', 13: 'hdd', 5: 'psu', 1: 'case', 3: 'cooler' };

/** Название из адреса страницы магазина: «…/videokarta-asus-dual-rtx-4060-8gb/» → «videokarta asus dual rtx 4060 8gb». */
function nameFromUrl(u) {
  try {
    const parts = new URL(u).pathname.split('/').filter(Boolean);
    const slug = parts.sort((a, b) => b.length - a.length)[0] || '';
    return decodeURIComponent(slug).replace(/\.(html?|php)$/i, '').replace(/[-_]+/g, ' ').replace(/\b\d{5,}\b/g, '')
      .replace(/([a-z])(\d)/gi, '$1 $2').replace(/(\d)([a-z]{3,})/gi, '$1 $2').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

/** Разбор списка ссылок и названий в детали сборки. */
async function partsFromLinks(text) {
  const lines = text.split(/\n|\s+(?=https?:\/\/)/).map((x) => x.trim()).filter(Boolean).slice(0, 20);
  const items = [];
  const unknown = [];
  for (const line of lines) {
    const url = (line.match(/https?:\/\/\S+/) || [])[0];
    try {
      if (url && /catalog\.onliner\.by\//.test(url)) {
        const m = url.match(/catalog\.onliner\.by\/([\w-]+)\/(?:[\w-]+\/)?([\w.-]+?)(?:[/?#]|$)/);
        const schema = m && m[1];
        const it = m && await onliner.product(m[2], schema).catch((e) => {
          if (e.status === 404) throw new Error('товар по этой ссылке на Onliner не найден');
          throw e;
        });
        const slot = SLOT_OF_SCHEMA[schema] || (Catalog.setupById[schema] ? schema : null);
        if (it && slot) items.push({ slot, setup: !SLOT_OF_SCHEMA[schema], item: it, from: 'onliner' });
        else unknown.push({ line, guess: it ? it.name : '', reason: 'Этот товар Onliner не из комплектующих ПК' });
        continue;
      }
      if (url && /kufar\.by\/item\/(\d+)/.test(url)) {
        const id = url.match(/kufar\.by\/item\/(\d+)/)[1];
        const ad = await kufar.item(id);
        const cct = ad && ad.params && ad.params.cct ? Number(ad.params.cct.v) : null;
        const slot = SLOT_OF_CCT[cct];
        if (ad && slot) items.push({ slot, item: await kufarCompat.enrich(slot, ad), from: 'kufar' });
        else unknown.push({ line, guess: ad ? ad.name : '', price: ad ? ad.price : null, reason: 'Не понял, что это за деталь — выберите тип вручную' });
        continue;
      }
      // Другой магазин или просто название модели: ищем такую же модель в каталоге Onliner
      const name = url ? nameFromUrl(url) : line;
      let hit = null;
      // 1) Умный поиск: понимает раздел и характеристики («2x16GB DDR5 6000» → память DDR5 32 ГБ)
      const parsed = name ? await query.parse(name).catch(() => null) : null;
      const sec = parsed && sectionOf(parsed.section);
      // Слова с цифрами (модель, мощность, объём) должны совпасть в названии товара — иначе это «похожая» модель
      const digitWords = query.normalize(name).trim().split(' ').filter((w) => w.length > 1 && /\d/.test(w));
      const exact = (x) => digitWords.every((w) => query.normalize(x.name).includes(w));
      let approx = false;
      if (sec && SLOT_OF_SCHEMA[sec.onliner] && parsed.rest) {
        const r = await searchOnlinerText(sec, parsed.rest, new URLSearchParams({ f: JSON.stringify(parsed.filters || {}) })).catch(() => null);
        const list = r ? r.items : [];
        hit = list.find((x) => exact(x) && x.price) || list.find(exact) || null;
        if (!hit && list.length) {
          hit = list.find((x) => x.price) || list[0];
          approx = true;
        }
      }
      // 2) Общий поиск Onliner: совпасть должны все слова с цифрами (модель, объём)
      if (!hit && name) {
        const found = await onliner.search(name).catch(() => ({ items: [] }));
        const words = query.normalize(name).trim().split(' ').filter((w) => w.length > 1 && /\d/.test(w));
        hit = found.items.find((x) => SLOT_OF_SCHEMA[x.category] && words.length && words.every((w) => query.normalize(`${x.name} ${x.description || ''}`).includes(w)));
        approx = false;
      }
      if (hit) {
        const it = await onliner.product(hit.id, hit.category).catch(() => hit);
        // Ссылка на другой магазин: цена там своя — её спросим у пользователя (подставим цену Onliner, если есть)
        items.push({ slot: SLOT_OF_SCHEMA[hit.category], item: url ? { ...it, shopUrl: url } : it, from: url ? 'shop' : 'name', url: url || null, approx, needPrice: !!url || !it.price });
      }
      else unknown.push({ line, guess: name, reason: url ? 'Магазин не из каталога Onliner: укажите тип и цену' : 'Такую модель в каталоге Onliner не нашёл' });
    } catch (e) {
      unknown.push({ line, guess: url ? nameFromUrl(url) : line, reason: 'Не удалось открыть: ' + e.message });
    }
  }
  return { items, unknown };
}

/** Параметры поиска Kufar для раздела: категория, тип, фильтры пользователя, запасной текстовый запрос. */
function kufarQuery(section, q, p) {
  const f = kufarFilters.toParams(parseFilters(p));
  if (section && section.kufar) {
    return { query: q || undefined, cat: section.kufar.cat, params: { ...(section.kufar.p || {}), ...f } };
  }
  if (section) {
    return { query: q || section.kufarQuery || section.name || '', cat: null, params: f };
  }
  // Все разделы: ищем по всей «Компьютерной технике»
  return { query: q || undefined, cat: null, parent: 16000, params: f };
}

/** «Сначала выгодные» на Kufar: по всем объявлениям поиска, а не по одной странице. */
async function kufarValuePage(kq, p, sectionId) {
  const ix = kufarIndex.ensure({
    ...kq, priceMin: num(p.get('min')), priceMax: num(p.get('max')), condition: p.get('cond') || '',
  });
  // Пока полного списка ещё нет — дождёмся хотя бы первой порции, чтобы не показывать пустоту
  if (!ix.items.size && ix.scanning) {
    await Promise.race([ix.scanning, new Promise((r) => setTimeout(r, 8000))]);
    const t0 = Date.now();
    while (!ix.items.size && ix.scanning && Date.now() - t0 < 6000) await new Promise((r) => setTimeout(r, 300));
  }
  const all = kufarIndex.list(ix);
  for (const it of all) it.best = false;
  if (sectionId) await market.annotate(all, sectionId);
  const ranked = market.rankByValue(all, sectionId || '');
  const per = 50;
  const page = Math.max(1, num(p.get('page')) || 1);
  return {
    items: ranked.slice((page - 1) * per, page * per), total: ix.total || ranked.length,
    pages: Math.max(1, Math.ceil(ranked.length / per)), next: null, index: kufarIndex.status(ix),
  };
}

async function route(req, res, url) {
  const p = url.searchParams;
  const pathname = url.pathname;

  if (pathname === '/api/info') {
    return send(res, 200, { version: VERSION, dataDir: store.dataDir(), categories: onliner.CATEGORIES, desktop: !!appHooks, platform: process.platform });
  }

  // ---------------- ключи внешних сервисов и Telegram
  if (pathname === '/api/secrets' && req.method === 'GET') return send(res, 200, secrets.masked());
  if (pathname === '/api/secrets' && req.method === 'POST') {
    const body = await readBody(req);
    // Telegram подключается отдельным шагом (с проверкой токена)
    const { anthropicKey, youtubeKey } = body || {};
    const patch = {};
    if (anthropicKey !== undefined) patch.anthropicKey = anthropicKey;
    if (youtubeKey !== undefined) patch.youtubeKey = youtubeKey;
    return send(res, 200, secrets.set(patch));
  }
  if (pathname === '/api/telegram/connect' && req.method === 'POST') {
    const body = await readBody(req);
    return send(res, 200, await telegram.connect(body.token));
  }
  if (pathname === '/api/telegram/link' && req.method === 'POST') return send(res, 200, await telegram.link());
  if (pathname === '/api/telegram/test' && req.method === 'POST') {
    await telegram.send('🔔 Проверка: уведомления ПодборПК приходят на этот телефон.');
    return send(res, 200, { ok: true });
  }
  if (pathname === '/api/telegram/disconnect' && req.method === 'POST') {
    telegram.disconnect();
    return send(res, 200, secrets.masked());
  }

  // ---------------- слежение за ценами и поисками Kufar
  if (pathname === '/api/watch' && req.method === 'GET') return send(res, 200, watch.summary());
  if (pathname === '/api/watch/item' && req.method === 'POST') {
    const body = await readBody(req);
    return send(res, 200, { item: watch.addItem(body.item) });
  }
  if (pathname === '/api/watch/item' && req.method === 'DELETE') {
    watch.removeItem(String(p.get('id') || ''));
    return send(res, 200, { ok: true });
  }
  if (pathname === '/api/watch/target' && req.method === 'POST') {
    const body = await readBody(req);
    return send(res, 200, { item: watch.setTarget(String(body.id || ''), body.target) });
  }
  if (pathname === '/api/watch/search' && req.method === 'POST') {
    const body = await readBody(req);
    return send(res, 200, { search: await watch.addSearch(body) });
  }
  if (pathname === '/api/watch/search' && req.method === 'DELETE') {
    watch.removeSearch(String(p.get('id') || ''));
    return send(res, 200, { ok: true });
  }
  if (pathname === '/api/watch/check' && req.method === 'POST') return send(res, 200, await watch.check({ force: true }));
  if (pathname === '/api/watch/read' && req.method === 'POST') {
    const body = await readBody(req);
    watch.markRead(Array.isArray(body.ids) ? body.ids.map(String) : null);
    return send(res, 200, { ok: true });
  }
  if (pathname === '/api/watch/events' && req.method === 'DELETE') {
    watch.clearEvents();
    return send(res, 200, { ok: true });
  }

  // ---------------- автозапуск и работа в фоне (только в программе, не в браузере)
  if (pathname === '/api/app') {
    if (!appHooks) return send(res, 200, { desktop: false });
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (typeof body.autostart === 'boolean') appHooks.setAutostart(body.autostart);
      if (body.testNotification) appHooks.notify({ title: 'ПодборПК', body: 'Уведомления работают: так будут приходить сообщения о ценах и объявлениях.' });
    }
    return send(res, 200, { desktop: true, autostart: appHooks.getAutostart() });
  }

  if (pathname === '/api/rates') {
    return send(res, 200, await currency.getRates(p.get('force') === '1'));
  }

  if (pathname === '/api/build' && req.method === 'POST') {
    const body = await readBody(req);
    const rates = await currency.getRates();
    const cur = body.currency || 'BYN';
    const rate = rates.rates[cur];
    if (!rate) throw new Error('Неизвестная валюта: ' + cur);
    const budgetByn = Number(body.budget) * rate;
    if (!(budgetByn >= 100)) throw new Error('Слишком маленький бюджет: нужно хотя бы 100 BYN');
    if (budgetByn > 200000) throw new Error('Слишком большой бюджет для автоматического подбора (больше 200 000 BYN)');
    const result = await builder.build({ ...body, budgetByn });
    result.currency = cur;
    result.rate = rate;
    result.ratesSource = rates.source;
    return send(res, 200, result);
  }

  // Новости о компьютерах (RSS сайтов)
  if (pathname === '/api/news') {
    const src = (p.get('src') || '').replace(/[^\w-]/g, '').slice(0, 30);
    const topic = (p.get('topic') || '').replace(/[^\w-]/g, '').slice(0, 30);
    return send(res, 200, await require('./news').list({ src, topic, q: (p.get('q') || '').slice(0, 100) }));
  }

  // Подбор ноутбука под бюджет
  if (pathname === '/api/laptops' && req.method === 'POST') {
    const body = await readBody(req);
    const rates = await currency.getRates();
    const rate = rates.rates[body.currency || 'BYN'];
    if (!rate) throw new Error('Неизвестная валюта');
    return send(res, 200, await require('./laptops').pick({ ...body, budgetByn: Number(body.budget) * rate }));
  }

  // Апгрейд своего ПК
  if (pathname === '/api/upgrade' && req.method === 'POST') {
    const body = await readBody(req);
    const rates = await currency.getRates();
    const rate = rates.rates[body.currency || 'BYN'];
    if (!rate) throw new Error('Неизвестная валюта');
    return send(res, 200, await builder.upgrade({ ...body, budgetByn: Number(body.budget) * rate }));
  }

  // Вариант «новое + б/у» (процессор и видеокарта могут быть с Kufar)
  if (pathname === '/api/build/hybrid' && req.method === 'POST') {
    const body = await readBody(req);
    const rates = await currency.getRates();
    const rate = rates.rates[body.currency || 'BYN'];
    if (!rate) throw new Error('Неизвестная валюта');
    const budgetByn = Number(body.budget) * rate;
    if (!(budgetByn >= 300) || budgetByn > 200000) return send(res, 200, { none: true, reason: 'Для этого бюджета вариант с б/у не считается.' });
    return send(res, 200, await builder.hybrid({ ...body, budgetByn }));
  }

  // Wildberries: цены за пределами Onliner (может быть недоступен — тогда только ссылка)
  if (pathname === '/api/wb') {
    const q = (p.get('q') || '').trim().slice(0, 200);
    if (!q) throw new Error('Пустой запрос');
    return send(res, 200, await wb.search(q));
  }

  if (pathname === '/api/search') {
    const q0 = (p.get('q') || '').trim().slice(0, 200);
    const src = p.get('src') || 'onliner';
    // Умный поиск: понимаем раздел и характеристики из запроса («ssd 512 gb» → SSD, объём 512 ГБ)
    if (q0 && src !== 'wb' && p.get('smart') !== '0') {
      const smart = await query.parse(q0, p.get('cat') || null).catch(() => null);
      const sec = smart && sectionOf(smart.section);
      if (sec && (src === 'kufar' ? sec.kufar || sec.kufarQuery : sec.onliner)) {
        const p2 = new URLSearchParams(p);
        p2.set('cat', smart.section);
        p2.set('smart', '0');
        let r;
        if (src === 'onliner') {
          p2.set('f', JSON.stringify({ ...smart.filters, ...parseFilters(p) }));
          r = smart.rest ? await searchOnlinerText(sec, smart.rest, p2) : await searchOnliner('', p2);
        } else {
          const kq = kufarQuery(sec, query.kufarText(q0), p2);
          if (p.get('sort') === 'value') {
            const r2 = await kufarValuePage(kq, p, sec.id);
            return send(res, 200, { ...r2, smart: { section: smart.section, chips: smart.chips, filters: {}, rest: smart.rest } });
          }
          const kr = await kufar.search({
            ...kq, priceMin: num(p.get('min')), priceMax: num(p.get('max')), sort: p.get('sort') === 'rating' ? '' : p.get('sort'),
            condition: p.get('cond') || '', size: 50, cursor: (p.get('cursor') || '').slice(0, 400) || undefined,
          });
          await market.annotate(kr.items, sec.id);
          r = { items: kr.items, total: kr.total, pages: 1, next: kr.next };
        }
        return send(res, 200, { ...r, smart: { section: smart.section, chips: smart.chips, filters: src === 'onliner' ? smart.filters : {}, rest: smart.rest } });
      }
    }
    const q = q0;
    if (src === 'wb') {
      const section = sectionOf(p.get('cat'));
      const query = q || (section ? section.name : '');
      if (!query) return send(res, 200, { items: [], total: 0, pages: 0 });
      const r = await wb.search(query, { page: num(p.get('page')) || 1 });
      let items = r.items;
      const min = num(p.get('min'));
      const max = num(p.get('max'));
      if (min !== undefined) items = items.filter((it) => it.price >= min);
      if (max !== undefined) items = items.filter((it) => it.price <= max);
      if (p.get('sort') === 'price_asc') items.sort((a, b) => a.price - b.price);
      if (p.get('sort') === 'price_desc') items.sort((a, b) => b.price - a.price);
      return send(res, 200, { items, total: items.length, pages: r.blocked ? 0 : 5, blocked: r.blocked, url: r.url });
    }
    if (src === 'kufar') {
      const section = sectionOf(p.get('cat'));
      const kq = kufarQuery(section, q, p);
      if (p.get('sort') === 'value') return send(res, 200, await kufarValuePage(kq, p, section ? section.id : ''));
      const r = await kufar.search({
        ...kq, priceMin: num(p.get('min')), priceMax: num(p.get('max')), sort: p.get('sort') === 'rating' ? '' : p.get('sort'),
        condition: p.get('cond') || '', size: 50, cursor: (p.get('cursor') || '').slice(0, 400) || undefined,
      });
      if (section) await market.annotate(r.items, section.id);
      return send(res, 200, { items: r.items, total: r.total, pages: 1, next: r.next });
    }
    return send(res, 200, await searchOnliner(q, p));
  }

  if (pathname === '/api/facets') {
    const section = sectionOf(p.get('cat'));
    if (!section || !section.onliner) throw new Error('Неизвестная категория');
    const meta = await filters.facets(section.onliner);
    return send(res, 200, { ...meta, preset: Object.keys(section.onlinerPreset || {}) });
  }

  // Фильтры Kufar для раздела; type — выбранный пользователем «Тип» внутри категории
  if (pathname === '/api/kufar/facets') {
    const section = sectionOf(p.get('cat'));
    if (!section || !section.kufar) return send(res, 200, { source: 'kufar', groups: [], none: true });
    const fixed = { ...(section.kufar.p || {}) };
    const preset = { ...fixed };
    const t = p.get('type');
    if (t && /^[\w-]{1,20}:[\w.,:-]{1,80}$/.test(t)) {
      const [k, v] = t.split(':');
      preset[k] = v;
    }
    const meta = await kufarFilters.facets(section.kufar.cat, preset, Object.keys(fixed));
    return send(res, 200, meta);
  }

  if (pathname === '/api/kufar/count') {
    const section = sectionOf(p.get('cat'));
    const q = (p.get('q') || '').trim().slice(0, 200);
    const total = await kufar.count(kufarQuery(section, q, p));
    return send(res, 200, { total });
  }

  // Сколько товаров в наличии подходит под фильтры (для кнопки «Показать N»)
  if (pathname === '/api/count') {
    const section = sectionOf(p.get('cat'));
    if (!section || !section.onliner) throw new Error('Неизвестная категория');
    const params = filters.merge({ order: 'price:asc', ...(section.onlinerPreset || {}) }, parseFilters(p));
    if (!params) return send(res, 200, { total: 0 });
    const r = await onliner.categoryPage(section.onliner, params, 1);
    return send(res, 200, { total: r.total, min: r.items.length ? r.items[0].price : null });
  }

  // Отзывы покупателей Onliner
  if (pathname === '/api/reviews') {
    const key = p.get('key');
    if (!key || !/^[\w.-]+$/.test(key)) throw new Error('Не указан товар');
    const cat = /^[a-z_]{2,30}$/.test(p.get('cat') || '') ? p.get('cat') : '';
    return send(res, 200, await reviews.forProduct(key, cat));
  }

  // История цены товара Onliner
  if (pathname === '/api/history') {
    const key = p.get('key');
    if (!key || !/^[\w.-]+$/.test(key)) throw new Error('Не указан товар');
    const period = ['', '6m', '12m'].includes(p.get('period')) ? p.get('period') : '6m';
    return send(res, 200, await onliner.priceHistory(key, period));
  }

  // Где купить всю сборку: один магазин, два магазина или по частям
  if (pathname === '/api/shops/plan' && req.method === 'POST') {
    const body = await readBody(req);
    const list = (Array.isArray(body.items) ? body.items : []).filter((x) => x && /^[\w.-]+$/.test(String(x.id || '')) && x.source === 'onliner').slice(0, 16);
    return send(res, 200, await shopsPlan(list));
  }

  if (pathname === '/api/offers') {
    const key = p.get('key');
    if (!key || !/^[\w.-]+$/.test(key)) throw new Error('Не указан товар');
    return send(res, 200, { offers: await onliner.offers(key) });
  }

  if (pathname === '/api/refresh' && req.method === 'POST') {
    const body = await readBody(req);
    const list = (Array.isArray(body.items) ? body.items : []).slice(0, 16);
    const out = {};
    await Promise.all(list.map(async (it) => {
      if (!it || !/^[\w.-]+$/.test(String(it.id || '')) || !Catalog.ONLINER_SCHEMAS.has(it.category)) return;
      try {
        out[it.id] = await onliner.product(it.id, it.category);
      } catch (e) {
        out[it.id] = { error: e.message };
      }
    }));
    return send(res, 200, { items: out });
  }

  // Совместимые б/у на Kufar: тот же сокет / тип памяти / видеокарты близкой мощности
  if (pathname === '/api/kufar/compatible' && req.method === 'POST') {
    const body = await readBody(req);
    if (!kufarCompat.TYPE[body.slot]) throw new Error('Неизвестный слот');
    const r = await kufarCompat.compatible(body.slot, body.part || null, body.ctx || {});
    await market.annotate(r.items, body.slot);
    // Сначала выгодные: мощность за рубль, цена к рынку, бренд, безопасная сделка — а не просто самые дешёвые
    r.items = market.rankByValue(r.items, body.slot);
    return send(res, 200, r);
  }

  // Своя деталь из любого магазина: название, цена, ссылка → характеристики для проверки совместимости.
  // Ссылка на каталог Onliner — берём точные данные товара.
  if (pathname === '/api/part/custom' && req.method === 'POST') {
    const body = await readBody(req);
    const slot = String(body.slot || '');
    if (!kufarCompat.TYPE[slot]) throw new Error('Неизвестный тип детали');
    const url = String(body.url || '').trim().slice(0, 500);
    const m = url.match(/catalog\.onliner\.by\/[\w-]+\/[\w-]+\/([\w.-]+)/) || url.match(/catalog\.onliner\.by\/[\w-]+\/([\w.-]+)$/);
    if (m) {
      const schema = kufarCompat.SCHEMA[slot];
      try {
        const it = await onliner.product(m[1], schema);
        if (it && it.category === schema) {
          if (Number(body.price) > 0) it.price = Number(body.price);
          return send(res, 200, { item: it, exact: true });
        }
      } catch {}
    }
    const name = String(body.name || '').trim().slice(0, 200);
    if (!name) throw new Error('Укажите название детали');
    const price = Number(body.price) > 0 ? Number(body.price) : 0;
    const item = await kufarCompat.enrich(slot, { id: 'custom-' + Date.now(), name, price, url: url || null, params: {} });
    return send(res, 200, { item: { ...item, source: 'custom', fromKufar: false, kufarNote: ['своя деталь', item.kufarNote].filter(Boolean).join('; ') } });
  }

  // Своя сборка по ссылкам и названиям: каждая строка — ссылка (Onliner, Kufar, любой магазин) или модель
  if (pathname === '/api/part/links' && req.method === 'POST') {
    const body = await readBody(req);
    return send(res, 200, await partsFromLinks(String(body.text || '').slice(0, 5000)));
  }

  // Объявление Kufar → деталь сборки (характеристики для проверки совместимости)
  if (pathname === '/api/kufar/enrich' && req.method === 'POST') {
    const body = await readBody(req);
    if (!kufarCompat.TYPE[body.slot] || !body.item || !body.item.name) throw new Error('Нечего добавлять');
    return send(res, 200, { item: await kufarCompat.enrich(body.slot, body.item) });
  }

  if (pathname === '/api/used') {
    const kind = p.get('kind');
    const key = p.get('key');
    const q = (p.get('q') || '').slice(0, 120);
    const price = num(p.get('price'));
    const url = 'https://www.kufar.by/l/r~belarus?' + new URLSearchParams({ query: q, cnd: '1' });
    if ((kind === 'cpu' || kind === 'videocard') && key) {
      const all = await kufar.usedFor(kind, key, q, price);
      // Цены той же модели: медиана и оценка каждого объявления относительно неё
      const stats = market.annotateSame(all);
      return send(res, 200, { items: all.slice(0, 30), total: all.length, url, market: stats });
    }
    // Для остальных деталей — просто поиск б/у по названию модели
    const r = await kufar.search({ query: q, condition: 'used', size: 30 });
    const items = r.items.filter((it) => it.price > 0 && (!price || it.price < price * 1.05)).sort((a, b) => a.price - b.price);
    return send(res, 200, { items: items.slice(0, 30), total: items.length, url });
  }

  const m = pathname.match(/^\/api\/store\/(\w+)$/);
  if (m) {
    const key = m[1];
    if (!STORE_KEYS.has(key)) return send(res, 404, { error: 'Нет такого раздела' });
    if (req.method === 'PUT') {
      store.set(key, await readBody(req, 20 * 1024 * 1024));
      return send(res, 200, { ok: true });
    }
    return send(res, 200, { value: store.get(key) ?? null });
  }

  if (pathname === '/api/cache/clear' && req.method === 'POST') {
    clearCache();
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { error: 'Не найдено' });
}

function createServer() {
  return http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return send(res, 400, { error: 'Bad request' });
    }
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);
    // Защита от запросов с чужих сайтов к локальному API
    const origin = req.headers.origin;
    if (origin && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return send(res, 403, { error: 'Forbidden' });
    try {
      await route(req, res, url);
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      const offline = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|Таймаут/.test(msg);
      send(res, offline ? 502 : 400, { error: offline ? 'Нет связи с сайтом магазина. Проверьте интернет и попробуйте ещё раз.' : msg });
    }
  });
}

/** Запуск на порту (0 — любой свободный). Возвращает { server, port, url }. */
let telegramHooked = false;

function start(port = 0, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = createServer();
    // Соединение с окном программы держим дольше: иначе запрос после паузы может попасть
    // на только что закрытое соединение и оборваться («fetch failed»)
    server.keepAliveTimeout = 60 * 1000;
    server.headersTimeout = 65 * 1000;
    server.on('error', reject);
    server.listen(port, host, () => {
      const p = server.address().port;
      // Фоновая проверка цен и объявлений
      watch.start({ kufarOpts: (s) => kufarQuery(sectionOf(s.cat), s.q, new URLSearchParams({ f: JSON.stringify(s.filters || {}) })) });
      // События слежения — ещё и на телефон, если подключён Telegram (и в программе, и в режиме браузера)
      if (!telegramHooked) {
        telegramHooked = true;
        watch.onEvent((e) => {
          const st = store.get('settings') || {};
          if (st.telegramNotify !== false) telegram.notifyEvent(e);
        });
      }
      resolve({ server, port: p, url: `http://${host}:${p}/` });
    });
  });
}

module.exports = { start, createServer, setAppHooks, watch };

if (require.main === module) {
  start(Number(process.env.PORT) || 4780).then(({ url }) => console.log('ПодборПК: ' + url));
}
