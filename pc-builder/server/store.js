'use strict';
// Простое хранилище в JSON-файле: сохранённые сборки, настройки, кэш курсов.

const fs = require('fs');
const path = require('path');
const os = require('os');

let dir = process.env.PC_PODBOR_DATA || path.join(os.homedir(), '.pc-podbor');
let data = null;

function file() {
  return path.join(dir, 'data.json');
}

function setDir(d) {
  dir = d;
  data = null;
}

function load() {
  if (data) return data;
  try {
    data = JSON.parse(fs.readFileSync(file(), 'utf8'));
  } catch {
    data = {};
  }
  return data;
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = file() + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
      fs.renameSync(tmp, file());
    } catch (e) {
      console.error('Не удалось сохранить данные:', e.message);
    }
  }, 150);
}

function get(key) {
  return load()[key];
}

function set(key, value) {
  load()[key] = value;
  save();
}

module.exports = { get, set, setDir, dataDir: () => dir };
