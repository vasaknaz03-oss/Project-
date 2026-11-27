'use strict';
// Слежение: цены товаров Onliner и сохранённые поиски Kufar. Проверка идёт по расписанию в фоне,
// найденное складывается в «уведомления»; оболочка Electron показывает их системными уведомлениями.

const store = require('./store');
const onliner = require('./providers/onliner');
const kufar = require('./providers/kufar');
const market = require('./market');

const KEY = 'watch';
const listeners = new Set();
let kufarOptsFor = null; // (search) => параметры поиска Kufar; задаёт server.js
let running = null;
let timer = null;
let lastRun = null;
let telegram = null;
const SEARCH_PAGE_SIZE = 200;
const SEARCH_PAGE_LIMIT = 40;
const TELEGRAM_BATCH = 10;

const now = () => Date.now();
const uid = () => now().toString(36) + Math.random().toString(36).slice(2, 7);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, lo, hi, def) => (Number.isFinite(+v) && +v > 0 ? Math.min(hi, Math.max(lo, +v)) : def);

function data() {
  const d = store.get(KEY) || {};
  d.items = Array.isArray(d.items) ? d.items : [];
  d.searches = Array.isArray(d.searches) ? d.searches : [];
  d.events = Array.isArray(d.events) ? d.events : [];
  d.telegramAds = d.telegramAds && typeof d.telegramAds === 'object' ? d.telegramAds : {};
  return d;
}

function save(d) {
  d.events = d.events.slice(-200);
  store.set(KEY, d);
}

function settings() {
  const s = store.get('settings') || {};
  return {
    enabled: s.watchEnabled !== false,
    priceHours: clamp(s.watchPriceHours, 1, 24, 3),
    adMinutes: clamp(s.watchAdMinutes, 10, 24 * 60, 30),
  };
}

function onEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(d, ev) {
  const e = { id: uid(), t: now(), read: false, ...ev };
  d.events.push(e);
  for (const fn of listeners) {
    try {
      fn(e);
    } catch {}
  }
  return e;
}

// ------------------------------------------------------------------ товары Onliner

function addItem(it) {
  if (!it || !/^[\w.-]{1,120}$/.test(String(it.id || '')) || !it.category) throw new Error('Следить можно за товарами из каталога Onliner');
  const d = data();
  const existing = d.items.find((x) => x.key === it.id);
  if (existing) return existing;
  const price = Number(it.price) || null;
  const item = {
    id: uid(), key: it.id, category: String(it.category), name: String(it.name || it.id).slice(0, 200),
    url: it.url || null, image: it.image || null,
    priceAdded: price, lastPrice: price, minPrice: price, target: null,
    history: price ? [{ t: now(), p: price }] : [], addedAt: now(), lastCheck: now(),
  };
  d.items.push(item);
  save(d);
  return item;
}

function removeItem(id) {
  const d = data();
  d.items = d.items.filter((x) => x.id !== id && x.key !== id);
  save(d);
}

function setTarget(id, target) {
  const d = data();
  const it = d.items.find((x) => x.id === id);
  if (!it) throw new Error('Товар не найден');
  it.target = Number(target) > 0 ? Math.round(Number(target) * 100) / 100 : null;
  it.targetHit = false;
  save(d);
  return it;
}

async function checkItem(d, it) {
  const p = await onliner.product(it.key, it.category);
  const price = p && p.price ? p.price : null;
  const prev = it.lastPrice;
  it.lastCheck = now();
  if (p && p.image && !it.image) it.image = p.image;
  if (!price) {
    if (prev && !it.outOfStock) emit(d, { type: 'stock', title: 'Нет в наличии', body: `${it.name} пропал из продажи на Onliner`, url: it.url, ref: it.id });
    it.outOfStock = true;
    return;
  }
  if (it.outOfStock) emit(d, { type: 'stock', title: 'Снова в продаже', body: `${it.name} — ${fmt(price)}`, url: it.url, ref: it.id });
  it.outOfStock = false;
  it.lastPrice = price;
  it.minPrice = it.minPrice ? Math.min(it.minPrice, price) : price;
  const last = it.history[it.history.length - 1];
  if (!last || last.p !== price) it.history.push({ t: now(), p: price });
  it.history = it.history.slice(-120);
  if (prev && price <= prev * 0.99 && prev - price >= 1) {
    emit(d, { type: 'price', title: `Цена снизилась на ${Math.round((1 - price / prev) * 100)}%`, body: `${it.name}: ${fmt(prev)} → ${fmt(price)}`, url: it.url, ref: it.id });
  }
  if (it.target && price <= it.target && !it.targetHit) {
    it.targetHit = true;
    emit(d, { type: 'target', title: 'Цена дошла до вашей цели', body: `${it.name}: ${fmt(price)} (цель ${fmt(it.target)})`, url: it.url, ref: it.id });
  } else if (it.target && price > it.target) it.targetHit = false;
}

