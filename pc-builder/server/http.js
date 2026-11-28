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
// Сервер ПодборПК: открытые API Onliner и Kufar берутся через его общий кэш (один запрос на всех пользователей).
// Если сервер недоступен — запрос идёт напрямую, как раньше.
const REMOTE_RE = /^https:\/\/(catalog\.onliner\.by\/sdapi\/catalog\.api\/|catalog\.api\.onliner\.by\/|shop\.api\.onliner\.by\/|api\.kufar\.by\/search-api\/v2\/)/;
let remoteFetch = null;
function setRemoteFetch(fn) {
  remoteFetch = fn;
}

async function getJSON(url, { ttl = 15 * 60 * 1000, timeout = 15000, headers = {}, retries = 2, useRemote = true } = {}) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < ttl) return hit.data;

  await acquire();
  try {
    if (useRemote && remoteFetch && REMOTE_RE.test(url)) {
      try {
        const data = await remoteFetch(url);
        if (data !== undefined) {
          if (ttl > 0) {
            cache.set(url, { t: Date.now(), data });
            if (cache.size > 3000) cache.delete(cache.keys().next().value);
          }
          return data;
        }
      } catch {
        // сервер не ответил или лимит — идём напрямую
      }
    }
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
        // ttl 0 — не кэшировать (большие постраничные выгрузки не должны занимать память)
        if (ttl > 0) {
          cache.set(url, { t: Date.now(), data });
          if (cache.size > 3000) cache.delete(cache.keys().next().value);
        }
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

/**
 * Текст ответа в его кодировке: часть русских сайтов (например 4PDA) отдаёт windows-1251.
 * Кодировку берём из заголовка Content-Type, иначе из <?xml encoding="…"?> или <meta charset>.
 */
function decodeBody(buf, contentType = '') {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let cs = (String(contentType).match(/charset=["']?([\w-]+)/i) || [])[1];
  if (!cs) {
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
    cs = (head.match(/<\?xml[^>]*encoding=["']([\w-]+)["']/i) || head.match(/<meta[^>]*charset=["']?([\w-]+)/i) || [])[1];
  }
  try {
    return new TextDecoder(cs || 'utf-8').decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/** GET текста (HTML) с кэшем — для данных, которых нет в JSON API. */
async function getText(url, { ttl = 12 * 60 * 60 * 1000, timeout = 20000 } = {}) {
  const key = 'text:' + url;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.data;
  await acquire();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ru' } });
      if (!res.ok) throw new HttpError(`HTTP ${res.status} для ${new URL(url).host}`, res.status);
      const data = decodeBody(await res.arrayBuffer(), res.headers.get('content-type'));
      cache.set(key, { t: Date.now(), data });
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new HttpError(`Таймаут запроса к ${new URL(url).host}`, 0);
      if (altFetch && e.status === undefined) {
        const res = await altFetch(url, { headers: { 'User-Agent': USER_AGENT } });
        const data = decodeBody(await res.arrayBuffer(), res.headers.get('content-type'));
        cache.set(key, { t: Date.now(), data });
        return data;
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  } finally {
    release();
  }
}

/** Произвольный запрос (POST и т. п.) без кэша: fetch Node.js, при сетевом сбое — системный прокси Electron. */
async function request(url, opts = {}, timeout = 20000, { singleAttempt = false } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    // Отправку сообщения нельзя повторять через другой транспорт после потери ответа.
    if (singleAttempt && altFetch) return await altFetch(url, { ...opts, signal: ctrl.signal });
    try {
      return await fetch(url, { ...opts, signal: ctrl.signal });
    } catch (e) {
      if (e.name === 'AbortError' || !altFetch) throw e;
      return await altFetch(url, opts);
    }
  } catch (e) {
    if (e.name === 'AbortError') throw new HttpError(`Таймаут запроса к ${new URL(url).host}`, 0);
    throw e;
  } finally {
    clearTimeout(timer);
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

module.exports = { request, setRemoteFetch, getJSON, getText, decodeBody, clearCache, qs, HttpError, setAltFetch };
