'use strict';
// Сервер ПодборПК — посредник между программой у пользователей и внешними сервисами.
// • Ключи Anthropic, YouTube и Telegram хранятся только здесь — в программе их нет.
// • Общий кэш: одинаковые запросы разных пользователей уходят во внешний сервис один раз.
// • Лимиты на устройство в сутки и общий дневной бюджет на ИИ.
// • Данные Onliner и Kufar собираются один раз для всех (кэш запросов и полный просмотр Kufar на сервере),
//   а не тысячами копий программы.
// Логика подбора, ИИ и Kufar — общая с программой (папка pc-builder/server).

const http = require('http');
const path = require('path');
const crypto = require('crypto');
const cfg = require('./config');
const db = require('./db');
const bot = require('./bot');

const APP = process.env.PODBOR_APP_DIR || path.join(__dirname, '..', '..', 'pc-builder');
const appStore = require(path.join(APP, 'server', 'store'));
appStore.setDir(path.join(cfg.dataDir, 'app')); // индексы Kufar и служебные данные модулей программы
const appHttp = require(path.join(APP, 'server', 'http'));
const ai = require(path.join(APP, 'server', 'ai'));
const llm = require(path.join(APP, 'server', 'llm'));
const youtube = require(path.join(APP, 'server', 'youtube'));
const reviews = require(path.join(APP, 'server', 'reviews'));
const kufarIndex = require(path.join(APP, 'server', 'kufarIndex'));
const market = require(path.join(APP, 'server', 'market'));
const VERSION = require('../package.json').version;

ai.setKeyProvider(() => cfg.anthropicKey);
llm.setConfigProvider(() => cfg.llm);
youtube.setKeyProvider(() => cfg.youtubeKey);

class HttpErr extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > cfg.maxBody) {
        reject(new HttpErr(413, 'Слишком большой запрос'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new HttpErr(400, 'Неверный JSON'));
      }
    });
    req.on('error', reject);
  });
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function clientIp(req) {
  if (cfg.trustProxy) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xf) return xf;
  }
  return req.socket.remoteAddress || '';
}

function auth(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer\s+([A-Za-z0-9_-]{20,100})$/);
  if (!m) throw new HttpErr(401, 'Нужна регистрация устройства');
  const d = db.dev.byToken(sha(m[1]));
  if (!d) throw new HttpErr(401, 'Устройство не найдено — программа зарегистрируется заново');
  db.dev.touch(d.id);
  return d;
}

function limitOf(d, kind) {
  const plan = cfg.plans[d.plan] || cfg.plans.free;
  return plan[kind] ?? 0;
}

/** Проверка суточного лимита; списывается только при реальном обращении к внешнему сервису. */
function checkLimit(d, kind) {
  const used = db.usage.get(d.id, kind);
  const lim = limitOf(d, kind);
  if (used >= lim) throw new HttpErr(429, `Дневной лимит исчерпан (${lim}). Завтра он обновится${d.plan === 'free' ? '; в платной версии лимиты больше' : ''}.`);
}

function aiCost(u, engine) {
  if (!u || engine === 'local') return 0;
  return (u.input || 0) / 1e6 * cfg.priceInputPerM + (u.output || 0) / 1e6 * cfg.priceOutputPerM + (u.webSearches || 0) / 1000 * cfg.priceWebSearchPer1k;
}

function checkBudget() {
  if (!ai.available()) throw new HttpErr(503, 'ИИ на сервере не настроен');
  // Своя модель бесплатна — бюджет считаем только для Anthropic
  if (ai.engine() !== 'anthropic') return;
  const s = db.spend.today();
  if (s.usd >= cfg.aiDailyBudgetUsd) throw new HttpErr(429, 'Дневной бюджет ИИ на сервере исчерпан — попробуйте завтра.');
}

// Какие адреса Onliner и Kufar сервер забирает и кэширует для всех (только чтение открытых API)
const FETCH_RULES = [
  { re: /^https:\/\/catalog\.onliner\.by\/sdapi\/catalog\.api\/\S+$/, ttl: 15 * 60e3 },
  { re: /^https:\/\/catalog\.api\.onliner\.by\/\S+$/, ttl: 15 * 60e3 },
  { re: /^https:\/\/shop\.api\.onliner\.by\/\S+$/, ttl: 15 * 60e3 },
  { re: /^https:\/\/api\.kufar\.by\/search-api\/v2\/\S+$/, ttl: 5 * 60e3 },
  { re: /^https:\/\/api\.nbrb\.by\/exrates\/rates\?periodicity=0$/, ttl: 60 * 60e3 },
];

const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

