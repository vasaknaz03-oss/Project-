'use strict';
// Локальная (или любая совместимая) языковая модель вместо Anthropic: Ollama, LM Studio, llama.cpp, Jan —
// всё, что работает на компьютере пользователя бесплатно и без интернета. Также подходит любой сервис
// с OpenAI-совместимым адресом (/v1/chat/completions), если у пользователя есть к нему доступ.
//
// Ollama узнаём по /api/tags и говорим с ней «родным» /api/chat (можно задать размер контекста);
// с остальными — через /v1/chat/completions.

const { request } = require('./http');
const secrets = require('./secrets');

const DEFAULT_URL = 'http://127.0.0.1:11434';

// Откуда брать настройки: в программе — из «Настроек», на сервере ПодборПК — из переменных окружения
let configProvider = () => {
  const s = secrets.all();
  return s.llmModel ? { url: s.llmUrl || DEFAULT_URL, model: s.llmModel, key: s.llmKey || '', kind: s.llmKind || '' } : null;
};
function setConfigProvider(fn) {
  configProvider = fn;
}

function config() {
  const c = configProvider();
  return c && c.model ? { ...c, url: base(c.url || DEFAULT_URL) } : null;
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

const isLocal = (url) => /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url);

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
  const res = await request(c.url + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined }, timeout);
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data && (data.error && (data.error.message || data.error))) || text.slice(0, 200) || `HTTP ${res.status}`;
    const e = new Error(String(err));
    e.status = res.status;
    throw e;
  }
  return data || {};
}

/**
 * Какая программа отвечает по адресу и какие модели в ней есть.
 * → { kind: 'ollama' | 'openai', url, models: [{ id, size }] }
 */
async function probe(url, key = '') {
  const c = { url: base(url || DEFAULT_URL), key };
  try {
    const d = await call(c, '/api/tags', null, 8000);
    if (Array.isArray(d.models)) {
      return { kind: 'ollama', url: c.url, models: d.models.map((m) => ({ id: m.name || m.model, size: m.size || 0 })).filter((m) => m.id) };
    }
  } catch {
    // Не Ollama (или не отвечает) — пробуем OpenAI-совместимый адрес
  }
  try {
    const d = await call(c, '/v1/models', null, 8000);
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
async function chat({ system, user, json = null, maxTokens = 1500, ctx = 8192, temperature = 0.3, timeout = 15 * 60 * 1000 }) {
  const c = config();
  if (!c) throw mark(Object.assign(new Error('Локальная модель не настроена: «Настройки» → «ИИ-помощник».'), { code: 'NO_KEY' }));
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
    const body = { model: c.model, messages, temperature, max_tokens: maxTokens, stream: false };
    if (json) body.response_format = { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: json } };
    let d;
    try {
      d = await call(c, '/v1/chat/completions', body, timeout);
    } catch (e) {
      // Не все программы умеют response_format — тогда просим JSON словами
      if (json && e.status === 400) {
        delete body.response_format;
        d = await call(c, '/v1/chat/completions', body, timeout);
      } else throw e;
    }
    const ch = d.choices && d.choices[0];
    const u = d.usage || {};
    return { text: clean(ch && ch.message && ch.message.content), usage: { input: u.prompt_tokens || 0, output: u.completion_tokens || 0 }, model: d.model || c.model };
  } catch (e) {
    if (e.status === 404 || /not found|no such model|model .* not/i.test(e.message || '')) {
      throw mark(new Error(kind === 'ollama'
        ? `Модель «${c.model}» не скачана. Выполните в терминале: ollama pull ${c.model}`
        : `Модель «${c.model}» не найдена. Загрузите её в программе модели или выберите другую в «Настройках».`));
    }
    if (e.status === 401 || e.status === 403) throw mark(new Error('Сервис модели не принял ключ доступа. Проверьте его в «Настройках».'));
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

module.exports = { probe, pull, chat, parseJSON, available, config, label, setConfigProvider, base, clean, DEFAULT_URL };
