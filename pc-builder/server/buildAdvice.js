'use strict';

const Compat = require('../web/compat');
const onliner = require('./providers/onliner');
const { SCHEMA } = require('./kufarCompat');
const { boardSuitable, COOLER_FAMILY } = require('./builder');

const LABELS = { cpu: 'процессор', motherboard: 'материнская плата', ram: 'память', gpu: 'видеокарта', ssd: 'SSD', hdd: 'жёсткий диск', psu: 'блок питания', case: 'корпус', cooler: 'кулер' };
const SLOTS = Object.keys(LABELS);
const CORE = ['cpu', 'motherboard', 'ram', 'psu'];
const PURPOSES = { gaming: 'Игры', universal: 'Универсальный', work: 'Работа', office: 'Офис и учёба' };
const SPEC_FIELDS = ['socket', 'mem', 'chipset', 'form', 'type', 'totalGb', 'modules', 'capacityGb', 'iface', 'vramGb', 'power', 'watts', 'boards', 'gpuMaxMm', 'gpuMaxThicknessMm', 'expansionSlots', 'coolerMaxMm', 'lengthMm', 'thicknessMm', 'slots', 'boardWatts', 'recommendedPsuWatts', 'adapter8', 'heightMm', 'hasIgpu', 'withCooler', 'cores', 'tdp', 'registered', 'memSlots', 'm2', 'mhz', 'pcie5', 'fans', 'aio', 'radMm', 'dissipationWatts', 'coolerDesign', 'psuIncluded'];
const CONNECTOR_FIELDS = ['six', 'eight', 'sixteen', 'flex'];
const PERF_FIELDS = ['key', 'score', 'watts', 'gaming', 'multi', 'igpu'];

const money = (value) => Number.isFinite(+value) && +value > 0 ? Math.round(+value * 100) : 0;
const sum = (parts) => Object.values(parts || {}).reduce((n, it) => n + money(it?.price), 0);
const modelText = (value) => typeof value === 'string' ? value.trim().slice(0, 120) : '';
const sku = (value) => typeof value === 'string' && /^[\w.-]{1,120}$/.test(value);

function facts(object, fields) {
  return Object.fromEntries(fields.flatMap((k) => {
    const v = object?.[k];
    if (Array.isArray(v)) return [[k, v.slice(0, 8).map(modelText).filter(Boolean)]];
    if (typeof v === 'string') return [[k, modelText(v)]];
    if (Number.isFinite(v) || typeof v === 'boolean') return [[k, v]];
    return [];
  }));
}

function currentParts(input) {
  return Object.fromEntries(SLOTS.flatMap((slot) => {
    const part = input?.[slot];
    if (!modelText(part?.name)) return [];
    const specs = facts(part.specs, SPEC_FIELDS);
    if (slot === 'cooler') {
      delete specs.tdp;
      if (part.source === 'onliner' && part.specs?.catalogHardware && Number.isInteger(part.specs.heatpipes) && part.specs.heatpipes > 0) {
        specs.heatpipes = part.specs.heatpipes;
      }
    }
    for (const field of ['gpuInputs', 'gpuOutputs']) {
      const counts = Object.fromEntries(CONNECTOR_FIELDS.filter((k) => Number.isInteger(part.specs?.[field]?.[k]) && part.specs[field][k] >= 0)
        .map((k) => [k, part.specs[field][k]]));
      if (Object.keys(counts).length) specs[field] = counts;
    }
    const perf = facts(part.perf, PERF_FIELDS);
    return [[slot, { id: sku(part.id) ? part.id : null, name: modelText(part.name), price: money(part.price) / 100,
      specs, ...(Object.keys(perf).length ? { perf } : {}) }]];
  }));
}

function gaps(parts, have) {
  const unknown = [];
  const { cpu, motherboard: board, ram, gpu, case: chassis, psu, cooler } = parts;
  if (CORE.some((slot) => !parts[slot] && !have[slot])) unknown.push('Не все основные детали указаны.');
  if (cpu && board && (!cpu.specs.socket || !board.specs.socket)) unknown.push('Не указан сокет процессора или платы.');
  if (ram && board && (!ram.specs.type || !board.specs.mem)) unknown.push('Не указан тип памяти или её поддержка платой.');
  if (have.psu || (psu && !psu.specs.watts)) unknown.push('Уточните мощность и модель блока питания.');
  if (gpu && (!gpu.specs.lengthMm || !chassis?.specs.gpuMaxMm)) unknown.push('Уточните длину видеокарты и свободное место в корпусе.');
  if (gpu && !psu) unknown.push('Нужна модель блока питания для проверки кабелей видеокарты.');
  if (have.gpu && !gpu) unknown.push('Модель вашей видеокарты не указана. Баланс и питание можно оценить только приблизительно.');
  if (cooler && (cooler.specs.aio || !cooler.specs.heightMm || !chassis?.specs.coolerMaxMm)) unknown.push('Проверьте, поместится ли охлаждение в корпус.');
  return unknown;
}

