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
  // «2x8GB» — комплект на 16 ГБ. Объём из названия надёжнее поля объявления (его часто заполняют наугад)
  const kit = String(it.name || '').match(/(\d)\s*[xх×]\s*(\d{1,2})\s*(?:gb|гб)/i);
  const gb = (kit ? kit[1] * kit[2] : capacityGb(it.name)) || parseFloat(pv(it, 'cdr'));
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
  const key = kufar.adGpuKey(it);
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

const KNOWN_BRAND = /asus|msi|gigabyte|aorus|palit|gainward|zotac|sapphire|powercolor|asrock|xfx|inno3d|pny|evga|kingston|corsair|g\.?skill|crucial|samsung|adata|xpg|patriot|team|western digital|\bwd\b|seagate|be quiet|seasonic|deepcool|thermalright|noctua|arctic|lian li|nzxt|fractal|cooler master|chieftec|amd|intel|ryzen|core i\d|geforce|radeon/i;

/**
 * Насколько объявление выгодное: { tier, v }. tier 2 — модель понятна, 1 — модель не распознана,
 * 0 — «куплю», нерабочее, подозрительно дёшево (вниз списка). v — польза за рубль внутри уровня:
 * мощность (со степенью, чтобы древние дешёвые карты не обгоняли нормальные), объём памяти/SSD,
 * цена относительно рынка, понятный бренд, безопасная сделка.
 */
function valueScore(it, kind) {
  if (!it.price) return { tier: 0, v: 0 };
  kind = KIND_OF[kind] || kind;
  if (!it.perf && kind === 'gpu') {
    const key = kufar.adGpuKey(it);
    const p = key && perf.gpuPerf(key, parseFloat(pv(it, 'cdr')) || 0);
    if (p) it.perf = { key, ...p };
  }
  if (!it.perf && kind === 'cpu' && perf.cpuKey(it.name)) it.perf = perf.cpuPerf(it.name, {});
  let base = null;
  // Устаревшее железо (RX 580, GTX 1050, Core i5 4-го поколения) дёшево, но это не «выгодно» — опускаем
  const dated = (v, lo, mid) => (v < lo ? 0.55 : v < mid ? 0.85 : 1);
  if (kind === 'gpu' && it.perf && it.perf.score) base = (Math.pow(it.perf.score, 1.6) / it.price) * dated(it.perf.score, 40, 60);
  else if (kind === 'cpu' && it.perf && it.perf.gaming) base = (Math.pow(it.perf.gaming, 2) / it.price) * dated(it.perf.gaming, 70, 90);
  else if (kind === 'ram' && ramKey(it) && !multiOption(it.name)) {
    const [t, gbs] = ramKey(it).split('-');
    base = (Math.pow(Number(gbs), 1.15) / it.price) * (t === 'DDR3' ? 0.35 : 1) * (Number(gbs) < 8 ? 0.6 : 1);
  } else if (kind === 'ssd' && ssdKey(it) && !multiOption(it.name)) {
    const [t, gbs] = ssdKey(it).split('-');
    const g = Number(gbs);
    base = (g * (t === 'nvme' ? 1.15 : 1) / it.price) * (g < 240 ? 0.5 : g < 480 ? 0.8 : 1);
  }
  // DDR3/DDR2 и SSD меньше 240 ГБ для новой сборки не годятся — всегда ниже современных
  const rk = kind === 'ram' ? ramKey(it) : null;
  // Серверная память (ECC Registered, RDIMM/LRDIMM) в обычные платы не встанет
  const server = kind === 'ram' && /\b(ecc|reg|rdimm|lrdimm)\b|registered|серверн|\d\s*rx\s*[48]/i.test(`${it.name || ''} ${pv(it, 'ccrt')}`);
  const obsolete = server || (rk && /^DDR[23]-/.test(rk)) || (kind === 'ssd' && ssdKey(it) && Number(ssdKey(it).split('-')[1]) < 240);
  const gbOf = rk ? Number(rk.split('-')[1]) : 0;
  const m = it.market;
  // Нереально дёшево для такой мощности (б/у RTX 4060 не стоит 100 р.): «корпус для RTX 5090», запчасти, приманки
  const tooCheap = (kind === 'gpu' && it.perf && it.perf.score && it.price < it.perf.score * 2.5)
    || (kind === 'cpu' && it.perf && it.perf.gaming && it.price < it.perf.gaming * 0.7)
    // и за гигабайт памяти (объём в объявлении часто указан неверно)
    || (rk && it.price < gbOf * ({ DDR3: 1, DDR4: 3, DDR5: 6 }[rk.split('-')[0]] || 0));
  // Объявление не из своего раздела (видеокарта в разделе памяти, мобильная видеокарта ноутбука)
  const foreign = ((kind === 'ram' || kind === 'ssd') && (perf.gpuKey(it.name || '') || /видеокарт|процессор/i.test(it.name || '')))
    || (kind === 'gpu' && /ноутбук|ноутбучн|mobile|max-?q|\d{4}\s?[mм](?![a-zа-я])/i.test(it.name || ''));
  const bad = tooCheap || foreign || (m && m.deal === 'suspicious')
    || ((kind === 'gpu' || kind === 'cpu') && kufar.isJunk(it.name))
    || /куплю|нерабоч|не\s*рабоч|запчаст|под\s*ремонт|неисправ|бронь|брониров|fake|фейк|подделк|locked|заблокир|битый|бэд\s*блок|bad\s*(block|sector)/i.test(it.name || '');
  let f = 1;
  if (m && typeof m.pct === 'number') f *= Math.max(0.75, Math.min(1.3, 1 - m.pct / 100));
  if (KNOWN_BRAND.test(it.name || '')) f *= 1.08;
  else if (kind === 'ssd' || kind === 'ram') f *= 0.85;
  if (it.safedeal) f *= 1.04;
  if (it.delivery) f *= 1.02;
  const tier = bad ? 0 : (base === null && KIND_OF[kind]) || obsolete ? 1 : 2;
  return { tier, v: (base === null ? 1 / it.price : base) * f };
}

/** «8/16/32 GB», «4Gb, 8GB 16Gb», «DDR3 DDR4» — в одном объявлении несколько вариантов: цена непонятна. */
function multiOption(name) {
  // «2x8GB» — это комплект на 16 ГБ, а не второй вариант
  const n = String(name || '').replace(/(\d+)\s*[xх×]\s*(\d+)\s*(gb|гб)/gi, (m0, a, b) => `${a * b}gb`);
  const caps = new Set((n.match(/\d+\s*(?:gb|гб|tb|тб)/gi) || []).map((x) => x.replace(/\s+/g, '').toLowerCase().replace('гб', 'gb').replace('тб', 'tb')));
  return caps.size >= 2 || /\d+\s*\/\s*\d+\s*\/\s*\d+/.test(n) || new Set(n.toUpperCase().match(/DDR[2-5]/g) || []).size >= 2;
}

/** Сортировка объявлений «сначала выгодные»; лучшим трём ставится отметка best. */
function rankByValue(items, kind) {
  const scored = items.map((it) => ({ it, s: valueScore(it, kind) }));
  scored.sort((a, b) => b.s.tier - a.s.tier || b.s.v - a.s.v);
  scored.forEach((x, i) => {
    if (i < 3 && x.s.tier === 2) x.it.best = true;
  });
  return scored.map((x) => x.it);
}

module.exports = { annotate, annotateSame, stats, verdict, index, KIND_OF, ramKey, ssdKey, valueScore, rankByValue };
