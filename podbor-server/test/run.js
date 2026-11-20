'use strict';
// Проверка сервера ПодборПК без настоящих ключей: поддельные Telegram, YouTube и ИИ.
const assert = require('assert');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'podbor-srv-'));
// Поддельные Telegram и YouTube
const tgSent = [];
let pendingStart = null;
const mock = http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => (b += c)).on('end', () => {
    const ok = (result) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, result })); };
    if (req.url.startsWith('/yt/search')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ items: [{ id: { videoId: 'v1' }, snippet: { title: 'Обзор RTX 5070', channelTitle: 'Канал', publishedAt: '2026-01-01T00:00:00Z', description: '', thumbnails: {} } }] })); }
    if (req.url.startsWith('/yt/commentThreads')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ items: [] })); }
    // Поддельная Ollama (своя модель на сервере)
    if (req.url === '/api/tags') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ models: [{ name: 'qwen3:4b' }] })); }
    if (req.url === '/api/chat') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ message: { content: '## Коротко\nПо отзывам тихая [1]' }, prompt_eval_count: 900000, eval_count: 900000 })); }
    const m = req.url.match(/^\/bot[^/]+\/(\w+)/);
    const body = b ? JSON.parse(b) : {};
    if (!m) { res.writeHead(404); return res.end(); }
    if (m[1] === 'getMe') return ok({ username: 'podbor_test_bot' });
    if (m[1] === 'getUpdates') {
      if (pendingStart) { const u = [{ update_id: 1, message: { chat: { id: 777, type: 'private' }, text: '/start ' + pendingStart } }]; pendingStart = null; return ok(u); }
      return setTimeout(() => ok([]), 200);
    }
    if (m[1] === 'sendMessage') { tgSent.push(body); return ok({ message_id: 1 }); }
    ok(true);
  });
}).listen(0);
const mockUrl = `http://127.0.0.1:${mock.address().port}`;

Object.assign(process.env, {
  DATA_DIR: tmp, PORT: '0', HOST: '127.0.0.1', ADMIN_TOKEN: 'admin-secret-token', ANTHROPIC_API_KEY: 'sk-ant-test', YOUTUBE_API_KEY: 'yt-test',
  TELEGRAM_BOT_TOKEN: '123:abc', TELEGRAM_API: mockUrl, YOUTUBE_API: mockUrl + '/yt', AI_DAILY_BUDGET_USD: '0.05', LIMIT_FREE_RESEARCH: '2',
});

const srv = require('../src/index');
const ai = require(path.join(__dirname, '..', '..', 'pc-builder', 'server', 'ai'));
let aiCalls = 0;
ai._setClientForTests({ beta: { messages: { stream: () => { aiCalls++; return { finalMessage: async () => ({ stop_reason: 'end_turn', model: 'claude-opus-5-5', usage: { input_tokens: 5000, output_tokens: 1000, server_tool_use: { web_search_requests: 2 } }, content: [{ type: 'text', text: '## Коротко\nТихая карта', citations: [{ url: 'https://example.org/a', title: 'A' }] }] }) }; } } } });

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✓ ' + name); } catch (e) { failed++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}