function observations(parts, have, purpose, total, limit) {
  const checks = Compat.check(parts, have).filter((x) => x.level === 'error' || x.level === 'warn' || /BIOS/.test(x.text))
    .map(({ level, text }) => ({ level, text }));
  if (total > limit) checks.unshift({ level: 'error', text: 'Текущая сборка превышает указанный бюджет.' });
  const note = (text) => checks.push({ level: 'info', text });
  const cpu = parts.cpu?.perf?.gaming;
  const gpu = parts.gpu?.perf?.score;
  if (purpose === 'gaming' || purpose === 'universal') {
    if (!parts.gpu && !have.gpu && parts.cpu?.specs.hasIgpu) note('Для игр встроенная графика может ограничивать производительность.');
    if (cpu && gpu > cpu * 1.6) note('В некоторых играх процессор может ограничивать эту видеокарту. Это приблизительная оценка по индексам.');
    if (cpu && gpu && gpu < cpu * 0.65) note('Для игр видеокарта выглядит более слабым звеном. Это приблизительная оценка по индексам.');
  }
  if (purpose !== 'office' && parts.ram?.specs.totalGb > 0 && parts.ram.specs.totalGb < 16) note('Оперативной памяти может не хватить для тяжёлых программ и нескольких задач одновременно.');
  for (const text of gaps(parts, have)) note(text);
  return checks.map((check, i) => ({ id: `f${i + 1}`, ...check }));
}

function checkReplacement(slot, item, build) {
  const { parts, have, total, limit } = build;
  if (!item || item.source !== 'onliner' || item.category !== SCHEMA[slot] || !sku(item.id) || !modelText(item.name) || !money(item.price)) return null;
  if (item.id === parts[slot]?.id || have[slot]) return null;
  const next = { ...parts, [slot]: item };
  const { cpu, motherboard: board } = next;
  if ((slot === 'cpu' || slot === 'motherboard') && cpu?.specs.socket && cpu.specs.mem?.length && board?.specs.socket && board.specs.mem
      && !boardSuitable(cpu, board)) return null;
  const diff = money(item.price) - money(parts[slot]?.price);
  const cost = total + diff;
  if (cost > limit) return null;
  const checks = Compat.check(next, have);
  if (checks.some((x) => x.level === 'error')) return null;
  return { item, slot, cost: cost / 100, diff: diff / 100,
    warnings: [...new Set([...checks.filter((x) => x.level === 'warn' || /BIOS/.test(x.text)).map((x) => x.text), ...gaps(next, have)])],
    indices: Compat.indices(next, have.gpu) };
}

function explain(choice, build, baseline) {
  const notes = [];
  const { slot, item, indices, diff } = choice;
  const before = build.parts[slot]?.specs || {};
  const now = item.specs || {};
  if (!build.parts[slot]) notes.push(`Добавляет недостающую деталь: ${LABELS[slot]}.`);
  if (slot === 'ram' && now.totalGb > before.totalGb) notes.push(`Больше оперативной памяти: ${before.totalGb} → ${now.totalGb} ГБ.`);
  if (slot === 'ram' && before.modules === 1 && now.modules >= 2) notes.push('В комплекте две или больше планок памяти.');
  if ((slot === 'ssd' || slot === 'hdd') && now.capacityGb > before.capacityGb) notes.push(`Больше места: ${before.capacityGb} → ${now.capacityGb} ГБ.`);
  if (slot === 'psu' && now.watts > before.watts) notes.push(`Больше запас по мощности: ${before.watts} → ${now.watts} Вт.`);
  const key = build.purpose === 'work' ? 'work' : 'gaming';
  if (baseline[key] > 0 && indices[key] > baseline[key]) notes.push(`Выше примерный ${key === 'work' ? 'рабочий' : 'игровой'} индекс: ${baseline[key]} → ${indices[key]}.`);
  if (diff < 0) notes.push('Снижает общую стоимость сборки.');
  if (!notes.length) notes.push('Вариант из каталога в пределах указанного бюджета.');
  return notes;
}

