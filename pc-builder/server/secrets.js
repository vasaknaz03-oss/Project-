'use strict';
// Ключи внешних сервисов (Telegram, Anthropic, YouTube, локальная модель). Хранятся только на этом компьютере, в файле данных
// программы, и не отдаются интерфейсу целиком — только «задан / не задан» и последние символы.

const store = require('./store');
const { PROVIDERS, identify } = require('./aiProviders');

const KEYS = ['telegramToken', 'telegramChatId', 'telegramBot', 'anthropicKey', 'youtubeKey', 'serverToken', 'serverDevice', 'serverUrl', 'llmUrl', 'llmModel', 'llmKind', 'llmKey'];

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

function legacyProvider(s = all()) {
  if (!s.llmModel) return null;
  try {
    return identify(s.llmUrl || PROVIDERS.ollama.url, s.llmKind);
  } catch {
    return 'custom';
  }
}

function activeProvider(s = all()) {
  return s.aiProvider || (s.anthropicKey ? 'anthropic' : legacyProvider(s)) || 'server';
}

function providerProfile(id, s = all()) {
  if (id === 'anthropic') return { key: s.anthropicKey || '' };
  if (s.llmProfiles && Object.hasOwn(s.llmProfiles, id)) return s.llmProfiles[id];
  if (id === legacyProvider(s)) return { url: s.llmUrl, model: s.llmModel, kind: s.llmKind, key: s.llmKey };
  return {};
}

function saveProvider(id, profile) {
  const cur = { ...all(), aiProvider: id };
  if (id === 'anthropic') cur.anthropicKey = profile.key;
  else if (id !== 'server') cur.llmProfiles = { ...cur.llmProfiles, [id]: profile };
  store.set('secrets', cur);
  return masked();
}

function removeProvider(id) {
  const cur = { ...all() };
  const active = activeProvider(cur);
  if (id === 'anthropic') delete cur.anthropicKey;
  else {
    if (id === legacyProvider(cur)) {
      for (const k of ['llmUrl', 'llmModel', 'llmKind', 'llmKey']) delete cur[k];
    }
    cur.llmProfiles = { ...cur.llmProfiles, [id]: {} };
  }
  if (id === active) cur.aiProvider = 'server';
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
    // Локальная модель: адрес и название не секрет, ключ (для внешних сервисов) — только «задан»
    llm: { set: !!s.llmModel, url: s.llmUrl || '', model: s.llmModel || '', kind: s.llmKind || '', key: !!s.llmKey },
    ai: {
      active: activeProvider(s),
      providers: Object.entries(PROVIDERS).map(([id, preset]) => {
        const profile = providerProfile(id, s);
        return { id, ...preset, saved: { url: profile.url, model: profile.model, key: !!profile.key } };
      }),
    },
  };
}

module.exports = { get, set, masked, all, legacyProvider, activeProvider, providerProfile, saveProvider, removeProvider };
