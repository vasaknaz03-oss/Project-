'use strict';
// Общий Telegram-бот ПодборПК: пользователь нажимает в программе «Подключить Telegram», открывает бота
// по ссылке с кодом и жмёт «Старт» — бот запоминает его чат. Уведомления программа шлёт через сервер.
// Работает через long polling (getUpdates) — серверу не нужен отдельный адрес для вебхука.

const crypto = require('crypto');
const cfg = require('./config');
const db = require('./db');

let username = '';
let running = false;
let offset = 0;

async function call(method, body, timeoutMs = 40000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.telegramApi}/bot${cfg.telegramToken}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error('Telegram: ' + (data.description || 'HTTP ' + res.status));
    return data.result;
  } finally {
    clearTimeout(t);
  }
}

function enabled() {
  return !!cfg.telegramToken;
}

function botName() {
  return username;
}

/** Ссылка для привязки устройства: t.me/<бот>?start=<код>. */
function linkFor(device) {
  if (!username) throw new Error('Бот ещё не запущен');
  const code = crypto.randomBytes(12).toString('hex');
  db.dev.set(device.id, { tg_code: code });
  return { url: `https://t.me/${username}?start=${code}`, bot: username };
}

async function send(chat, text) {
  return call('sendMessage', { chat_id: chat, text: String(text).slice(0, 4000), disable_web_page_preview: false }, 20000);
}

async function handle(update) {
  const m = update.message;
  if (!m || !m.chat || m.chat.type !== 'private' || typeof m.text !== 'string') return;
  const text = m.text.trim();
  const start = text.match(/^\/start(?:\s+([a-f0-9]{24}))?$/);
  if (start && start[1]) {
    const d = db.dev.byCode(start[1]);
    if (!d) return send(m.chat.id, 'Ссылка устарела. Нажмите «Подключить Telegram» в программе ПодборПК ещё раз.');
    db.dev.set(d.id, { tg_chat: String(m.chat.id), tg_code: null });
    return send(m.chat.id, '✅ Готово! Сюда будут приходить уведомления ПодборПК: снижение цен и новые выгодные объявления.\nОтключить — командой /stop или в «Настройках» программы.');
  }
  if (start) return send(m.chat.id, 'Это бот программы ПодборПК. Чтобы получать уведомления, нажмите в программе «Настройки» → «Подключить Telegram».');
  if (text === '/stop') {
    for (const d of db.dev.byChat(m.chat.id)) db.dev.set(d.id, { tg_chat: null });
    return send(m.chat.id, 'Уведомления отключены. Подключить снова можно в «Настройках» программы.');
  }
  return send(m.chat.id, 'Я присылаю уведомления программы ПодборПК. Команды: /stop — отключить уведомления.');
}

async function loop() {
  while (running) {
    try {
      const updates = await call('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] }, 40000);
      for (const u of updates) {
        offset = u.update_id + 1;
        await handle(u).catch((e) => console.error('bot:', e.message));
      }
    } catch (e) {
      console.error('bot poll:', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function start() {
  if (!enabled() || running) return;
  try {
    const me = await call('getMe', {}, 15000);
    username = me.username;
    running = true;
    console.log(`Telegram-бот @${username} запущен`);
    loop();
  } catch (e) {
    console.error('Telegram-бот не запущен:', e.message);
  }
}

function stop() {
  running = false;
}

module.exports = { start, stop, enabled, botName, linkFor, send };
