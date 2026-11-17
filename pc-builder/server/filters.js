'use strict';
// Фильтры каталога Onliner («фасеты»): описание фильтров категории и объединение
// пользовательских фильтров с условиями, которые ставит сам подбор.

const { getJSON } = require('./http');

const API = 'https://catalog.onliner.by/sdapi/catalog.api/facets/';

// Служебные фильтры Onliner, бесполезные для подбора комплектующих
const HIDDEN = new Set([
  'is_prime', 'is_by_parts', 'on_sale', 'is_installment', 'second_location', 'shops', 'shops_second', 'has_promo',
  'is_cashless', 'delivery', 'sticker_new_product', 'sticker_recommended', 'birthday',
]);

const GROUP_TITLES = { general: 'Основные', additional: 'Дополнительно' };

/** Описание фильтров категории в упрощённом виде для интерфейса. */
async function facets(schema) {
  const data = await getJSON(API + encodeURIComponent(schema), { ttl: 6 * 60 * 60 * 1000 });
  const dicts = data.dictionaries || {};
  const ph = data.placeholders || {};
  const groups = [];
  for (const [gid, g] of Object.entries(data.facets || {})) {
    const items = [];
    for (const it of g.items || []) {
      if (HIDDEN.has(it.parameter_id)) continue;
      if (it.visible_in_segments && !it.visible_in_segments.includes('catalog')) continue;
      const out = {
        id: it.parameter_id,
        type: it.type,
        name: it.name,
        description: (it.description || '').replace(/<[^>]+>/g, '').trim(),
      };
      if (it.type === 'dictionary' || it.type === 'dictionary_range') {
        const values = Array.isArray(dicts[it.dictionary_id]) ? dicts[it.dictionary_id] : [];
        out.values = values.map((v) => ({ id: String(v.id), name: v.name }));
        out.popular = (it.popular_dictionary_values || []).map(String);
        if (!out.values.length) continue;
      } else if (it.type === 'number_range') {
        out.unit = it.unit || '';
        out.ratio = it.ratio || 1;
        if (ph[it.parameter_id]) out.placeholder = ph[it.parameter_id];
        if (Array.isArray(it.predefined_ranges)) out.ranges = it.predefined_ranges;
      } else if (it.type === 'boolean') {
        out.boolType = it.bool_type || 'checkbox';
      } else continue;
      items.push(out);
    }
    if (items.length) groups.push({ id: gid, title: GROUP_TITLES[gid] || gid, items });
  }
  return { schema, groups };
}

// ---------------------------------------------------------------- проверка и объединение

const ID_RE = /^[\w-]{1,40}$/;

/** Приводит фильтры из запроса к безопасному виду: { param: [ids] | {from,to} | 0/1 }. */
function sanitize(filters) {
  const out = {};
  if (!filters || typeof filters !== 'object') return out;
  for (const [k, v] of Object.entries(filters)) {
    if (!ID_RE.test(k) || HIDDEN.has(k)) continue;
    if (Array.isArray(v)) {
      const arr = v.map(String).filter((x) => ID_RE.test(x)).slice(0, 60);
      if (arr.length) out[k] = arr;
    } else if (v && typeof v === 'object') {
      const r = {};
      for (const side of ['from', 'to']) {
        const s = v[side];
        if (s === undefined || s === null || s === '') continue;
        if (typeof s === 'number' && isFinite(s)) r[side] = s;
        else if (typeof s === 'string' && (ID_RE.test(s) || /^-?\d+(\.\d+)?$/.test(s))) r[side] = s;
      }
      if (Object.keys(r).length) out[k] = r;
    } else if (v === 0 || v === 1 || v === true || v === false) {
      out[k] = v === true ? 1 : v === false ? 0 : v;
    }
  }
  return out;
}

/** Числовое значение для сравнения границ: 16gb → 16, 1tb → 1000, 1_2tb → 1200, dram3200 → 3200, 650 → 650. */
function rangeNum(v) {
  if (typeof v === 'number') return v;
  const s = String(v).toLowerCase();
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = s.match(/(\d+(?:[_.]\d+)?)\s*(tb|gb|mb)?/);
  if (!m) return NaN;
  let n = parseFloat(m[1].replace('_', '.'));
  if (m[2] === 'tb') n *= 1000;
  if (m[2] === 'mb') n /= 1000;
  return n;
}

function isRange(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/** Попадает ли число в диапазон фильтра (для перебора объёмов памяти/SSD). */
function inRange(num, range) {
  if (!isRange(range)) return true;
  if (range.from !== undefined && num < rangeNum(range.from) - 1e-9) return false;
  if (range.to !== undefined && num > rangeNum(range.to) + 1e-9) return false;
  return true;
}

/**
 * Объединяет параметры запроса подбора с фильтрами пользователя.
 * Списки — пересечение, диапазоны — общая часть, флаги — должны совпасть.
 * Возвращает null, если условия противоречат друг другу (запрос можно не делать).
 */
function merge(base, user) {
  const out = { ...base };
  for (const [k, uv] of Object.entries(user || {})) {
    const bv = base[k];
    if (bv === undefined || bv === null || bv === '') {
      out[k] = uv;
      continue;
    }
    if (Array.isArray(bv) && Array.isArray(uv)) {
      const inter = bv.filter((x) => uv.includes(String(x)));
      if (!inter.length) return null;
      out[k] = inter;
    } else if (isRange(bv) && isRange(uv)) {
      const r = {};
      const pick = (side, better) => {
        const a = bv[side];
        const b = uv[side];
        if (a === undefined || a === null || a === '') return b;
        if (b === undefined || b === null || b === '') return a;
        return better(rangeNum(a), rangeNum(b)) ? a : b;
      };
      r.from = pick('from', (a, b) => a >= b);
      r.to = pick('to', (a, b) => a <= b);
      if (r.from !== undefined && r.to !== undefined && rangeNum(r.from) > rangeNum(r.to)) return null;
      if (r.from === undefined) delete r.from;
      if (r.to === undefined) delete r.to;
      out[k] = r;
    } else if (!Array.isArray(bv) && !isRange(bv) && !Array.isArray(uv) && !isRange(uv)) {
      if (String(bv) !== String(uv)) return null;
    }
    // разные типы значений — оставляем условие подбора
  }
  return out;
}

/** Сколько условий задано (для бейджей). */
function countActive(f) {
  return Object.keys(f || {}).length;
}

module.exports = { facets, sanitize, merge, inRange, rangeNum, countActive, HIDDEN };
