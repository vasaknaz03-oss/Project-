'use strict';
// Сетап целиком: монитор, клавиатура, мышь, наушники, кресло и т. д. к подобранному ПК.
// Бюджет делится между ПК и периферией; монитор подбирается под мощность видеокарты.

const onliner = require('./providers/onliner');
const filters = require('./filters');
const Catalog = require('../web/catalog');

const inStock = (it) => it.price && it.price > 0;

/** Загрузка кандидатов для выбранных пунктов сетапа. B — максимальный бюджет (с учётом варианта «с запасом»). */
async function gather(ids, B, userFilters, warnings) {
  const out = {};
  await Promise.all(ids.map(async (id) => {
    const sec = Catalog.byId[id];
    if (!sec || !sec.onliner) return;
    const lo = Math.round(Catalog.setupTarget(id, B * 0.74) * 0.45);
    const hi = Math.round(Catalog.setupTarget(id, B) * 1.35);
    const F = filters.sanitize((userFilters || {})[sec.onliner]);
    const queries = [
      { order: 'rating:desc', price: { from: lo, to: hi } },
      { order: 'price:asc', price: { from: lo, to: hi } },
    ];
    // Игровые мониторы отдельным запросом, чтобы было из чего выбрать под мощную видеокарту
    if (id === 'display') queries.push({ order: 'rating:desc', price: { from: lo, to: hi }, disp_refreshrate: { from: '144hz' } });
    const lists = await Promise.all(queries.map(async (q) => {
      const merged = filters.merge(q, F);
      if (!merged) return [];
      try {
        return (await onliner.category(sec.onliner, merged, 2)).items;
      } catch (e) {
        warnings.push(`Не удалось загрузить: ${sec.name} (${e.message})`);
        return [];
      }
    }));
    const seen = new Map();
    for (const it of lists.flat()) if (inStock(it) && !seen.has(it.id)) seen.set(it.id, it);
    out[id] = [...seen.values()].sort((a, b) => a.price - b.price);
    if (!out[id].length) warnings.push(`Для пункта «${Catalog.setupById[id].label}» в наличии ничего не нашлось${filters.countActive(F) ? ' — ослабьте фильтры' : ''}`);
  }));
  return out;
}

/** Качество товара по отзывам Onliner: оценка и число отзывов. */
function quality(it) {
  const n = it.reviews || 0;
  const r = n ? it.rating || 0 : 3.6;
  return r + Math.min(Math.log10(1 + n), 2.2) * 0.35 + Math.min(it.offers || 0, 20) * 0.01;
}

/** Лучший товар около целевой цены. */
function pickNear(list, target, pred = () => true) {
  let best = null;
  let bestScore = -Infinity;
  for (const it of list) {
    if (it.price > target * 1.3 || !pred(it)) continue;
    const s = quality(it) - 1.1 * Math.abs(Math.log(it.price / target));
    if (s > bestScore) {
      bestScore = s;
      best = it;
    }
  }
  return best;
}

// Классы мониторов: разрешение и частота
const MONITOR_CLASS = {
  fhd144: { label: '1080p от 144 Гц', ok: (s) => s.resH === 1080 && s.resW <= 1920 && s.hz >= 144 },
  qhd144: { label: '1440p от 144 Гц', ok: (s) => s.resH === 1440 && s.resW <= 2560 && s.hz >= 144 },
  qhd240: { label: '1440p от 240 Гц', ok: (s) => s.resH === 1440 && s.resW <= 2560 && s.hz >= 240 },
  uhd144: { label: '4K от 144 Гц', ok: (s) => s.resH === 2160 && s.hz >= 144 },
  uhd: { label: '4K', ok: (s) => s.resH === 2160 },
  qhd: { label: '1440p', ok: (s) => s.resH === 1440 && s.resW <= 2560 },
  office: { label: '1080p или 1440p', ok: (s) => (s.resH === 1080 || s.resH === 1440) && s.resW <= 2560 },
};

/** Какой монитор нужен: под назначение и мощность видеокарты. */
function monitorClasses(purpose, gamingIndex, target) {
  if (purpose === 'office') return ['office'];
  if (purpose === 'work') return target >= 1100 ? ['uhd', 'qhd', 'office'] : ['qhd', 'office'];
  const g = gamingIndex || 0;
  if (g < 100) return ['fhd144', 'office'];
  if (g < 175) return ['qhd144', 'fhd144', 'office'];
  return target >= 1500 ? ['qhd240', 'uhd144', 'qhd144', 'office'] : ['qhd144', 'qhd240', 'fhd144', 'office'];
}

// Предпочтения по назначению: сначала ищем подходящие по описанию, иначе — любые
const PREFS = {
  gaming: {
    headphones: /геймерск|охватывающ|накладн/i,
    mouse: /игров/i,
    keyboards: /игров/i,
    office_chair: /игров|геймерск/i,
  },
  office: {
    headphones: /с микрофоном|гарнитур|охватывающ|накладн/i,
    office_chair: /офисн/i,
  },
};

/**
 * Выбор пунктов сетапа для бюджета Bk. Возвращает { items, total, notes }.
 * gamingIndex — игровой индекс подобранного ПК (для выбора монитора).
 */
function choose(ids, pools, Bk, purpose, gamingIndex) {
  const items = {};
  const notes = {};
  let total = 0;
  const gamingLike = purpose === 'gaming' || purpose === 'universal';
  const prefs = PREFS[gamingLike ? 'gaming' : 'office'];
  for (const id of ids) {
    const list = pools[id] || [];
    if (!list.length) continue;
    const target = Catalog.setupTarget(id, Bk);
    let it = null;
    if (id === 'display') {
      for (const cls of monitorClasses(purpose, gamingIndex, target)) {
        it = pickNear(list, target, (m) => m.specs && MONITOR_CLASS[cls].ok(m.specs));
        if (it) {
          notes[id] = gamingLike ? `${MONITOR_CLASS[cls].label} — под мощность вашей видеокарты` : `${MONITOR_CLASS[cls].label} — для работы и учёбы`;
          break;
        }
      }
    }
    if (!it && prefs[id]) it = pickNear(list, target, (x) => prefs[id].test(x.description || '') || prefs[id].test(x.name));
    if (!it) it = pickNear(list, target);
    if (!it) it = list[0]; // всё дороже цели — берём самый доступный
    items[id] = it;
    total += it.price;
  }
  return { items, total, notes };
}

/** Целевой резерв на сетап до подбора ПК. */
function reserve(ids, Bk) {
  return ids.reduce((s, id) => s + Catalog.setupTarget(id, Bk), 0);
}

/** Альтернативы для пункта сетапа: дешевле и дороже. */
function alternatives(list, cur) {
  const sorted = list.filter((x) => x.id !== cur.id).sort((a, b) => a.price - b.price);
  const lower = sorted.filter((x) => x.price <= cur.price).slice(-3);
  const upper = sorted.filter((x) => x.price > cur.price).slice(0, 4);
  return lower.concat(upper).map((item) => ({
    item,
    diff: Math.round((item.price - cur.price) * 100) / 100,
    perf: [item.reviews ? `★ ${item.rating.toFixed(1)} (${item.reviews})` : null, ...String(item.description || '').split(/,\s*/).slice(0, 3)].filter(Boolean).join(', '),
  }));
}

module.exports = { gather, choose, reserve, alternatives, monitorClasses, MONITOR_CLASS };
