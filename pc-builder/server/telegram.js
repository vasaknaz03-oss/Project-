'use strict';
// Уведомления на телефон через Telegram-бота пользователя.
// Как подключить: в Telegram написать @BotFather → /newbot → получить токен → вставить в «Настройках»,
// затем открыть своего бота и нажать «Старт». Программа сама узнает, куда слать сообщения.

const { request } = require('./http');
const secrets = require('./secrets');

const API = process.env.TELEGRAM_API || 'https://api.telegram.org';
const TOKEN_RE = /^\d{5,15}:[A-Za-z0-9_-]{30,60}$/;

async function call(token, method, body) {
  const res = await request(`${API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  }, 20000);
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    const error = res.status === 401 || res.status === 404
      ? new Error('Telegram не принял токен — проверьте, что скопировали его целиком из сообщения @BotFather')
      : new Error('Telegram: ' + (data.description || 'HTTP ' + res.status));
    error.rejected = data.ok === false;
    throw error;
  }
  return data.result;
}

/** Шаг 1: проверяем токен и запоминаем бота. */
async function connect(token) {
  token = String(token || '').trim();
  if (!TOKEN_RE.test(token)) throw new Error('Это не похоже на токен бота. Он выглядит так: 123456789:AAH…, его присылает @BotFather');
  const me = await call(token, 'getMe');
  secrets.set({ telegramToken: token, telegramBot: me.username, telegramChatId: '' });
  return { bot: me.username, link: `https://t.me/${me.username}` };
}

/** Шаг 2: ждём, пока пользователь нажмёт «Старт» у своего бота, и запоминаем чат. */
async function link() {
  const token = secrets.get('telegramToken');
  if (!token) throw new Error('Сначала вставьте токен бота');
  if (secrets.get('telegramChatId')) return { linked: true };
  const updates = await call(token, 'getUpdates', { timeout: 0, allowed_updates: ['message'] });
  const msg = [...updates].reverse().map((u) => u.message).find((m) => m && m.chat && m.chat.type === 'private');
  if (!msg) return { linked: false };
  secrets.set({ telegramChatId: String(msg.chat.id) });
  // Подтверждаем, чтобы старые сообщения больше не приходили в getUpdates
  const last = updates[updates.length - 1];
  if (last) await call(token, 'getUpdates', { offset: last.update_id + 1, timeout: 0 }).catch(() => {});
  await send('✅ ПодборПК подключён. Сюда будут приходить уведомления о снижении цен и новых выгодных объявлениях.');
  return { linked: true, name: [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(' ') };
}

function connected() {
  return !!(secrets.get('telegramToken') && secrets.get('telegramChatId'));
}

async function send(text, replyMarkup) {
  const token = secrets.get('telegramToken');
  const chat = secrets.get('telegramChatId');
  if (!token || !chat) throw Object.assign(new Error('Telegram не подключён'), { rejected: true });
  return call(token, 'sendMessage', { chat_id: chat, text: String(text).slice(0, 4000), disable_web_page_preview: false,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

function kufarNotification(ad) {
  const id = String(ad?.id || '');
  const name = typeof ad?.name === 'string' ? ad.name.trim().slice(0, 220) : '';
  if (!/^\d{1,16}$/.test(id) || !name) return null;
  const price = Number(ad.price);
  const url = 'https://www.kufar.by/item/' + id;
  return {
    id, url, text: ['🔔 Новое объявление Kufar', name, Number.isFinite(price) && price > 0 ? price.toLocaleString('ru-RU') + ' р.' : null, url].filter(Boolean).join('\n'),
    keyboard: { inline_keyboard: [[{ text: 'Открыть объявление', url }]] },
  };
}

function disconnect() {
  secrets.set({ telegramToken: '', telegramChatId: '', telegramBot: '' });
}

/** Событие слежения → сообщение. Ошибки сети не мешают остальной работе. */
function notifyEvent(e) {
  if (!connected()) return Promise.resolve(false);
  const text = [`🔔 ${e.title}`, e.body, e.url].filter(Boolean).join('\n');
  return send(text).then(() => true).catch(() => false);
}

module.exports = { connect, link, send, connected, disconnect, notifyEvent, kufarNotification, TOKEN_RE };
