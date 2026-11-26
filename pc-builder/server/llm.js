'use strict';
// Локальная (или любая совместимая) языковая модель вместо Anthropic: Ollama, LM Studio, llama.cpp, Jan —
// всё, что работает на компьютере пользователя бесплатно и без интернета. Также подходит любой сервис
// с OpenAI-совместимым адресом (/v1/chat/completions), если у пользователя есть к нему доступ.
//
// Ollama узнаём по /api/tags и говорим с ней «родным» /api/chat (можно задать размер контекста);
// с остальными — через /v1/chat/completions.

const { request } = require('./http');
const secrets = require('./secrets');
const { PROVIDERS, identify } = require('./aiProviders');

const DEFAULT_URL = PROVIDERS.ollama.url;

// Откуда брать настройки: в программе — из «Настроек», на сервере ПодборПК — из переменных окружения
let configProvider = () => {
  const s = secrets.all();
  const provider = s.aiProvider || secrets.legacyProvider(s);
  if (!provider || provider === 'anthropic' || provider === 'server') return null;
  return { ...secrets.providerProfile(provider, s), provider };
};
function setConfigProvider(fn) {
  configProvider = fn;
}

function config() {
  const c = configProvider();
  if (!c || !c.model) return null;
  const url = base(c.url || DEFAULT_URL);
  const provider = c.provider || identify(url, c.kind);
  const kind = provider === 'deepseek' || provider === 'openai' ? 'openai' : c.kind;
  return { ...c, url, provider, kind, cloud: !isLocal(url) };
}

function available() {
  return !!config();
}

