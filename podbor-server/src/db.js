'use strict';
// Хранилище сервера: SQLite (встроен в Node.js 22+), один файл в DATA_DIR.

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

let db = null;

function open(dir) {
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(path.join(dir, 'podbor.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, created INTEGER, last_seen INTEGER,
      plan TEXT NOT NULL DEFAULT 'free', tg_chat TEXT, tg_code TEXT, app TEXT
    );
    CREATE TABLE IF NOT EXISTS usage (device TEXT, day TEXT, kind TEXT, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (device, day, kind));
    CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, t INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS spend (day TEXT PRIMARY KEY, usd REAL NOT NULL DEFAULT 0, requests INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS iplimit (ip TEXT, hour TEXT, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (ip, hour));
    CREATE INDEX IF NOT EXISTS cache_exp ON cache (expires);
  `);
  return db;
}

const day = () => new Date().toISOString().slice(0, 10);

// ---------------- устройства
const dev = {
  create(id, tokenHash, app) {
    db.prepare('INSERT INTO devices (id, token_hash, created, last_seen, app) VALUES (?, ?, ?, ?, ?)').run(id, tokenHash, Date.now(), Date.now(), app || null);
  },
  byToken(tokenHash) {
    return db.prepare('SELECT * FROM devices WHERE token_hash = ?').get(tokenHash) || null;
  },
  byCode(code) {
    return db.prepare('SELECT * FROM devices WHERE tg_code = ?').get(code) || null;
  },
  byChat(chat) {
    return db.prepare('SELECT * FROM devices WHERE tg_chat = ?').all(String(chat));
  },
  touch(id) {
    db.prepare('UPDATE devices SET last_seen = ? WHERE id = ?').run(Date.now(), id);
  },
  set(id, fields) {
    const keys = Object.keys(fields);
    db.prepare(`UPDATE devices SET ${keys.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), id);
  },
  count() {
    return db.prepare('SELECT COUNT(*) AS n FROM devices').get().n;
  },
  activeSince(t) {
    return db.prepare('SELECT COUNT(*) AS n FROM devices WHERE last_seen >= ?').get(t).n;
  },
};

// ---------------- суточные счётчики
const usage = {
  get(device, kind) {
    const r = db.prepare('SELECT n FROM usage WHERE device = ? AND day = ? AND kind = ?').get(device, day(), kind);
    return r ? r.n : 0;
  },
  add(device, kind, n = 1) {
    db.prepare('INSERT INTO usage (device, day, kind, n) VALUES (?, ?, ?, ?) ON CONFLICT (device, day, kind) DO UPDATE SET n = n + excluded.n').run(device, day(), kind, n);
  },
  today(device) {
    return Object.fromEntries(db.prepare('SELECT kind, n FROM usage WHERE device = ? AND day = ?').all(device, day()).map((r) => [r.kind, r.n]));
  },
  totals() {
    return Object.fromEntries(db.prepare('SELECT kind, SUM(n) AS n FROM usage WHERE day = ? GROUP BY kind').all(day()).map((r) => [r.kind, r.n]));
  },
  cleanup(keepDays = 40) {
    const cut = new Date(Date.now() - keepDays * 86400e3).toISOString().slice(0, 10);
    db.prepare('DELETE FROM usage WHERE day < ?').run(cut);
  },
};

// ---------------- общий кэш (один ответ на всех пользователей)
const cache = {
  get(key) {
    const r = db.prepare('SELECT value, t, expires FROM cache WHERE key = ?').get(key);
    if (!r || r.expires < Date.now()) return null;
    return { value: JSON.parse(r.value), t: r.t };
  },
  set(key, value, ttlMs) {
    db.prepare('INSERT INTO cache (key, value, t, expires) VALUES (?, ?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, t = excluded.t, expires = excluded.expires')
      .run(key, JSON.stringify(value), Date.now(), Date.now() + ttlMs);
  },
  cleanup() {
    return db.prepare('DELETE FROM cache WHERE expires < ?').run(Date.now()).changes;
  },
  count() {
    return db.prepare('SELECT COUNT(*) AS n FROM cache').get().n;
  },
};

// ---------------- расходы на ИИ
const spend = {
  today() {
    const r = db.prepare('SELECT usd, requests FROM spend WHERE day = ?').get(day());
    return r || { usd: 0, requests: 0 };
  },
  add(usd) {
    db.prepare('INSERT INTO spend (day, usd, requests) VALUES (?, ?, 1) ON CONFLICT (day) DO UPDATE SET usd = usd + excluded.usd, requests = requests + 1').run(day(), usd);
  },
};

// ---------------- защита регистрации от накрутки
const ip = {
  hit(addr) {
    const hour = new Date().toISOString().slice(0, 13);
    db.prepare('INSERT INTO iplimit (ip, hour, n) VALUES (?, ?, 1) ON CONFLICT (ip, hour) DO UPDATE SET n = n + 1').run(addr, hour);
    db.prepare('DELETE FROM iplimit WHERE hour < ?').run(new Date(Date.now() - 2 * 3600e3).toISOString().slice(0, 13));
    return db.prepare('SELECT n FROM iplimit WHERE ip = ? AND hour = ?').get(addr, hour).n;
  },
};

module.exports = { open, dev, usage, cache, spend, ip, day };