// ------------------------------------------------------------------ поиски Kufar

function slimAd(a) {
  const { id, name, price, url, image, location, date, company, delivery, safedeal, risk, market: m } = a;
  return { id, name, price, url: url || (/^\d{1,16}$/.test(id) ? 'https://www.kufar.by/item/' + id : null),
    image, location, date, company, delivery, safedeal, risk, market: m || null, source: 'kufar' };
}

async function runSearch(s) {
  if (!kufarOptsFor) throw new Error('Поиск Kufar не настроен');
  const opts = kufarOptsFor(s);
  const all = new Map();
  const cursors = new Set();
  let cursor;
  let total = 0;
  for (let page = 0; page < SEARCH_PAGE_LIMIT; page++) {
    const r = await kufar.search({ ...opts, sort: 'new', size: SEARCH_PAGE_SIZE, cursor, noCache: true,
      priceMin: s.priceMin || undefined, priceMax: s.priceMax || undefined, condition: s.cond || '' });
    total = r.total;
    for (const item of r.items) all.set(item.id, item);
    cursor = r.next;
    if (!cursor) break;
    if (cursors.has(cursor) || page + 1 === SEARCH_PAGE_LIMIT) throw new Error('Не удалось загрузить все страницы Kufar. Уточните фильтры или повторите проверку.');
    cursors.add(cursor);
  }
  const candidates = [...all.values()].filter((a) => (!s.priceMin || a.price >= s.priceMin) && (!s.priceMax || (a.price > 0 && a.price <= s.priceMax)));
  const seen = new Set(s.seen);
  const checked = s.complete ? candidates.filter((a) => !seen.has(a.id)) : candidates;
  await kufar.inspect(checked, { limit: 20, timeout: 3500 });
  const items = kufar.prioritize(candidates).filter((a) => a.risk.level !== 'blocked');
  if (s.cat) await market.annotate(items, s.cat);
  return { items, total, ids: [...all.keys()] };
}

async function addSearch(input) {
  const s = {
    id: uid(),
    name: String(input.name || input.q || 'Поиск').slice(0, 120),
    cat: input.cat ? String(input.cat) : '',
    q: String(input.q || '').slice(0, 200),
    filters: input.filters && typeof input.filters === 'object' ? input.filters : {},
    priceMin: Number(input.priceMin) > 0 ? Number(input.priceMin) : null,
    priceMax: Number(input.priceMax) > 0 ? Number(input.priceMax) : null,
    cond: input.cond === 'used' || input.cond === 'new' ? input.cond : '',
    createdAt: now(), lastCheck: now(), newCount: 0, seen: [], latest: [],
  };
  if (!s.q && !s.cat) throw new Error('Укажите запрос или раздел');
  // Всё, что уже есть сейчас, считаем просмотренным: уведомляем только о новых объявлениях
  const r = await runSearch(s);
  s.seen = r.ids;
  s.complete = true;
  s.latest = r.items.slice(0, 12).map(slimAd);
  s.total = r.total;
  const d = data();
  d.searches.push(s);
  save(d);
  return publicSearch(s);
}

function removeSearch(id) {
  const d = data();
  d.searches = d.searches.filter((x) => x.id !== id);
  save(d);
}

async function checkSearch(d, s) {
  const r = await runSearch(s);
  if (!d.searches.includes(s)) return;
  const seen = new Set(s.seen);
  const cutoff = s.lastCheck || s.createdAt || 0;
  // Старинные поиски запоминали только первую страницу. Не объявляем старые позиции новыми при обновлении.
  const fresh = r.items.filter((a) => !seen.has(a.id) && (s.complete || Date.parse(a.date) > cutoff));
  s.lastCheck = now();
  s.total = r.total;
  s.seen = [...new Set([...seen, ...r.ids])];
  s.complete = true;
  s.latest = r.items.slice(0, 12).map(slimAd);
  if (!fresh.length) return;
  s.newCount = (s.newCount || 0) + fresh.length;
  const deals = fresh.filter((a) => a.market && (a.market.deal === 'great' || a.market.deal === 'good'));
  const top = (deals.length ? deals : fresh).slice(0, 3).map((a) => a.name.slice(0, 50) + (a.price > 0 ? ' — ' + fmt(a.price) : '')).join(' · ');
  const mode = telegram?.mode();
  if (mode === 'own' || mode === 'shared') {
    for (const { id, name, price } of fresh) {
      if (/^\d{1,16}$/.test(id) && !Object.hasOwn(d.telegramAds, id)) {
        d.telegramAds[id] = { state: 'pending', ad: { id, name, price } };
      }
    }
  }
  emit(d, {
    type: 'ads', title: `Kufar: ${fresh.length} ${plural(fresh.length, 'новое объявление', 'новых объявления', 'новых объявлений')} — «${s.name}»`,
    body: (deals.length ? `Выгодных: ${deals.length}. ` : '') + top, ref: s.id, ads: fresh.slice(0, 10).map(slimAd),
  });
}