/** Адрес без хвостов: «http://localhost:1234/v1/» → «http://localhost:1234». */
function base(url) {
  let u = String(url || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u.replace(/\/v1$/i, '').replace(/\/api$/i, '');
}

function isLocal(url) {
  try {
    const host = new URL(url).hostname;
    return /^(localhost|0\.0\.0\.0|\[::1\])$/i.test(host)
      || /^(127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\d+\./.test(host) && /^[\d.]+$/.test(host);
  } catch {
    return false;
  }
}

function normalizedAddress(input) {
  if (!input || (/^[a-z][a-z\d+.-]*:\/\//i.test(input) && !/^https?:\/\//i.test(input))) throw new Error();
  const addr = new URL(base(input));
  if (addr.username || addr.password || addr.search || addr.hash) throw new Error();
  return addr.href.replace(/\/$/, '');
}

function providerConfig(provider, { url, model, key } = {}) {
  const preset = PROVIDERS[provider];
  const saved = secrets.providerProfile(provider);
  let root;
  try {
    const input = preset.fixedUrl ? preset.url : url || saved.url || preset.url;
    root = normalizedAddress(input);
  } catch {
    throw new Error('Введите адрес API без логина, пароля и параметров.');
  }
  let secret = key || '';
  if (!secret && saved.url && saved.key) {
    try {
      if (normalizedAddress(saved.url) === root) secret = saved.key;
    } catch {
      // Не переносим сохранённый ключ с некорректного адреса.
    }
  }
  const cloud = !isLocal(root);
  if (preset.keyRequired && !secret) throw new Error('Введите ключ API этого провайдера.');
  if (cloud && secret && !root.startsWith('https://')) throw new Error('Для внешнего адреса с ключом API используйте HTTPS.');
  return { url: root, model: model || saved.model || preset.model || '', kind: preset.kind, key: secret, provider, cloud };
}

const apiPath = (c, path) => c.provider === 'deepseek' ? path : '/v1' + path;

function hostName(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function friendly(e, c) {
  if (e && e.llm) return e;
  const msg = String((e && (e.cause && e.cause.code)) || (e && e.message) || e);
  if (/ECONNREFUSED|ECONNRESET|ENOTFOUND|EHOSTUNREACH|ERR_CONNECTION|ERR_NAME|fetch failed|Таймаут/i.test(msg)) {
    return mark(new Error(isLocal(c.url)
      ? `Модель не отвечает по адресу ${hostName(c.url)}. Запустите Ollama (или LM Studio с включённым сервером) и проверьте адрес в «Настройках».`
      : `Нет связи с ${hostName(c.url)}. Проверьте адрес и интернет.`));
  }
  return mark(e instanceof Error ? e : new Error(msg));
}

const mark = (e) => Object.assign(e, { llm: true });

async function call(c, path, body, timeout) {
  const headers = { 'Content-Type': 'application/json' };
  if (c.key) headers.Authorization = 'Bearer ' + c.key;
  const res = await request(c.url + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, redirect: c.key ? 'error' : 'follow' }, timeout);
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data && (data.error && (data.error.message || data.error))) || text.slice(0, 200) || `HTTP ${res.status}`;
    const e = new Error(c.key ? String(err).replaceAll(c.key, '[ключ API]') : String(err));
    e.status = res.status;
    throw e;
  }
  return data || {};
}

/**
 * Какая программа отвечает по адресу и какие модели в ней есть.
 * → { kind: 'ollama' | 'openai', url, models: [{ id, size }] }
 */
async function probe(url, key = '', provider) {
  const root = base(url || DEFAULT_URL);
  const c = { url: root, key, provider: provider || identify(root) };
  const ollama = provider ? provider === 'ollama' : !['openai', 'deepseek'].includes(c.provider);
  try {
    if (ollama) {
      try {
        const d = await call(c, '/api/tags', null, 8000);
        if (Array.isArray(d.models)) {
          return { kind: 'ollama', url: c.url, models: d.models.map((m) => ({ id: m.name || m.model, size: m.size || 0 })).filter((m) => m.id) };
        }
        if (provider === 'ollama') throw new Error('По этому адресу не найден сервер Ollama.');
      } catch (e) {
        if (provider === 'ollama') throw e;
        // Для старых подключений определяем тип сервера автоматически.
      }
    }
    const d = await call(c, apiPath(c, '/models'), null, 8000);
    const list = Array.isArray(d.data) ? d.data : Array.isArray(d.models) ? d.models : [];
    return { kind: 'openai', url: c.url, models: list.map((m) => ({ id: m.id || m.name, size: 0 })).filter((m) => m.id) };
  } catch (e) {
    if (e.status === 401 || e.status === 403) throw mark(new Error('Сервис не принял ключ доступа. Проверьте его.'));
    throw friendly(e, c);
  }
}

/**
 * Скачать модель в Ollama (как «ollama pull»), с прогрессом: onProgress({ status, total, completed }).
 */
async function pull(url, model, onProgress = () => {}) {
  const c = { url: base(url || DEFAULT_URL), key: '' };
  let res;
  try {
    res = await request(c.url + '/api/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: true }) }, 60000);
  } catch (e) {
    throw friendly(e, c);
  }
  if (!res.ok) throw mark(new Error(`Ollama не смогла начать загрузку (${res.status}): ${(await res.text()).slice(0, 200)}`));
  const dec = new TextDecoder();
  let buf = '';
  const handle = (line) => {
    if (!line.trim()) return;
    let m;
    try {
      m = JSON.parse(line);
    } catch {
      return;
    }
    if (m.error) throw mark(new Error(/not found|manifest/i.test(m.error) ? `Модели «${model}» нет в библиотеке Ollama. Проверьте название на ollama.com/library.` : 'Ollama: ' + m.error));
    onProgress({ status: m.status || '', total: m.total || 0, completed: m.completed || 0 });
  };
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      handle(buf.slice(0, i));
      buf = buf.slice(i + 1);
    }
  }
  handle(buf);
  return { ok: true };
}

/** Убрать «размышления» моделей вроде Qwen3/DeepSeek-R1 из ответа. */
function clean(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '').trim();
}

/**
 * Один запрос к модели. json — JSON-схема ответа (если нужен структурированный ответ).
 * → { text, usage: { input, output }, model }
 */