/** Проверка условий поиска Kufar, присланных программой: только знакомые поля и простые значения. */
function cleanKufarQuery(b) {
  const kq = b.kq || {};
  const params = {};
  for (const [k, v] of Object.entries(kq.params || {}).slice(0, 30)) {
    if (!/^[a-z_]{1,20}$/.test(k)) continue;
    if (Array.isArray(v)) params[k] = v.slice(0, 20).map((x) => text(x, 60));
    else if (v && typeof v === 'object') params[k] = Object.fromEntries(Object.entries(v).slice(0, 4).map(([a, c]) => [text(a, 10), text(c, 40)]));
    else params[k] = text(v, 100);
  }
  const n = (v) => (v === undefined || v === null || v === '' || isNaN(+v) ? undefined : +v);
  return {
    query: text(kq.query, 200) || undefined, cat: n(kq.cat) || undefined, parent: n(kq.parent) || undefined, params,
    priceMin: n(b.min), priceMax: n(b.max), condition: ['used', 'new'].includes(b.cond) ? b.cond : '',
  };
}

async function route(req, res, url) {
  const p = url.searchParams;
  const pth = url.pathname;

  if (pth === '/v1/health') {
    return send(res, 200, {
      ok: true, version: VERSION,
      features: { ai: ai.available(), youtube: !!cfg.youtubeKey, telegram: bot.enabled(), kufar: true, fetch: true },
      bot: bot.botName() || null,
    });
  }

  if (pth === '/v1/devices' && req.method === 'POST') {
    const ip = clientIp(req);
    if (db.ip.hit(sha('ip:' + ip)) > cfg.registerPerIpHour) throw new HttpErr(429, 'Слишком много регистраций с этого адреса, попробуйте через час');
    const body = await readBody(req);
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('base64url');
    db.dev.create(id, sha(token), text(body.app, 40));
    return send(res, 200, { id, token });
  }

  // ---------------- админ
  if (pth.startsWith('/v1/admin/')) {
    const tok = req.headers['x-admin-token'] || '';
    if (!cfg.adminToken || tok.length !== cfg.adminToken.length || !crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(cfg.adminToken))) throw new HttpErr(403, 'Нет доступа');
    if (pth === '/v1/admin/stats') {
      return send(res, 200, {
        devices: db.dev.count(), activeToday: db.dev.activeSince(Date.now() - 86400e3), activeWeek: db.dev.activeSince(Date.now() - 7 * 86400e3),
        usageToday: db.usage.totals(), aiSpendToday: db.spend.today(), aiDailyBudgetUsd: cfg.aiDailyBudgetUsd, cacheEntries: db.cache.count(),
      });
    }
    if (pth === '/v1/admin/plan' && req.method === 'POST') {
      // Заготовка под платную подписку: сменить тариф устройства
      const body = await readBody(req);
      if (!cfg.plans[body.plan]) throw new HttpErr(400, 'Нет такого тарифа');
      db.dev.set(text(body.device, 60), { plan: body.plan });
      return send(res, 200, { ok: true });
    }
    throw new HttpErr(404, 'Нет такого адреса');
  }

  const d = auth(req);

  if (pth === '/v1/me') {
    const plan = cfg.plans[d.plan] || cfg.plans.free;
    return send(res, 200, { plan: d.plan, limits: plan, usedToday: db.usage.today(d.id), telegram: !!d.tg_chat });
  }

  // ---------------- ИИ: выжимка с форумов и обзоров
  if (pth === '/v1/ai/research' && req.method === 'POST') {
    const b = await readBody(req);
    const mode = ['part', 'oc', 'build', 'free'].includes(b.mode) ? b.mode : 'free';
    const depth = b.depth === 'deep' ? 'deep' : 'quick';
    const query = text(b.query, 300);
    if (!query) throw new HttpErr(400, 'Пустой запрос');
    const key = `research|${mode}|${depth}|${query.toLowerCase().replace(/\s+/g, ' ')}`;
    const hit = db.cache.get(key);
    if (hit) return send(res, 200, { ...hit.value, cached: true, t: hit.t });
    const kind = depth === 'deep' ? 'research_deep' : 'research_quick';
    checkLimit(d, kind);
    checkBudget();
    const r = await ai.research(query, { mode, depth });
    db.spend.add(aiCost(r.usage, r.engine));
    db.usage.add(d.id, kind);
    const { usage, ...pub } = r;
    db.cache.set(key, pub, cfg.ttl.research);
    return send(res, 200, { ...pub, t: Date.now() });
  }

  // ---------------- ИИ: разбор отзывов покупателей Onliner (сервер сам берёт отзывы)
  if (pth === '/v1/ai/reviews' && req.method === 'POST') {
    const b = await readBody(req);
    const pkey = text(b.key, 80);
    if (!/^[\w.-]+$/.test(pkey)) throw new HttpErr(400, 'Не указан товар');
    const cat = /^[a-z_]{2,30}$/.test(b.cat || '') ? b.cat : '';
    const r = await reviews.forProduct(pkey, cat);
    if (!r.items.length) throw new HttpErr(404, 'У этого товара пока нет отзывов');
    const key = `reviews|${pkey}|${r.total}`;
    const hit = db.cache.get(key);
    if (hit) return send(res, 200, { ...hit.value, cached: true });
    checkLimit(d, 'reviews');
    checkBudget();
    const sum = await ai.reviewSummary(text(b.name, 200) || pkey, r.items);
    db.spend.add(aiCost(sum.usage, sum.engine));
    db.usage.add(d.id, 'reviews');
    db.cache.set(key, sum, cfg.ttl.reviews);
    return send(res, 200, sum);
  }

  // ---------------- YouTube (общий кэш на сутки — по правилам YouTube API не дольше 30 дней)
  if (pth === '/v1/youtube') {
    if (!cfg.youtubeKey) throw new HttpErr(503, 'YouTube на сервере не настроен');
    const q = text(p.get('q'), 200);
    if (!q) throw new HttpErr(400, 'Пустой запрос');
    const key = `yt|${q.toLowerCase().replace(/\s+/g, ' ')}`;
    const hit = db.cache.get(key);
    if (hit) return send(res, 200, { ...hit.value, cached: true });
    checkLimit(d, 'youtube');
    const r = await youtube.search(q, { comments: true });
    db.usage.add(d.id, 'youtube');
    db.cache.set(key, r, cfg.ttl.youtube);
    return send(res, 200, r);
  }

  // ---------------- общий кэш открытых API Onliner и Kufar
  if (pth === '/v1/fetch') {
    const u = text(p.get('u'), 2000);
    const rule = FETCH_RULES.find((x) => x.re.test(u));
    if (!rule) throw new HttpErr(400, 'Этот адрес сервер не забирает');
    checkLimit(d, 'fetch');
    db.usage.add(d.id, 'fetch');
    try {
      return send(res, 200, await appHttp.getJSON(u, { ttl: rule.ttl }));
    } catch (e) {
      throw new HttpErr(e.status && e.status >= 400 && e.status < 500 ? e.status : 502, e.message);
    }
  }

  // ---------------- Kufar «сначала выгодные» по всем объявлениям — просмотр один на всех
  if (pth === '/v1/kufar/value' && req.method === 'POST') {
    const b = await readBody(req);
    const opts = cleanKufarQuery(b);
    const sectionId = /^[a-z_]{0,30}$/.test(b.sectionId || '') ? b.sectionId || '' : '';
    const isNew = !kufarIndex._indexes.has(kufarIndex.keyOf(opts));
    if (isNew) {
      checkLimit(d, 'kufar_scan');
      db.usage.add(d.id, 'kufar_scan');
    }
    const ix = kufarIndex.ensure(opts);
    if (!ix.items.size && ix.scanning) await Promise.race([ix.scanning, new Promise((r) => setTimeout(r, 8000))]);
    const all = kufarIndex.list(ix);
    for (const it of all) it.best = false;
    if (sectionId) await market.annotate(all, sectionId);
    const ranked = market.rankByValue(all, sectionId);
    const per = 50;
    const page = Math.max(1, Math.min(200, +b.page || 1));
    return send(res, 200, {
      items: ranked.slice((page - 1) * per, page * per), total: ix.total || ranked.length,
      pages: Math.max(1, Math.ceil(ranked.length / per)), next: null, index: kufarIndex.status(ix),
    });
  }

  // ---------------- общий Telegram-бот
  if (pth === '/v1/telegram/link' && req.method === 'POST') {
    if (!bot.enabled()) throw new HttpErr(503, 'Telegram-бот на сервере не настроен');
    return send(res, 200, bot.linkFor(d));
  }
  if (pth === '/v1/telegram/status') return send(res, 200, { linked: !!d.tg_chat, bot: bot.botName() || null });
  if (pth === '/v1/telegram/unlink' && req.method === 'POST') {
    db.dev.set(d.id, { tg_chat: null, tg_code: null });
    return send(res, 200, { ok: true });
  }
  if (pth === '/v1/notify' && req.method === 'POST') {
    if (!d.tg_chat) throw new HttpErr(409, 'Telegram не подключён');
    const b = await readBody(req);
    checkLimit(d, 'notify');
    db.usage.add(d.id, 'notify');
    const msg = [b.title ? '🔔 ' + text(b.title, 200) : '', text(b.body, 1500), /^https:\/\//.test(b.url || '') ? text(b.url, 500) : ''].filter(Boolean).join('\n');
    await bot.send(d.tg_chat, msg || '🔔 Уведомление ПодборПК');
    return send(res, 200, { ok: true });
  }

  throw new HttpErr(404, 'Нет такого адреса');
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    try {
      await route(req, res, url);
    } catch (e) {
      const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
      if (status >= 500) console.error(new Date().toISOString(), url.pathname, e.message);
      send(res, status, { error: e.message || 'Ошибка сервера' });
    }
  });
}

function start() {
  db.open(cfg.dataDir);
  const server = createServer();
  server.keepAliveTimeout = 65e3;
  server.listen(cfg.port, cfg.host, () => console.log(`Сервер ПодборПК ${VERSION} слушает ${cfg.host}:${cfg.port}`));
  bot.start();
  // Уборка: устаревший кэш и старые счётчики
  setInterval(() => {
    try {
      db.cache.cleanup();
      db.usage.cleanup();
    } catch (e) {
      console.error('cleanup:', e.message);
    }
  }, 60 * 60e3).unref();
  const stop = () => {
    bot.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  return server;
}

if (require.main === module) start();

module.exports = { createServer, start, cleanKufarQuery, FETCH_RULES };