(async () => {
  const server = srv.start();
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, p, body, token, headers = {}) => {
    const r = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, data: await r.json() };
  };
  await new Promise((r) => setTimeout(r, 300));

  let tok;
  await test('здоровье и регистрация устройства', async () => {
    const h = await call('GET', '/v1/health');
    assert.strictEqual(h.status, 200);
    assert.ok(h.data.features.ai && h.data.features.youtube && h.data.features.telegram);
    const r = await call('POST', '/v1/devices', { app: 'test' });
    assert.ok(r.data.token && r.data.id);
    tok = r.data.token;
    assert.strictEqual((await call('GET', '/v1/me')).status, 401, 'без токена — 401');
    const me = await call('GET', '/v1/me', null, tok);
    assert.strictEqual(me.data.plan, 'free');
  });

  await test('ИИ: общий кэш — второй пользователь получает тот же ответ без нового запроса', async () => {
    const r1 = await call('POST', '/v1/ai/research', { query: 'RTX 5070', mode: 'part' }, tok);
    assert.strictEqual(r1.status, 200, JSON.stringify(r1.data));
    assert.ok(/Тихая карта\[1\]/.test(r1.data.text));
    assert.strictEqual(r1.data.usage, undefined, 'расходы наружу не отдаются');
    const t2 = (await call('POST', '/v1/devices', {})).data.token;
    const r2 = await call('POST', '/v1/ai/research', { query: '  rtx 5070 ', mode: 'part' }, t2);
    assert.strictEqual(r2.data.cached, true);
    assert.strictEqual(aiCalls, 1);
  });

  await test('ИИ: дневной бюджет сервера', async () => {
    // первый запрос стоил 5000×4/1e6 + 1000×20/1e6 + 2×10/1000 = 0.06 $ > 0.05 $
    const r = await call('POST', '/v1/ai/research', { query: 'другой вопрос', mode: 'oc' }, tok);
    assert.strictEqual(r.status, 429);
    assert.ok(/бюджет/i.test(r.data.error));
  });

  await test('YouTube: кэш на всех, видео со ссылкой и каналом', async () => {
    const r = await call('GET', '/v1/youtube?q=' + encodeURIComponent('RTX 5070 обзор'), null, tok);
    assert.strictEqual(r.status, 200, JSON.stringify(r.data) + " ");
    assert.strictEqual(r.data.videos[0].url, 'https://www.youtube.com/watch?v=v1');
    assert.strictEqual(r.data.videos[0].channel, 'Канал');
    const r2 = await call('GET', '/v1/youtube?q=' + encodeURIComponent('rtx 5070  обзор'), null, tok);
    assert.strictEqual(r2.data.cached, true);
  });

  await test('fetch: только разрешённые адреса Onliner/Kufar', async () => {
    const bad = await call('GET', '/v1/fetch?u=' + encodeURIComponent('https://evil.example/x'), null, tok);
    assert.strictEqual(bad.status, 400);
    const bad2 = await call('GET', '/v1/fetch?u=' + encodeURIComponent('http://catalog.onliner.by/sdapi/catalog.api/search/cpu'), null, tok);
    assert.strictEqual(bad2.status, 400, 'только https');
  });

  await test('Kufar: условия поиска очищаются', async () => {
    const q = srv.cleanKufarQuery({ kq: { query: 'rtx', cat: '16040', params: { cct: '11', 'bad key': 'x', ccvc: ['1', '2'] } }, min: '100', cond: 'hack' });
    assert.deepStrictEqual(q.params, { cct: '11', ccvc: ['1', '2'] });
    assert.strictEqual(q.cat, 16040);
    assert.strictEqual(q.condition, '');
    assert.strictEqual(q.priceMin, 100);
  });

  await test('Telegram: общий бот — привязка по ссылке и уведомление', async () => {
    const l = await call('POST', '/v1/telegram/link', {}, tok);
    assert.strictEqual(l.status, 200, JSON.stringify(l.data));
    const code = l.data.url.split('start=')[1];
    assert.ok(/^https:\/\/t\.me\/podbor_test_bot\?start=[a-f0-9]{24}$/.test(l.data.url));
    pendingStart = code;
    for (let i = 0; i < 30 && !(await call('GET', '/v1/telegram/status', null, tok)).data.linked; i++) await new Promise((r) => setTimeout(r, 100));
    assert.ok((await call('GET', '/v1/telegram/status', null, tok)).data.linked);
    const n = await call('POST', '/v1/notify', { title: 'Цена снизилась', body: 'RTX 5070: 2300 → 2100', url: 'https://catalog.onliner.by/x' }, tok);
    assert.strictEqual(n.status, 200);
    assert.ok(tgSent.some((m) => m.chat_id === '777' && /Цена снизилась/.test(m.text)));
  });

  await test('админка: статистика только с токеном', async () => {
    assert.strictEqual((await call('GET', '/v1/admin/stats')).status, 403);
    const s = await call('GET', '/v1/admin/stats', null, null, { 'x-admin-token': 'admin-secret-token' });
    assert.strictEqual(s.status, 200);
    assert.ok(s.data.devices >= 2);
    assert.ok(s.data.aiSpendToday.usd > 0.05);
  });

  await test('своя модель вместо Anthropic: ИИ включён, бюджет не тратится', async () => {
    const cfg = require('../src/config');
    const APP = path.join(__dirname, '..', '..', 'pc-builder', 'server');
    const news = require(path.join(APP, 'news'));
    const onliner = require(path.join(APP, 'providers', 'onliner'));
    const orig = { s: news.searchArticles, o: onliner.search };
    news.searchArticles = async () => ({ items: [{ link: 'https://example.org/a', title: 'Обзор RTX 9070', summary: 'Тихая и холодная видеокарта, хорошо держит частоты в играх, драйверы стабильные, писка нет.' }] });
    onliner.search = async () => ({ items: [] });
    const saved = { key: cfg.anthropicKey, llm: cfg.llm, budget: cfg.aiDailyBudgetUsd };
    Object.assign(cfg, { anthropicKey: '', llm: { url: mockUrl, model: 'qwen3:4b', kind: 'ollama' }, aiDailyBudgetUsd: 0 });
    try {
      const h = await call('GET', '/v1/health');
      assert.strictEqual(h.data.features.ai, true);
      const d = await call('POST', '/v1/devices', {});
      const r = await call('POST', '/v1/ai/research', { query: 'RTX 9070', mode: 'part' }, d.data.token);
      assert.strictEqual(r.status, 200, JSON.stringify(r.data) + " ");
      assert.strictEqual(r.data.engine, 'local');
      assert.ok(/тихая \[1\]/.test(r.data.text));
    } finally {
      Object.assign(cfg, { anthropicKey: saved.key, llm: saved.llm, aiDailyBudgetUsd: saved.budget });
      news.searchArticles = orig.s;
      onliner.search = orig.o;
    }
  });

  console.log(`\nПройдено: ${passed}, ошибок: ${failed}`);
  server.close();
  mock.close();
  process.exit(failed ? 1 : 0);
})();
