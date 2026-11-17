'use strict';
// Курсы валют: НБРБ → калькулятор Kufar → встроенные примерные значения.
// Все курсы — сколько BYN стоит 1 единица валюты.

const { getJSON } = require('./http');
const store = require('./store');

const NBRB = 'https://api.nbrb.by/exrates/rates?periodicity=0';
const KUFAR = 'https://api.kufar.by/search-api/v2/search/rendered-paginated?lang=ru&cat=16010&size=30';

const WANTED = ['USD', 'EUR', 'RUB', 'PLN', 'CNY', 'UAH', 'KZT', 'GBP'];
const FALLBACK = { USD: 3.0, EUR: 3.45, RUB: 0.0365, PLN: 0.81, CNY: 0.42 };

const NAMES = {
  BYN: 'Белорусский рубль', USD: 'Доллар США', EUR: 'Евро', RUB: 'Российский рубль', PLN: 'Злотый',
  CNY: 'Юань', UAH: 'Гривна', KZT: 'Тенге', GBP: 'Фунт стерлингов',
};
const SYMBOLS = { BYN: 'р.', USD: '$', EUR: '€', RUB: '₽', PLN: 'zł', CNY: '¥', UAH: '₴', KZT: '₸', GBP: '£' };

let current = null;
const TTL = 6 * 60 * 60 * 1000;

async function fromNbrb() {
  const data = await getJSON(NBRB, { ttl: TTL, timeout: 8000, retries: 1 });
  const rates = {};
  for (const r of data) {
    if (WANTED.includes(r.Cur_Abbreviation)) rates[r.Cur_Abbreviation] = r.Cur_OfficialRate / r.Cur_Scale;
  }
  if (!rates.USD) throw new Error('НБРБ: нет курса USD');
  return { rates, source: 'НБРБ (официальный курс)', date: data[0] && data[0].Date };
}

async function fromKufar() {
  const kufar = require('./providers/kufar');
  const data = await getJSON(KUFAR, { ttl: TTL, timeout: 8000, retries: 1 });
  const rates = kufar.ratesFromAds(data.ads);
  if (!rates.USD) throw new Error('Kufar: нет курса');
  return { rates, source: 'Kufar (курс площадки)', date: new Date().toISOString() };
}

async function getRates(force = false) {
  if (!force && current && Date.now() - current.fetchedAt < TTL) return withManual(current);
  const errors = [];
  for (const fn of [fromNbrb, fromKufar]) {
    try {
      const r = await fn();
      current = { ...r, fetchedAt: Date.now() };
      store.set('rates-cache', current);
      return withManual(current);
    } catch (e) {
      errors.push(e.message);
    }
  }
  const cached = store.get('rates-cache');
  if (cached && cached.rates) {
    current = { ...cached, source: cached.source + ', сохранённый', fetchedAt: Date.now() - TTL + 10 * 60 * 1000 };
    return withManual(current);
  }
  current = {
    rates: { ...FALLBACK }, source: 'примерный курс (нет связи с НБРБ и Kufar)', date: null,
    fetchedAt: Date.now() - TTL + 5 * 60 * 1000, errors,
  };
  return withManual(current);
}

/** Ручные курсы из настроек перекрывают загруженные. */
function withManual(r) {
  const settings = store.get('settings') || {};
  const manual = settings.manualRates || {};
  const rates = { BYN: 1, ...r.rates };
  let usedManual = false;
  for (const [k, v] of Object.entries(manual)) {
    if (v && +v > 0) {
      rates[k] = +v;
      usedManual = true;
    }
  }
  const order = ['BYN', ...WANTED];
  const list = Object.keys(rates).filter((k) => NAMES[k]).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return {
    rates,
    source: usedManual ? r.source + ' + ручные курсы' : r.source,
    date: r.date,
    currencies: list.map((code) => ({ code, name: NAMES[code], symbol: SYMBOLS[code] || code })),
  };
}

module.exports = { getRates, NAMES, SYMBOLS };
