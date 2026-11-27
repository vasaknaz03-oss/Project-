'use strict';
// Подбор ноутбука под бюджет: разбор описания Onliner и оценка под задачу.
// Индексы приблизительные (та же шкала, что у ПК: Ryzen 5 5600 и RTX 4060 = 100).

const onliner = require('./providers/onliner');
const perf = require('./perfdb');

/** Разбор описания: «16.0" 1920x1200, IPS, 144 Гц, AMD Ryzen 7 260, 16 ГБ DDR5, SSD 512 ГБ, NVIDIA GeForce RTX 5060 8 ГБ (TGP 115 Вт), …» */
function parse(desc) {
  const d = String(desc || '');
  const s = {};
  const diag = d.match(/^([\d.]+)"/);
  s.diag = diag ? parseFloat(diag[1]) : null;
  const res = d.match(/(\d{3,4})x(\d{3,4})/);
  s.resW = res ? +res[1] : null;
  s.resH = res ? +res[2] : null;
  s.panel = (d.match(/\b(OLED|IPS|VA|TN|Mini-?LED)\b/i) || [])[1] || null;
  s.hz = +(d.match(/(\d{2,3})\s*Гц/) || [])[1] || 60;
  s.cpu = (d.match(/((?:Intel|AMD|Apple)\s[^,]+)/) || [])[1] || null;
  const ram = d.match(/(\d{1,3})\s*ГБ\s*(LPDDR\d\w*|DDR\d\w*|unified)?/i);
  s.ramGb = ram ? +ram[1] : null;
  s.ramType = ram && ram[2] ? ram[2].toUpperCase() : null;
  const ssd = d.match(/SSD\s*(\d+)\s*(ГБ|ТБ)/i);
  s.ssdGb = ssd ? +ssd[1] * (/ТБ/i.test(ssd[2]) ? 1000 : 1) : null;
  const gpu = d.match(/((?:NVIDIA\s+GeForce|AMD\s+Radeon|Intel\s+Arc)\s+(?:RTX|GTX|RX|A|B)\s*[\w ]*?\d{3,4}\w*)(?:\s+(\d+)\s*ГБ)?(?:\s*\(TGP\s*(\d+)\s*Вт\))?/i);
  s.gpu = gpu ? gpu[1].replace(/\s+/g, ' ').trim() : null;
  s.vramGb = gpu && gpu[2] ? +gpu[2] : null;
  s.tgp = gpu && gpu[3] ? +gpu[3] : null;
  s.os = /без ОС/i.test(d) ? 'нет' : (d.match(/(Windows 11 \w+|Windows 10 \w+|macOS|Linux|DOS)/i) || [])[1] || null;
  s.battery = parseFloat((d.match(/аккумулятор\s*([\d.]+)\s*Вт/i) || [])[1]) || null;
  return s;
}

/** Процессор ноутбука → индексы игры/многопоток (приблизительно, по семейству, поколению и суффиксу). */
function cpuScore(name) {
  const n = String(name || '');
  const m1 = n.match(/Apple\s+M(\d)\s*(Pro|Max)?/i);
  if (m1) {
    const g = +m1[1];
    const base = [0, 85, 95, 105, 115, 125][g] || 110;
    const k = m1[2] ? (/max/i.test(m1[2]) ? 1.7 : 1.4) : 1;
    return { gaming: base, multi: Math.round(base * k), igpu: m1[2] ? 70 : 35 };
  }
  let tier = 75;
  let gen = 1;
  let gaming = 1;
  let multi = 1;
  let igpu = 12;
  const intel = n.match(/Core\s+(?:Ultra\s+)?(?:i)?([3579])[\s-]+(\d{3,5})([A-Z]*)/i);
  const amd = n.match(/Ryzen\s+(?:AI\s+)?(?:Max\+?\s+)?([3579])\s+(?:PRO\s+)?(?:HX\s+)?(\d{3,4})([A-Z]*)/i);
  if (intel) {
    tier = { 3: 55, 5: 75, 7: 90, 9: 105 }[intel[1]];
    const num = intel[2];
    const ultra = /Ultra/i.test(n);
    const sfx = intel[3].toUpperCase();
    if (ultra) gen = num[0] === '2' ? 1.08 : 1.0;
    else if (num.length === 5) gen = { 10: 0.75, 11: 0.85, 12: 0.95, 13: 1.0, 14: 1.05 }[num.slice(0, 2)] || 0.9;
    else if (num.length === 3) gen = 0.95; // Core 3/5/7 серии 1–2 (100U, 210H…)
    // Четыре цифры: 11–13 поколение (1135G7, 1215U, 1335U) или старые 7–9 поколения (7200U, 8250U, 9750H)
    else if (num[0] === '1') gen = { 11: 0.85, 12: 0.95, 13: 1.0 }[num.slice(0, 2)] || 0.8;
    else gen = { 7: 0.5, 8: 0.6, 9: 0.65 }[num[0]] || 0.55;
    // G4 / G7 у 11 поколения — это энергоэффективные U-процессоры
    const k = { U: [0.75, 0.7], G: [0.75, 0.7], P: [0.85, 0.85], H: [1, 1], HK: [1.02, 1], HX: [1.1, 1.3], V: [0.88, 0.8] }[sfx] || (ultra && num[0] === '2' ? [0.88, 0.8] : [0.9, 0.9]);
    gaming = k[0];
    multi = k[1];
    igpu = ultra ? 30 : 15;
  } else if (amd) {
    tier = { 3: 55, 5: 75, 7: 90, 9: 105 }[amd[1]];
    const num = amd[2];
    const ai = /\bAI\b/i.test(n);
    const sfx = amd[3].toUpperCase();
    if (ai || /Max/i.test(n)) gen = 1.12;
    else if (num.length === 3) gen = 1.02; // Ryzen 7 260 / 5 220 — Zen 4
    else {
      const g = num[0];
      const third = num[2];
      gen = { 3: 0.6, 4: 0.75, 5: 0.85, 6: 0.92, 7: third >= '4' ? 1.0 : 0.88, 8: 1.02 }[g] || 0.8;
    }
    const k = { U: [0.8, 0.75], HS: [1, 1], H: [1, 1], HX: [1.1, 1.3] }[sfx] || [0.95, 0.95];
    gaming = k[0];
    multi = k[1];
    igpu = gen >= 1 ? 32 : gen >= 0.92 ? 25 : 12;
  } else {
    // Celeron, Pentium, Athlon, N100 и т. п.
    return { gaming: 30, multi: 25, igpu: 6 };
  }
  return { gaming: Math.round(tier * gen * gaming), multi: Math.round(tier * gen * multi * (tier >= 90 ? 1.15 : 1)), igpu };
}

/** Видеокарта ноутбука: мощность от настольной той же модели с поправкой на мобильную версию и TGP. */
function gpuScore(s, cpu) {
  if (!s.gpu) return { score: cpu.igpu, discrete: false };
  const key = perf.laptopGpuKey(s.gpu);
  const p = key && perf.gpuPerf(key);
  let score = p ? p.score * 0.75 : 50;
  if (s.tgp) score *= s.tgp >= 115 ? 1.05 : s.tgp <= 60 ? 0.75 : s.tgp <= 85 ? 0.88 : 1;
  return { score: Math.round(score), discrete: true };
}

const PURPOSES = {
  gaming: (x) => Math.pow(x.gpu.score, 0.65) * Math.pow(x.cpu.gaming, 0.25)
    * (x.s.hz >= 144 ? 1.06 : x.s.hz >= 120 ? 1.03 : 0.97) * ram(x.s, 16) * (x.gpu.discrete ? 1 : 0.6),
  study: (x) => Math.pow(x.cpu.multi, 0.35) * Math.pow(Math.max(30, x.s.battery || 45) / 55, 0.35)
    * screen(x.s) * ram(x.s, 16) * ((x.s.ssdGb || 256) >= 512 ? 1 : 0.92) * (x.gpu.discrete ? 0.97 : 1),
  work: (x) => Math.pow(x.cpu.multi, 0.6) * Math.pow(Math.max(20, x.gpu.score), 0.2) * ram(x.s, 32) * screen(x.s)
    * ((x.s.ssdGb || 256) >= 1000 ? 1.03 : (x.s.ssdGb || 256) >= 512 ? 1 : 0.9),
};

function ram(s, want) {
  const g = s.ramGb || 8;
  if (g >= want * 2) return 1.04;
  if (g >= want) return 1;
  if (g >= want / 2) return want >= 32 ? 0.85 : 0.82;
  return 0.65;
}

function screen(s) {
  let f = 1;
  if (s.panel && /OLED/i.test(s.panel)) f *= 1.05;
  else if (s.panel && /TN/i.test(s.panel)) f *= 0.9;
  if (s.resH && s.resH < 1080) f *= 0.88;
  if (s.resH && s.resH >= 1440) f *= 1.03;
  return f;
}

const SIZES = { small: [11, 14.5], mid: [14.5, 16.2], big: [16.2, 19] };

/** Подбор: opts { budgetByn, purpose: gaming|study|work, size: ''|small|mid|big, needOs } */
async function pick(opts) {
  const B = Number(opts.budgetByn);
  if (!(B >= 600)) throw new Error('Бюджет на ноутбук — от 600 р.');
  const purpose = PURPOSES[opts.purpose] ? opts.purpose : 'study';
  const lo = Math.round(B * 0.45);
  const pages = await Promise.all([
    onliner.category('notebook', { order: 'rating:desc', price: { from: lo, to: Math.round(B) } }, 4),
    onliner.category('notebook', { order: 'price:desc', price: { from: lo, to: Math.round(B) } }, 2),
    onliner.category('notebook', { order: 'price:asc', price: { from: Math.round(B * 0.7), to: Math.round(B) } }, 2),
  ].map((p) => p.catch(() => ({ items: [] }))));
  const seen = new Set();
  const list = [];
  for (const it of pages.flatMap((p) => p.items || [])) {
    if (!it.price || it.price > B || seen.has(it.id)) continue;
    seen.add(it.id);
    const s = parse(it.description);
    if (opts.size && SIZES[opts.size] && s.diag && (s.diag < SIZES[opts.size][0] || s.diag > SIZES[opts.size][1])) continue;
    if (opts.needOs && (s.os === 'нет' || !s.os)) continue;
    const cpu = cpuScore(s.cpu);
    const gpu = gpuScore(s, cpu);
    const x = { s, cpu, gpu };
    const score = PURPOSES[purpose](x);
    const value = score * (1 - 0.1 * (it.price / B));
    list.push({
      id: it.id, name: it.name, price: it.price, url: it.url, image: it.image, rating: it.rating, reviews: it.reviews, offers: it.offers,
      category: 'notebook', source: 'onliner', description: it.description, specs: s,
      index: { gaming: Math.round(Math.pow(gpu.score, 0.7) * Math.pow(cpu.gaming, 0.3)), work: Math.round(Math.pow(cpu.multi, 0.75) * Math.pow(Math.max(gpu.score, 10), 0.25)) },
      cpuScore: cpu, gpuScore: gpu, value, reasons: reasons(s, gpu, purpose),
    });
  }
  list.sort((a, b) => b.value - a.value);
  // Не больше двух почти одинаковых моделей (разный цвет / объём)
  const out = [];
  const byModel = {};
  for (const it of list) {
    const k = it.name.replace(/\s+\S+$/, '').slice(0, 40);
    byModel[k] = (byModel[k] || 0) + 1;
    if (byModel[k] <= 2) out.push(it);
    if (out.length >= 12) break;
  }
  return { items: out, total: list.length, purpose };
}

function reasons(s, gpu, purpose) {
  const r = [];
  if (gpu.discrete && s.gpu) r.push(`${s.gpu.replace(/^NVIDIA\s+|^AMD\s+/i, '')}${s.tgp ? `, TGP ${s.tgp} Вт` : ''}`);
  if (s.hz >= 120) r.push(`экран ${s.hz} Гц`);
  if (s.panel && /OLED/i.test(s.panel)) r.push('OLED-экран');
  if (s.ramGb >= 32) r.push(`${s.ramGb} ГБ памяти`);
  if (s.battery >= 70 && purpose !== 'gaming') r.push(`ёмкий аккумулятор ${s.battery} Вт·ч`);
  if (s.ssdGb >= 1000) r.push(`SSD ${s.ssdGb / 1000} ТБ`);
  return r;
}

module.exports = { pick, parse, cpuScore };