async function chat({ system, user, json = null, maxTokens = 1500, ctx = 8192, temperature = 0.3, timeout = 15 * 60 * 1000 }, c = config()) {
  if (!c) throw mark(Object.assign(new Error('Модель не настроена. Откройте «Настройки» → «ИИ-помощник и YouTube».'), { code: 'NO_KEY' }));
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
  let kind = c.kind;
  if (!kind) {
    kind = (await probe(c.url, c.key).catch(() => ({ kind: 'openai' }))).kind;
  }
  try {
    if (kind === 'ollama') {
      const body = { model: c.model, messages, stream: false, think: false, options: { num_ctx: ctx, temperature, num_predict: maxTokens } };
      if (json) body.format = json;
      let d;
      try {
        d = await call(c, '/api/chat', body, timeout);
      } catch (e) {
        // Старые версии Ollama и модели без «размышлений» не знают параметр think
        if (e.status === 400 && /think/i.test(e.message)) {
          delete body.think;
          d = await call(c, '/api/chat', body, timeout);
        } else throw e;
      }
      return { text: clean(d.message && d.message.content), usage: { input: d.prompt_eval_count || 0, output: d.eval_count || 0 }, model: c.model };
    }
    const body = { model: c.model, messages, stream: false };
    if (c.provider === 'openai') {
      body.max_completion_tokens = maxTokens;
      body.store = false;
      if (/^gpt-6(?:[.-]|$)/.test(c.model)) body.reasoning_effort = 'none';
    } else {
      body.temperature = temperature;
      body.max_tokens = maxTokens;
      if (c.provider === 'deepseek') body.thinking = { type: 'disabled' };
    }
    if (json) body.response_format = c.provider === 'deepseek' ? { type: 'json_object' }
      : { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: json } };
    const path = apiPath(c, '/chat/completions');
    let d;
    try {
      d = await call(c, path, body, timeout);
    } catch (e) {
      // Не все программы умеют response_format — тогда просим JSON словами
      if (json && e.status === 400) {
        delete body.response_format;
        d = await call(c, path, body, timeout);
      } else throw e;
    }
    const ch = d.choices && d.choices[0];
    const u = d.usage || {};
    return { text: clean(ch && ch.message && ch.message.content), usage: { input: u.prompt_tokens || 0, output: u.completion_tokens || 0 }, model: d.model || c.model };
  } catch (e) {
    if (e.status === 404 || /not found|no such model|model .* not/i.test(e.message || '')) {
      throw mark(new Error(kind === 'ollama'
        ? `Модель «${c.model}» не скачана. Выполните в терминале: ollama pull ${c.model}`
        : `Модель «${c.model}» недоступна. Проверьте её название и доступ к ней в «Настройках».`));
    }
    if (e.status === 403 && /country|region|territor/i.test(e.message)) throw mark(new Error('Провайдер ограничивает доступ из вашего региона.'));
    if (e.status === 401 || e.status === 403) throw mark(new Error('Сервис модели не принял ключ доступа. Проверьте ключ и доступ к модели в «Настройках».'));
    if (e.status === 429) throw mark(new Error('Сервис модели просит подождать (лимит запросов). Повторите через минуту.'));
    if (e.status) throw mark(new Error(`Модель ответила ошибкой (${e.status}): ${String(e.message).slice(0, 200)}`));
    throw friendly(e, c);
  }
}

/** Достать JSON из ответа, даже если модель обернула его в ```json … ``` или добавила слова. */
function parseJSON(text) {
  const t = String(text || '').replace(/```(?:json)?/gi, '');
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(t.slice(a, b + 1));
      } catch {
        // ниже — общая ошибка
      }
    }
  }
  throw mark(new Error('Модель ответила не в том формате. Повторите или выберите модель побольше.'));
}

function label() {
  const c = config();
  return c ? c.model : null;
}

module.exports = { probe, pull, chat, parseJSON, available, config, label, setConfigProvider, base, clean, providerConfig, DEFAULT_URL };
