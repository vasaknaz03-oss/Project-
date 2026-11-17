'use strict';
// Сетевой слой: кэш в памяти, ограничение параллельных запросов, таймауты и повторы.

const USER_AGENT = 'PCPodbor/1.0 (desktop app)';
const MAX_PARALLEL = 6;

const cache = new Map(); // url -> { t, data }
let active = 0;
const queue = [];

function acquire() {
  if (active < MAX_PARALLEL) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function release() {
  const next = queue.shift();
  if (next) next();
  else active--;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// В Electron подставляется net.fetch (учитывает системный прокси); в браузерном режиме — fetch Node.js
let altFetch = null;
function setAltFetch(fn) {
  altFetch = fn;
}

async function fetchOnce(url, timeout, headers, useAlt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const impl = useAlt && altFetch ? altFetch : fetch;
  try {
    const res = await impl(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', 'Accept-Language': 'ru', ...headers },
    });
    if (!res.ok) {
      throw new HttpError(`HTTP ${res.status} для ${new URL(url).host}`, res.status);
    }
    return await res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new HttpError(`Таймаут запроса к ${new URL(url).host}`, 0);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET JSON с кэшем. ttl — сколько миллисекунд держать ответ.
 */
async function getJSON(url, { ttl = 15 * 60 * 1000, timeout = 15000, headers = {}, retries = 2 } = {}) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < ttl) return hit.data;

  await acquire();
  try {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let data;
        try {
          data = await fetchOnce(url, timeout, headers, false);
        } catch (e) {
          // Сетевой сбой в fetch Node.js — пробуем запасной способ (системный прокси Electron)
          if (!altFetch || e.status !== undefined) throw e;
          data = await fetchOnce(url, timeout, headers, true);
        }
        cache.set(url, { t: Date.now(), data });
        if (cache.size > 3000) cache.delete(cache.keys().next().value);
        return data;
      } catch (e) {
        lastErr = e;
        const st = e.status;
        // 4xx (кроме 429) повторять бессмысленно
        if (st && st >= 400 && st < 500 && st !== 429) break;
        await sleep(400 * (attempt + 1) + Math.random() * 300);
      }
    }
    throw lastErr;
  } finally {
    release();
  }
}

function clearCache() {
  cache.clear();
}

/** Собирает query-string с поддержкой массивов (key[0]=) и диапазонов (key[from]=). */
function qs(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => parts.push(`${encodeURIComponent(k)}%5B${i}%5D=${encodeURIComponent(item)}`));
    } else if (typeof v === 'object') {
      for (const [sub, sv] of Object.entries(v)) {
        if (sv === undefined || sv === null || sv === '') continue;
        parts.push(`${encodeURIComponent(k)}%5B${encodeURIComponent(sub)}%5D=${encodeURIComponent(sv)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.join('&');
}

module.exports = { getJSON, clearCache, qs, HttpError, setAltFetch };
