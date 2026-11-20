'use strict';
// Полный просмотр объявлений Kufar для сортировки «Сначала выгодные» по ВСЕМ объявлениям, а не по первой странице.
// Первый раз программа пролистывает все страницы поиска (по 200 объявлений, с паузами, чтобы не нагружать
// Kufar), потом раз в несколько минут дочитывает только новые объявления, а раз в несколько часов
// пересматривает всё заново — чтобы проданные исчезли. Индекс сохраняется на диск и переживает перезапуск.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const kufar = require('./providers/kufar');
const store = require('./store');

const PAGE = 200;
const MAX_ADS = 8000; // больше в одном разделе почти не бывает; защита от бесконечного листания
const FRESH_MS = 10 * 60 * 1000; // дочитывать новые не чаще раза в 10 минут
const FULL_MS = 4 * 60 * 60 * 1000; // полный пересмотр раз в 4 часа
const PAUSE_MS = 350; // пауза между страницами
const KEEP = 24; // сколько разных поисков держать в памяти

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const indexes = new Map();

/** Ключ поиска: всё, что влияет на набор объявлений (но не сортировка и не страница). */
function keyOf(opts) {
  const params = Object.fromEntries(Object.entries(opts.params || {}).sort(([a], [b]) => a.localeCompare(b)));
  const k = JSON.stringify({ q: opts.query || '', cat: opts.cat || '', prn: opts.parent || '', params, lo: opts.priceMin || 0, hi: opts.priceMax || 0, cnd: opts.condition || '' });
  return crypto.createHash('sha1').update(k).digest('hex').slice(0, 16);
}

function dir() {
  const d = path.join(store.dataDir() || '.', 'kufar-index');
  try {
    fs.mkdirSync(d, { recursive: true });
  } catch {}
  return d;
}

function save(ix) {
  try {
    const data = { key: ix.key, total: ix.total, t: ix.t, fullAt: ix.fullAt, items: [...ix.items.values()].map(compact) };
    fs.writeFileSync(path.join(dir(), ix.key + '.json'), JSON.stringify(data));
  } catch {}
}

function loadSaved(key) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir(), key + '.json'), 'utf8'));
    if (!data || !Array.isArray(data.items)) return null;
    return data;
  } catch {
    return null;
  }
}

// На диск — без вычисляемых полей (оценка рынка и «лучшее» пересчитываются при каждом показе)
function compact(it) {
  const { market, best, perf, ...rest } = it;
  return rest;
}

function evict() {
  if (indexes.size <= KEEP) return;
  const old = [...indexes.values()].filter((x) => !x.scanning).sort((a, b) => a.used - b.used)[0];
  if (old) indexes.delete(old.key);
}

async function fullScan(ix) {
  const seen = new Map();
  let cursor;
  ix.progress = 0;
  for (let page = 0; page < Math.ceil(MAX_ADS / PAGE); page++) {
    const r = await kufar.search({ ...ix.opts, sort: 'new', size: PAGE, cursor, noCache: true });
    ix.total = r.total;
    for (const it of r.items) seen.set(it.id, it);
    ix.progress = seen.size;
    // Пока идёт первый просмотр, показываем то, что уже нашли
    if (!ix.fullAt) ix.items = seen;
    if (!r.next || !r.items.length) break;
    cursor = r.next;
    await sleep(PAUSE_MS);
  }
  ix.items = seen;
  ix.t = ix.fullAt = Date.now();
  save(ix);
}

/** Дочитываем только новые: листаем «сначала новые», пока страница не окажется знакомой. */
async function incremental(ix) {
  let cursor;
  let added = 0;
  for (let page = 0; page < 10; page++) {
    const r = await kufar.search({ ...ix.opts, sort: 'new', size: 100, cursor, noCache: true });
    ix.total = r.total;
    let known = 0;
    for (const it of r.items) {
      if (ix.items.has(it.id)) known++;
      else added++;
      ix.items.set(it.id, it); // цена могла измениться
    }
    if (!r.next || !r.items.length || known >= r.items.length * 0.8) break;
    cursor = r.next;
    await sleep(PAUSE_MS);
  }
  ix.t = Date.now();
  if (added) save(ix);
  return added;
}

function refresh(ix) {
  if (ix.scanning) return ix.scanning;
  const full = !ix.fullAt || Date.now() - ix.fullAt > FULL_MS;
  ix.error = null;
  ix.scanning = (full ? fullScan(ix) : incremental(ix))
    .catch((e) => {
      ix.error = e.message;
    })
    .finally(() => {
      ix.scanning = null;
    });
  return ix.scanning;
}

/**
 * Индекс поиска: возвращается сразу; если он устарел или пуст — в фоне запускается просмотр.
 * opts — те же условия, что у kufar.search (query, cat, parent, params, priceMin, priceMax, condition).
 */
function ensure(opts) {
  const key = keyOf(opts);
  let ix = indexes.get(key);
  if (!ix) {
    const saved = loadSaved(key);
    ix = {
      key, opts: { ...opts, sort: undefined, cursor: undefined, size: undefined },
      items: new Map(saved ? saved.items.map((it) => [it.id, it]) : []),
      total: saved ? saved.total : 0, t: saved ? saved.t : 0, fullAt: saved ? saved.fullAt : 0,
      progress: saved ? saved.items.length : 0, scanning: null, error: null, used: Date.now(),
    };
    indexes.set(key, ix);
    evict();
  }
  ix.used = Date.now();
  if (!ix.t || Date.now() - ix.t > FRESH_MS || Date.now() - ix.fullAt > FULL_MS) refresh(ix);
  return ix;
}

/** Состояние для интерфейса. */
function status(ix) {
  return {
    scanned: ix.items.size, total: ix.total, progress: ix.progress,
    ready: !!ix.fullAt, scanning: !!ix.scanning, updatedAt: ix.t || null, error: ix.error,
  };
}

function list(ix) {
  return [...ix.items.values()];
}

module.exports = { ensure, status, list, keyOf, refresh, _indexes: indexes };
