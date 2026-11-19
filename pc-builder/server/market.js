'use strict';
// «Справедливая цена» б/у на Kufar: медианная цена модели по свежим объявлениям.
// Для процессоров и видеокарт модель — ключ производительности (Ryzen 5 5600, RTX 3060 12 ГБ),
// для памяти — тип и объём, для SSD — объём и интерфейс.

const kufar = require('./providers/kufar');
const perf = require('./perfdb');
const { capacityGb } = require('./parsers');

const TTL = 6 * 60 * 60 * 1000;

const pv = (it, pu) => (it.params && it.params[pu] ? String(it.params[pu].vl || '') : '');

function ramKey(it) {
  const text = `${it.name} ${pv(it, 'ccrt')}`;
  if (/so-?dimm|ноутбук/i.test(text)) return null;
  const type = (text.toUpperCase().match(/DDR[345]/) || [])[0];
  const gb = parseFloat(pv(it, 'cdr')) || capacityGb(it.name);
  return type && gb ? `${type}-${gb}` : null;
}

function ssdKey(it) {
  let gb = capacityGb(pv(it, 'ccscp')) || capacityGb(it.name);
  if (!gb) return null;
  gb = gb >= 1800 ? 2000 : gb >= 900 ? 1000 : gb >= 450 ? 512 : gb >= 220 ? 256 : gb;
  const nvme = /nvme|m\.2|pci/i.test(`${it.name} ${pv(it, 'ccsi')} ${pv(it, 'ccff')}`);
  return `${nvme ? 'nvme' : 'sata'}-${gb}`;
}

function gpuKeyOf(it) {
  const key = perf.gpuKey(it.name) || perf.gpuKey(pv(it, 'ccvc'));
  if (!key) return null;
  // У некоторых моделей несколько объёмов памяти с разной ценой (RTX 3060 8/12 ГБ, RX 580 4/8 ГБ)
  const vram = parseFloat(pv(it, 'cdr')) || Number((it.name.match(/(\d{1,2})\s*(?:gb|гб)/i) || [])[1]) || 0;
  return vram ? `${key}-${vram}` : key;
}

// pages — сколько страниц свежих объявлений берём для оценки (по 50)
const KINDS = {
  cpu: { cct: '10', key: (it) => perf.cpuKey(it.name), pages: 8 },
  gpu: { cct: '11', key: gpuKeyOf, pages: 8 },
  ram: { cct: '9', key: ramKey, pages: 4 },
  ssd: { cct: '15', key: ssdKey, pages: 4 },
};

// Раздел поиска / слот сборки → вид рынка
const KIND_OF = { cpu: 'cpu', videocard: 'gpu', gpu: 'gpu', dram: 'ram', ram: 'ram', ssd: 'ssd' };

function median(sorted) {
  if (!sorted.length) return 0;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/** Статистика цен: без выбросов (приманки «1 р.» и «коллекционные» цены). */
function stats(prices) {
  let list = prices.filter((p) => p > 0).sort((a, b) => a - b);
  if (list.length < 3) return null;
  const m0 = median(list);
  list = list.filter((p) => p >= m0 * 0.4 && p <= m0 * 2.5);
  if (list.length < 3) return null;
  const q = (f) => list[Math.min(list.length - 1, Math.floor(list.length * f))];
  return { median: Math.round(median(list)), p25: Math.round(q(0.25)), p75: Math.round(q(0.75)), n: list.length };
}

const cache = {};
async function index(kind) {
  const K = KINDS[kind];
  if (!K) return {};
  const c = cache[kind];
  if (c && Date.now() - c.t < TTL) return c.map;
  if (c && c.pending) return c.pending;
  const job = (async () => {
    const all = [];
    let cursor;
    for (let i = 0; i < K.pages; i++) {
      const r = await kufar.search({ cat: 16010, params: { cct: K.cct }, condition: 'used', sort: 'new', size: 50, cursor });
      all.push(...r.items);
      if (!r.next) break;
      cursor = r.next;
    }
    const groups = {};
    for (const it of all) {
      if (!it.price || it.price < 15 || kufar.isJunk(it.name)) continue;
      const k = K.key(it);
      if (k) (groups[k] = groups[k] || []).push(it.price);
    }
    const map = {};
    for (const [k, prices] of Object.entries(groups)) {
      const s = stats(prices);
      if (s) map[k] = s;
    }
    cache[kind] = { t: Date.now(), map };
    return map;
  })();
  cache[kind] = { ...(c || {}), pending: job };
  try {
    return await job;
  } catch (e) {
    cache[kind] = c && c.map ? { t: c.t, map: c.map } : undefined;
    throw e;
  }
}

/** Оценка объявления относительно рынка. */
function verdict(price, s) {
  if (!s || !price) return null;
  const pct = Math.round((price / s.median - 1) * 100);
  let deal = null;
  if (price < s.median * 0.5) deal = 'suspicious';
  else if (price <= s.median * 0.8) deal = 'great';
  else if (price <= s.median * 0.92) deal = 'good';
  else if (price >= s.median * 1.15) deal = 'expensive';
  return { median: s.median, n: s.n, pct, deal };
}

/** Добавляет к объявлениям оценку «дешевле / дороже рынка». kind: cpu | gpu | ram | ssd (или раздел/слот). */
async function annotate(items, kindOrCat) {
  const kind = KIND_OF[kindOrCat] || (KINDS[kindOrCat] ? kindOrCat : null);
  if (!kind || !items || !items.length) return items;
  let map;
  try {
    map = await index(kind);
  } catch {
    return items;
  }
  for (const it of items) {
    if (it.source !== 'kufar') continue;
    const k = KINDS[kind].key(it);
    const v = k && verdict(it.price, map[k]);
    if (v) it.market = v;
  }
  return items;
}

/** Рынок по готовому списку объявлений одной модели (панель «Та же модель»). */
function annotateSame(items) {
  const s = stats(items.map((it) => it.price));
  if (!s) return null;
  for (const it of items) it.market = verdict(it.price, s);
  return s;
}

module.exports = { annotate, annotateSame, stats, verdict, index, KIND_OF, ramKey, ssdKey };
