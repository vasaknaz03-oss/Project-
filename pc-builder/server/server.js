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
const store = require('./store');
const { clearCache } = require('./http');

const WEB_DIR = path.join(__dirname, '..', 'web');
const VERSION = require('../package.json').version;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

const PC_SCHEMAS = new Set(Object.keys(onliner.CATEGORIES));
const STORE_KEYS = new Set(['builds', 'settings', 'lastForm']);

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

async function searchOnliner(q, p) {
  const cat = p.get('cat') || '';
  const page = num(p.get('page')) || 1;
  const min = num(p.get('min'));
  const max = num(p.get('max'));
  const sort = p.get('sort') || '';
  if (cat && PC_SCHEMAS.has(cat)) {
    const params = { order: ONLINER_SORT[sort] || (q ? undefined : 'rating:desc'), price: { from: min, to: max } };
    if (q) params.query = q;
    if (cat === 'fan' && !q) params.type_fan = ['cpu', 'syslcp'];
    const r = await onliner.categoryPage(cat, params, page);
    return { items: r.items, total: r.total, pages: r.pages };
  }
  if (!q) return { items: [], total: 0, pages: 0 };
  const r = await onliner.search(q, page);
  let items = r.items;
  if (p.get('onlyPc') !== '0') items = items.filter((it) => PC_SCHEMAS.has(it.category));
  if (min !== undefined) items = items.filter((it) => it.price && it.price >= min);
  if (max !== undefined) items = items.filter((it) => it.price && it.price <= max);
  if (sort === 'price_asc') items.sort((a, b) => (a.price || 1e9) - (b.price || 1e9));
  if (sort === 'price_desc') items.sort((a, b) => (b.price || 0) - (a.price || 0));
  if (sort === 'rating') items.sort((a, b) => b.rating - a.rating);
  return { items, total: r.total, pages: r.pages };
}

const KUFAR_QUERY_FOR_CAT = {
  cpu: 'процессор', videocard: 'видеокарта', motherboard: 'материнская плата', dram: 'оперативная память',
  ssd: 'ssd', hdd: 'жесткий диск', powersupply: 'блок питания', chassis: 'корпус', fan: 'кулер',
};

async function route(req, res, url) {
  const p = url.searchParams;
  const pathname = url.pathname;

  if (pathname === '/api/info') {
    return send(res, 200, { version: VERSION, dataDir: store.dataDir(), categories: onliner.CATEGORIES });
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

  if (pathname === '/api/search') {
    const q = (p.get('q') || '').trim().slice(0, 200);
    const src = p.get('src') || 'onliner';
    if (src === 'kufar') {
      const cat = p.get('cat');
      const query = q || (cat && KUFAR_QUERY_FOR_CAT[cat]) || '';
      const r = await kufar.search({
        query, priceMin: num(p.get('min')), priceMax: num(p.get('max')), sort: p.get('sort') === 'rating' ? '' : p.get('sort'),
        condition: p.get('cond') || '', size: 50,
      });
      return send(res, 200, { items: r.items, total: r.total, pages: 1 });
    }
    return send(res, 200, await searchOnliner(q, p));
  }

  if (pathname === '/api/offers') {
    const key = p.get('key');
    if (!key || !/^[\w.-]+$/.test(key)) throw new Error('Не указан товар');
    return send(res, 200, { offers: await onliner.offers(key) });
  }

  if (pathname === '/api/used') {
    const kind = p.get('kind');
    const key = p.get('key');
    const q = (p.get('q') || '').slice(0, 120);
    const price = num(p.get('price'));
    if ((kind === 'cpu' || kind === 'videocard') && key) {
      return send(res, 200, { items: (await kufar.usedFor(kind, key, q, price)).slice(0, 12) });
    }
    // Для остальных деталей — просто поиск б/у по названию модели
    const r = await kufar.search({ query: q, condition: 'used', size: 30 });
    const items = r.items.filter((it) => it.price > 0 && (!price || it.price < price * 1.05)).sort((a, b) => a.price - b.price);
    return send(res, 200, { items: items.slice(0, 12) });
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
function start(port = 0, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(port, host, () => {
      const p = server.address().port;
      resolve({ server, port: p, url: `http://${host}:${p}/` });
    });
  });
}

module.exports = { start, createServer };

if (require.main === module) {
  start(Number(process.env.PORT) || 4780).then(({ url }) => console.log('ПодборПК: ' + url));
}