function publicSearch(s) {
  const { seen, complete, ...rest } = s;
  return rest;
}

function telegramState(d) {
  const states = Object.values(d.telegramAds);
  return {
    mode: telegram?.mode() || 'unlinked',
    pending: states.filter((entry) => entry.state === 'pending').length,
    uncertain: states.filter((entry) => entry.state === 'uncertain' || entry.state === 'sending').length,
    error: d.telegramError || null,
  };
}

async function deliverTelegram(d) {
  const mode = telegram?.mode();
  if (mode !== 'own' && mode !== 'shared') return;
  // Если процесс завершился во время запроса, Telegram мог его принять. Повтор мог бы дать дубль.
  for (const entry of Object.values(d.telegramAds)) {
    if (entry.state === 'sending') entry.state = 'uncertain';
  }
  const batch = Object.entries(d.telegramAds).filter(([, entry]) => entry.state === 'pending').slice(0, TELEGRAM_BATCH);
  for (const [id, entry] of batch) {
    if (telegram.mode() !== mode) break;
    entry.state = 'sending';
    save(d);
    store.flush();
    let result;
    try {
      result = await telegram.send(entry.ad, mode);
    } catch {
      result = { uncertain: true };
    }
    if (result.ok) {
      d.telegramAds[id] = { state: 'sent' };
      d.telegramError = null;
    } else {
      entry.state = result.uncertain ? 'uncertain' : 'pending';
      d.telegramError = result.error || 'Нет подтверждения от Telegram.';
    }
    save(d);
    store.flush();
    if (!result.ok) break;
  }
}

// ------------------------------------------------------------------ проверка по расписанию

async function check({ force = false } = {}) {
  if (running) return running;
  running = (async () => {
    const st = settings();
    const d = data();
    let checked = 0;
    const errors = [];
    for (const it of d.items) {
      if (!force && now() - (it.lastCheck || 0) < st.priceHours * 3600 * 1000) continue;
      try {
        await checkItem(d, it);
        checked++;
      } catch (e) {
        errors.push(`${it.name}: ${e.message}`);
      }
      await sleep(300);
    }
    for (const s of d.searches) {
      if (!force && now() - (s.lastCheck || 0) < st.adMinutes * 60 * 1000) continue;
      try {
        await checkSearch(d, s);
        checked++;
      } catch (e) {
        errors.push(`${s.name}: ${e.message}`);
      }
      await sleep(800);
    }
    await deliverTelegram(d);
    save(d);
    lastRun = { t: now(), checked, errors };
    return lastRun;
  })();
  try {
    return await running;
  } finally {
    running = null;
  }
}

function start({ kufarOpts, telegramDelivery } = {}) {
  if (kufarOpts) kufarOptsFor = kufarOpts;
  if (telegramDelivery) telegram = telegramDelivery;
  if (timer) return;
  // Раз в 5 минут смотрим, что пора проверить (сами интервалы — в настройках)
  const tick = () => {
    if (settings().enabled) check().catch(() => {});
  };
  const first = setTimeout(tick, 20 * 1000);
  if (first.unref) first.unref();
  timer = setInterval(tick, 5 * 60 * 1000);
  if (timer.unref) timer.unref();
}

function summary() {
  const d = data();
  return {
    items: d.items,
    searches: d.searches.map(publicSearch),
    events: d.events.slice(-100).reverse(),
    unread: d.events.filter((e) => !e.read).length,
    settings: settings(),
    telegram: telegramState(d),
    lastRun,
    running: !!running,
  };
}

function markRead(ids) {
  const d = data();
  for (const e of d.events) if (!ids || ids.includes(e.id)) e.read = true;
  if (!ids) for (const s of d.searches) s.newCount = 0;
  save(d);
}

function clearEvents() {
  const d = data();
  d.events = [];
  save(d);
}

function fmt(v) {
  return `${(Math.round(v * 100) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} р.`;
}

function plural(n, one, few, many) {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

module.exports = { start, check, onEvent, summary, addItem, removeItem, setTarget, addSearch, removeSearch, markRead, clearEvents, runSearch };