async function choicesFor(slot, ids, build) {
  if (build.have[slot] || (!build.parts[slot] && !(slot === 'gpu' && build.parts.cpu && build.purpose !== 'office'))) return [];
  const schema = SCHEMA[slot];
  const allowance = build.limit - build.total + money(build.parts[slot]?.price);
  if (allowance <= 0) return [];
  const check = (items) => items.map((it) => checkReplacement(slot, it, build)).filter(Boolean);
  const physical = ['gpu', 'psu', 'case', 'cooler'].includes(slot);
  if (slot !== 'cooler') {
    const items = await Promise.all([...new Set((Array.isArray(ids) ? ids : []).slice(0, 8).filter(sku))].slice(0, 5)
      .map((id) => onliner.product(id, schema).then(onliner.enrichHardware).catch(() => null)));
    const choices = check(items);
    if (choices.length) return choices.slice(0, 4);
  }
  const params = { order: 'price:asc', price: { to: allowance / 100 } };
  const socket = slot === 'cpu' ? build.parts.motherboard?.specs.socket : build.parts.cpu?.specs.socket;
  if (slot === 'cooler') {
    const family = COOLER_FAMILY[socket];
    if (!family) return [];
    params.fan_socket = [family];
    params.type_fan = ['cpu', 'syslcp'];
  }
  if ((slot === 'cpu' || slot === 'motherboard') && socket) params.socket_cpu = [socket.toLowerCase()];
  const mem = build.parts.motherboard?.specs.mem;
  if (slot === 'ram' && /^DDR[345]$/.test(mem)) params.dramkit = [mem.toLowerCase() + 'dimm'];
  const r = await onliner.categoryPage(schema, params, 1).catch(() => ({ items: [] }));
  const items = physical ? await Promise.all(r.items.slice(0, 8).map(onliner.enrichHardware)) : r.items;
  return check(items).slice(0, 3);
}

async function prepare(body) {
  const parts = currentParts(body?.parts);
  if (!Object.keys(parts).length) throw new Error('Добавьте хотя бы одну деталь в сборку.');
  const limit = money(body.budget);
  if (!limit || limit > 20000000) throw new Error('Укажите бюджет сборки до 200 000 BYN.');
  const have = Object.fromEntries(SLOTS.filter((slot) => body.have?.[slot] === true).map((slot) => [slot, true]));
  const purpose = Object.hasOwn(PURPOSES, body.purpose) ? body.purpose : 'universal';
  const total = sum(parts) + sum(body.setup);
  const build = { parts, have, purpose, total, limit };
  const findings = observations(parts, have, purpose, total, limit);
  const baseline = Compat.indices(parts, have.gpu);
  const missingPrice = SLOTS.some((slot) => parts[slot] && !have[slot] && !parts[slot].price)
    || Object.values(body.setup || {}).some((it) => it && !money(it.price));
  if (missingPrice) findings.unshift({ id: 'f0', level: 'warn', text: 'У некоторых деталей нет цены. Укажите её, чтобы проверить бюджет для замен.' });
  const choices = missingPrice ? [] : (await Promise.all(SLOTS.map((slot) => choicesFor(slot, body.alternatives?.[slot], build)))).flat();
  const candidates = choices.map((choice, i) => ({ ...choice, id: `c${i + 1}`, reasons: explain(choice, build, baseline) }));
  const input = {
    purpose: PURPOSES[purpose], budget: limit / 100, total: total / 100, have: Object.keys(have).map((key) => LABELS[key]),
    parts: SLOTS.filter((slot) => parts[slot]).map((slot) => ({ slot: LABELS[slot], name: parts[slot].name, price: parts[slot].price, specs: parts[slot].specs })),
    findings, candidates: candidates.map(({ id, slot, item, diff, cost, reasons, warnings }) => ({
      id, slot: LABELS[slot], name: modelText(item.name), price: item.price, diff, total: cost, reasons, needsCheck: warnings.length > 0,
    })),
  };
  return { build, baseline, input, findings, candidates, missingPrice };
}

function result(context, answer) {
  const { build, baseline, findings, candidates } = context;
  const picked = (list) => [...new Set(Array.isArray(list) ? list.slice(0, 12) : [])];
  const priority = picked(answer?.findings).map((id) => findings.find((f) => f.id === id)).filter(Boolean);
  const displayed = [...new Set([...findings.filter((f) => f.level === 'error'), ...priority, ...findings])];
  const suggestions = picked(answer?.choices).flatMap((id) => {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) return [];
    const choice = checkReplacement(candidate.slot, candidate.item, build);
    return choice ? [{ ...choice, reasons: explain(choice, build, baseline) }] : [];
  }).slice(0, 3);
  return { model: answer?.model, findings: displayed, suggestions, total: build.total / 100, budget: build.limit / 100, missingPrice: context.missingPrice };
}

module.exports = { prepare, result };
