'use strict';
// Ключи внешних сервисов (Telegram, Anthropic, YouTube). Хранятся только на этом компьютере, в файле данных
// программы, и не отдаются интерфейсу целиком — только «задан / не задан» и последние символы.

const store = require('./store');

const KEYS = ['telegramToken', 'telegramChatId', 'telegramBot', 'anthropicKey', 'youtubeKey', 'serverToken', 'serverDevice', 'serverUrl'];

function all() {
  return store.get('secrets') || {};
}

function get(key) {
  return all()[key] || '';
}

function set(patch) {
  const cur = { ...all() };
  for (const [k, v] of Object.entries(patch || {})) {
    if (!KEYS.includes(k)) continue;
    const val = typeof v === 'string' ? v.trim() : v;
    if (val === '' || val === null || val === undefined) delete cur[k];
    else cur[k] = val;
  }
  store.set('secrets', cur);
  return masked();
}

/** Для интерфейса: какие ключи заданы, без самих значений. */
function masked() {
  const s = all();
  const tail = (v) => (v ? '…' + String(v).slice(-4) : '');
  return {
    telegram: { connected: !!(s.telegramToken && s.telegramChatId), token: !!s.telegramToken, bot: s.telegramBot || '' },
    anthropic: { set: !!s.anthropicKey, tail: tail(s.anthropicKey) },
    youtube: { set: !!s.youtubeKey, tail: tail(s.youtubeKey) },
  };
}

module.exports = { get, set, masked, all };
