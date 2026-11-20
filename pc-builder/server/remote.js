'use strict';
// Связь программы с сервером ПодборПК. Адрес сервера задаётся при сборке (поле podborServer в package.json
// или переменная PODBOR_SERVER) и может быть изменён в «Настройках». Устройство регистрируется анонимно:
// сервер выдаёт токен, по которому считает суточные лимиты. Если сервер недоступен — программа работает сама.

const { request } = require('./http');
const store = require('./store');
const secrets = require('./secrets');

let pkgDefault = '';
try {
  pkgDefault = require('../package.json').podborServer || '';
} catch {}

const HEALTH_TTL = 10 * 60 * 1000;
let health = null;
let registering = null;

function settings() {
  return store.get('settings') || {};
}

/** Адрес сервера или '' (выключено). */
function baseUrl() {
  const st = settings();
  if (st.serverMode === 'off') return '';
  const u = (st.serverUrl || process.env.PODBOR_SERVER || pkgDefault || '').trim().replace(/\/+$/, '');
  return /^https?:\/\//.test(u) ? u : '';
}

function enabled() {
  return !!baseUrl();
}

async function raw(path, { method = 'GET', body, token, timeout = 30000 } = {}) {
  const res = await request(baseUrl() + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }, timeout);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || `Сервер ПодборПК: HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return data;
}

/** Возможности сервера (ИИ, YouTube, Telegram…); кэш 10 минут. Ошибку не бросает. */
async function status(force = false) {
  if (!enabled()) return null;
  if (!force && health && Date.now() - health.t < HEALTH_TTL && health.url === baseUrl()) return health.data;
  try {
    const data = await raw('/v1/health', { timeout: 8000 });
    health = { t: Date.now(), url: baseUrl(), data };
  } catch (e) {
    health = { t: Date.now() - HEALTH_TTL + 60 * 1000, url: baseUrl(), data: { ok: false, error: e.message, features: {} } };
  }
  return health.data;
}

async function token() {
  const t = secrets.get('serverToken');
  const u = secrets.get('serverUrl');
  if (t && u === baseUrl()) return t;
  if (!registering) {
    registering = raw('/v1/devices', { method: 'POST', body: { app: 'podborpk' } })
      .then((r) => {
        secrets.set({ serverToken: r.token, serverDevice: r.id, serverUrl: baseUrl() });
        return r.token;
      })
      .finally(() => {
        registering = null;
      });
  }
  return registering;
}

/** Запрос к серверу от имени устройства; при «устройство не найдено» регистрируется заново. */
async function call(path, opts = {}) {
  if (!enabled()) throw new Error('Сервер ПодборПК не подключён');
  let t = await token();
  try {
    return await raw(path, { ...opts, token: t });
  } catch (e) {
    if (e.status !== 401) throw e;
    secrets.set({ serverToken: '' });
    t = await token();
    return raw(path, { ...opts, token: t });
  }
}

async function has(feature) {
  const s = await status();
  return !!(s && s.ok && s.features && s.features[feature]);
}

/** Запрос открытого API Onliner/Kufar через общий кэш сервера (undefined — сервер выключен). */
async function fetchVia(url) {
  if (!enabled() || settings().serverFetch === false || !(await has('fetch'))) return undefined;
  return call('/v1/fetch?u=' + encodeURIComponent(url), { timeout: 20000 });
}

module.exports = { enabled, baseUrl, status, call, has, fetchVia };
