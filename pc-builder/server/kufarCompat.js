'use strict';
// Kufar для подбора: совместимые б/у альтернативы (по сокету, типу памяти, близкой мощности)
// и превращение объявления в «деталь сборки» с характеристиками для проверки совместимости.

const kufar = require('./providers/kufar');
const kf = require('./providers/kufarFilters');
const perf = require('./perfdb');
const onliner = require('./providers/onliner');
const { normSocket, capacityGb, parseSpecs } = require('./parsers');
const Compat = require('../web/compat');

// «Тип» в категории «Комплектующие» Kufar для каждого слота сборки
const TYPE = { cpu: '10', gpu: '11', motherboard: '7', ram: '9', ssd: '15', hdd: '13', psu: '5', case: '1', cooler: '3' };
const SCHEMA = { cpu: 'cpu', gpu: 'videocard', motherboard: 'motherboard', ram: 'dram', ssd: 'ssd', hdd: 'hdd', psu: 'powersupply', case: 'chassis', cooler: 'fan' };
const OTHER = /куплю|коробк|только\s*обмен|заброниров|продан[оа]?(?![а-яё])/i;

const norm = (s) => String(s || '').toUpperCase().replace(/[\s_-]+/g, '');

/** id значения фильтра Kufar по его названию («AM5», «DDR5», «16 ГБ»). */
async function valueId(slot, param, label) {
  if (!label) return null;
  let meta;
  try {
    meta = await kf.facets(16010, { cct: TYPE[slot] }, ['cct']);
  } catch {
    return null;
  }
  const item = meta.groups.flatMap((g) => g.items).find((i) => i.id === param);
  if (!item || !item.values) return null;
  const want = norm(label);
  const v = item.values.find((x) => norm(x.name) === want);
  return v ? v.id : null;
}

async function valuesOf(slot, param) {
  try {
    const meta = await kf.facets(16010, { cct: TYPE[slot] }, ['cct']);
    const item = meta.groups.flatMap((g) => g.items).find((i) => i.id === param);
    return (item && item.values) || [];
  } catch {
    return [];
  }
}

/**
 * Значения «Тип памяти» Kufar для настольной памяти данного типа. Продавцы пишут и «DDR5», и «DDR5 DIMM»,
 * и «DDR5 CUDIMM» — берём все, кроме SO-DIMM и серверной Registered.
 */
async function memIds(slot, type) {
  const want = norm(type);
  if (!want) return null;
  const ids = (await valuesOf(slot, 'ccrt')).filter((v) => {
    const n = norm(v.name);
    return n.startsWith(want) && !/SODIMM|REGISTERED/.test(n) && (n === want || /^DDR\dL?(CU)?DIMM$/.test(n));
  }).map((v) => v.id);
  if (!ids.length) return null;
  return ids.length > 1 ? 'v.or:' + ids.join(',') : ids[0];
}

function webUrl(params, query) {
  const qs = new URLSearchParams({ cat: '16010', ...params });
  if (query) qs.set('query', query);
  return 'https://www.kufar.by/l/r~belarus?' + qs;
}

/**
 * Совместимые предложения Kufar для слота. part — текущая деталь, ctx — остальные детали и параметры сборки.
 * Возвращает { items, total, url, criteria }.
 */
async function compatible(slot, part, ctx = {}, { limit = 40, pages = 2 } = {}) {
  if (!TYPE[slot]) return { items: [], total: 0, url: null, criteria: '' };
  const params = { cct: TYPE[slot] };
  let query;
  const crit = [];
  const s = (part && part.specs) || {};

  if (slot === 'cpu' || slot === 'motherboard') {
    const socket = ctx.socket || s.socket;
    // LGA1151 на Kufar разделён на «LGA1151» и «LGA1151 v2» — берём оба, совместимость проверит подбор
    const id = socket === 'LGA1151'
      ? (await valuesOf(slot, 'ccsct')).filter((v) => norm(v.name).startsWith('LGA1151')).map((v) => v.id).join(',')
      : await valueId(slot, 'ccsct', socket);
    if (id) params.ccsct = id.includes(',') ? 'v.or:' + id : id;
    else if (socket) query = socket;
    if (socket) crit.push('сокет ' + socket);
    if (slot === 'motherboard') {
      const mem = ctx.mem || s.mem;
      const mid = await memIds(slot, mem);
      if (mid) params.ccrt = mid;
      if (mem) crit.push(mem);
    }
  } else if (slot === 'ram') {
    const mem = ctx.mem || s.type || (MEM_BY_SOCKET[ctx.socket] || [])[0];
    const ids = await memIds(slot, mem);
    if (ids) params.ccrt = ids;
    if (mem) crit.push(mem);
    if (s.totalGb) {
      const vid = await valueId(slot, 'cdr', `${s.totalGb} ГБ`);
      if (vid) params.cdr = vid;
      crit.push(`${s.totalGb} ГБ`);
    }
  } else if (slot === 'gpu') {
    // Видеокарты близкой мощности: от −20% до +50% к текущей
    const cur = (part && part.perf && part.perf.score) || ctx.gpuScore || 100;
    const chips = (await valuesOf(slot, 'ccvc')).filter((v) => {
      const key = perf.gpuKey(v.name);
      const p = key && perf.gpuPerf(key);
      return p && p.score >= cur * 0.8 && p.score <= cur * 1.5;
    });
    if (chips.length) params.ccvc = 'v.or:' + chips.map((c) => c.id).join(',');
    else if (part && part.perf) query = part.perf.name;
    crit.push('видеокарты близкой мощности');
  } else if (slot === 'psu') {
    params.cpct = '1'; // блоки питания для ПК
    const need = ctx.need || 0;
    if (need >= 750) params.ccpw = '3';
    else if (need >= 650) params.ccpw = '2';
    else if (need >= 500) params.ccpw = '1';
    if (need) crit.push(`от ${need} Вт`);
  }

  // Две страницы по 50 объявлений
  const all = [];
  let total = 0;
  let cursor;
  for (let page = 0; page < pages; page++) {
    const r = await kufar.search({ cat: 16010, params, query, size: 50, cursor, condition: 'used' });
    total = r.total;
    all.push(...r.items);
    if (!r.next) break;
    cursor = r.next;
  }
  // Исключаем объявления с ценой-приманкой и товары другого типа.
  const floor = Math.max(20, ((part && part.price) || 0) * 0.15);
  const items = all.filter((it) => it.price >= (slot === 'gpu' ? 1 : floor) && !OTHER.test(it.name));
  // Производительность для процессоров и видеокарт
  for (const it of items) {
    if (slot === 'cpu') {
      const key = perf.cpuKey(it.name);
      if (key) it.perf = perf.cpuPerf(it.name, {});
    } else if (slot === 'gpu') {
      const gpu = kufar.adGpuInfo(it);
      if (gpu.key) it.perf = { key: gpu.key, ...perf.gpuPerf(gpu.key, gpu.vramGb) };
    }
    if (part?.perf && it.perf) {
      it.sameModel = slot === 'gpu'
        ? Boolean(it.perf.variantKey && it.perf.variantKey === perf.gpuVariantKey(part.perf.key, part.specs?.vramGb))
        : it.perf.key === part.perf.key;
      if (slot === 'gpu' && it.sameModel && part.price && it.price < part.price * 0.2) {
        it.gpuPriceRisk = 'Цена заметно ниже цены такой же новой версии';
      }
    }
  }
  items.sort((a, b) => a.price - b.price);
  const expected = { ...ctx, socket: ctx.socket || s.socket, mem: ctx.mem || (slot === 'ram' ? s.type : s.mem) };
  const shown = await verifiedOffers(slot, items, expected, limit);
  return { items: shown, total, url: webUrl({ ...params, cnd: '1' }, query), criteria: crit.join(', ') };
}

// ---------------------------------------------------------------- объявление → деталь сборки

const MEM_BY_SOCKET = {
  AM4: ['DDR4'], AM5: ['DDR5'], LGA1700: ['DDR4', 'DDR5'], LGA1851: ['DDR5'], LGA1200: ['DDR4'],
  LGA1151: ['DDR4'], LGA1150: ['DDR3'], LGA1155: ['DDR3'],
};
// Чипсет → сокет. Точный список: у AMD и Intel похожие названия (B350 — AM4, B360 — Intel; B850 — AM5, B860 — Intel)
const CHIPSETS = {
  AM5: 'A620 B650 B650E X670 X670E B840 B850 X870 X870E',
  AM4: 'A300 X300 A320 B350 X370 B450 X470 A520 B550 X570',
  LGA1851: 'H810 B860 Z890 W880 Q870',
  LGA1700: 'H610 B660 H670 Z690 Q670 W680 B760 H770 Z790',
  LGA1200: 'H410 B460 H470 Z490 Q470 W480 H510 B560 H570 Z590 Q570 W580',
  LGA1151: 'H110 B150 H170 Z170 Q170 B250 H270 Z270 Q270 H310 B360 B365 H370 Z370 Z390 Q370',
  LGA1150: 'H81 B85 H87 Z87 Q87 H97 Z97',
  LGA1155: 'H61 H67 P67 Z68 B75 H77 Z77 Q77',
};
const CHIPSET_SOCKET = new Map(Object.entries(CHIPSETS).flatMap(([sk, list]) => list.split(' ').map((c) => [c, sk])));

/** Чипсет из текста: «MSI B450M-A», «asrock H81M-HDS», «Z790-P». */
function findChipset(text) {
  const t = String(text || '').toUpperCase();
  const re = /(?:^|[^A-Z0-9])([ABHXZQPW]\d{2,3}E?)(?=$|[^0-9])/g;
  let m;
  while ((m = re.exec(t))) if (CHIPSET_SOCKET.has(m[1])) return m[1];
  return null;
}

const pv = (it, pu) => (it.params && it.params[pu] ? String(it.params[pu].vl) : '');

function socketsIn(text) {
  return [...String(text || '').matchAll(/(?<![\p{L}\p{N}])(?:AM[1-5]\+?|FM[12]\+?|LGA\s*\d{3,4})(?![\p{L}\p{N}])/giu)].map((m) => normSocket(m[0]));
}

function memoryTypes(text) {
  return [...String(text || '').matchAll(/(?<![\p{L}\p{N}])DDR\s*([2-5])(?!\d)/giu)].map((m) => 'DDR' + m[1]);
}

const unique = (values) => [...new Set(values.filter(Boolean))];

/** Ищем ту же модель в каталоге Onliner, чтобы взять точные характеристики. */
async function onlinerTwin(schema, query, keyFn, key) {
  try {
    const r = await onliner.search(query);
    return r.items.find((x) => x.category === schema && (!keyFn || keyFn(x.name) === key)) || null;
  } catch {
    return null;
  }
}

async function enrich(slot, item) {
  const { description, ...fields } = item;
  const out = { ...fields, source: 'kufar', category: SCHEMA[slot], specs: {}, offers: 0, fromKufar: true };
  const name = item.name || '';
  const text = [name, description].filter(Boolean).join('\n');
  const notes = [];

  if (slot === 'cpu') {
    const key = perf.cpuKey(name);
    const twin = key ? await onlinerTwin('cpu', name.replace(/процессор/i, ''), perf.cpuKey, key) : null;
    const declared = unique([...socketsIn(pv(item, 'ccsct')), ...socketsIn(name), twin?.specs.socket]);
    const sockets = declared.length ? declared : unique(socketsIn(description));
    const socket = sockets.length === 1 ? sockets[0] : null;
    const identified = parseSpecs('cpu', [socket && `сокет ${socket}`, description].filter(Boolean).join(', '), name);
    const hasNoGpu = /\d{3,5}\s*(?:x?f|kf)\b/i.test(name);
    out.specs = { ...(twin?.specs || identified), socket, mem: twin?.specs.mem || MEM_BY_SOCKET[socket] || identified.mem,
      hasIgpu: !hasNoGpu && (identified.hasIgpu || twin?.specs.hasIgpu || false), withCooler: /with cooler|с кулером/i.test(text) && !/без кулера/i.test(text) };
    if (!twin) notes.push('характеристики процессора взяты из объявления');
    out.perf = perf.cpuPerf(twin ? twin.name : name, out.specs);
  } else if (slot === 'gpu') {
    const gpu = kufar.adGpuInfo(item);
    out.specs = gpu.specs;
    if (gpu.issue?.level === 'blocked') throw new Error(gpu.issue.reason);
    if (gpu.issue) notes.push(gpu.issue.reason);
    if (gpu.key) out.perf = { key: gpu.key, ...perf.gpuPerf(gpu.key, gpu.vramGb) };
    else notes.push('модель видеокарты не распознана');
  } else if (slot === 'motherboard') {
    const chipsets = unique([findChipset(pv(item, 'ccch')), findChipset(name)]);
    const chipset = chipsets[0] || findChipset(description);
    const sockets = unique([...socketsIn(pv(item, 'ccsct')), ...socketsIn(name), ...chipsets.map((c) => CHIPSET_SOCKET.get(c))]);
    const statedSockets = sockets.length ? sockets : unique([...socketsIn(description), CHIPSET_SOCKET.get(chipset)]);
    const socket = statedSockets.length === 1 ? statedSockets[0] : null;
    const supported = MEM_BY_SOCKET[socket] || [];
    const types = unique([...memoryTypes(pv(item, 'ccrt')), ...memoryTypes(text), ...memoryTypes(name.replace(/\bD([45])\b/ig, 'DDR$1'))]);
    const mem = !types.length && supported.length === 1 ? supported[0] : types.length === 1 && (!supported.length || supported.includes(types[0])) ? types[0] : null;
    const ffRaw = pv(item, 'ccff') || text;
    const form = /itx/i.test(ffRaw) ? 'ITX' : /m-?atx|micro/i.test(ffRaw) || /\d{3}M\b|M-/i.test(name) ? 'mATX' : /e-?atx/i.test(ffRaw) ? 'E-ATX' : /\batx\b/i.test(ffRaw) ? 'ATX' : null;
    out.specs = { socket, mem, form, chipset, memSlots: Number(pv(item, 'ccns')) || null };
    if (!pv(item, 'ccsct') && socket) notes.push('сокет определён по модели или описанию');
  } else if (slot === 'ram') {
    const memory = `${text}\n${pv(item, 'ccrt')}`;
    const types = unique(memoryTypes(memory));
    const type = types.length === 1 ? types[0] : null;
    const total = parseFloat(pv(item, 'cdr')) || capacityGb(name) || null;
    const kit = name.match(/(\d)\s*[xх×]\s*(\d{1,2})\s*(gb|гб)?/i);
    out.specs = {
      type, form: /so[\s-]?dimm|ноутбук/i.test(memory) ? 'SO-DIMM' : /cudimm/i.test(memory) ? 'CUDIMM' : /dimm|настольн|для\s+пк/i.test(memory) ? 'DIMM' : null,
      registered: /\b(?:rdimm|lrdimm|registered)\b|серверн/i.test(memory), totalGb: kit ? Number(kit[1]) * Number(kit[2]) : total,
      modules: kit ? Number(kit[1]) : /комплект|kit/i.test(name) ? 2 : 1, mhz: Number((name.match(/(\d{4})\s*(mhz|мгц)/i) || [])[1]) || null,
    };
  } else if (slot === 'ssd' || slot === 'hdd') {
    out.specs = { capacityGb: capacityGb(pv(item, 'ccscp')) || capacityGb(name), iface: /nvme|m\.2/i.test(name + pv(item, 'ccsi')) ? 'NVMe' : 'SATA', form: /m\.2/i.test(name + pv(item, 'ccff')) ? 'M.2' : '2.5"' };
  } else if (slot === 'psu') {
    // \b в JS не работает с кириллицей: «600 Вт» в конце строки не находился — граница задаётся явно
    const w = Number((`${name} ${pv(item, 'ccpw')}`.match(/(\d{3,4})\s*(?:w|вт|ватт)(?![a-zа-яё])/i) || [])[1]) || null;
    out.specs = { watts: w, cert: /gold|золот/i.test(name) ? 4 : /bronze|бронз/i.test(name) ? 2 : 0, form: 'ATX' };
    out.specs.certName = ['нет', '80+', 'Bronze', 'Silver', 'Gold'][out.specs.cert] || '';
    if (!w) notes.push('мощность не указана — уточните у продавца');
  } else if (slot === 'case') {
    // Число вентиляторов — если продавец его написал («3 RGB вентилятора», «4 fan»), иначе неизвестно
    const fans = Number((name.match(/(\d)\s*(?:шт\.?\s*)?(?:a?rgb\s*)?(?:вентилятор|кулер|fan)/i) || [])[1]) || null;
    out.specs = { boards: /mini|itx/i.test(name) ? ['mATX', 'ITX'] : ['ATX', 'mATX', 'ITX'], fans };
  } else if (slot === 'cooler') {
    out.specs = parseSpecs('fan', description, name);
  }
  out.kufarNote = notes.join('; ');
  return out;
}

function compatibilityIssue(slot, item, ctx = {}) {
  const specs = item.specs || {};
  if (slot === 'ram') {
    const mem = ctx.socket === 'AM5' ? 'DDR5' : ctx.mem;
    if (!specs.type) return 'Не удалось однозначно определить тип памяти в объявлении.';
    if (mem && specs.type !== mem) return `Для этой сборки нужна ${mem}, а в объявлении ${specs.type}.`;
    if (!specs.form) return 'В объявлении не подтверждён формат модуля памяти DIMM.';
    if (specs.form === 'SO-DIMM' || specs.registered) return 'Эта память не подходит для обычной настольной платы.';
  }
  if (slot === 'cpu' || slot === 'motherboard') {
    if (!specs.socket) return 'Не удалось однозначно определить сокет детали в объявлении.';
    if (ctx.socket && specs.socket !== ctx.socket) return `Для сборки нужен сокет ${ctx.socket}, а в объявлении ${specs.socket}.`;
    if (slot === 'motherboard' && !specs.mem) return 'Не удалось подтвердить, какую память поддерживает плата.';
    if (slot === 'motherboard' && ctx.mem && specs.mem !== ctx.mem) return `Плата рассчитана на ${specs.mem}, а сборке нужна ${ctx.mem}.`;
    if (slot === 'cpu' && ctx.mem && !specs.mem?.includes(ctx.mem)) return `Поддержка ${ctx.mem} этим процессором не подтверждена.`;
  }
  return Compat.replacementErrors(slot, item, ctx.parts || {}, ctx.have)[0]?.text || null;
}

async function verifiedPart(slot, ad, ctx) {
  kufar.requireVerified(ad);
  const evidence = kufar.forCompatibility(ad);
  const type = evidence.params?.cct?.v;
  if (type && String(type) !== TYPE[slot]) throw new Error('На Kufar указан другой тип комплектующего.');
  const item = await enrich(slot, evidence);
  const issue = compatibilityIssue(slot, item, ctx);
  if (issue) throw new Error(issue);
  return item;
}

async function verifiedOffers(slot, ads, ctx, limit = 30) {
  const candidates = [...new Map(ads.map((ad) => [ad.id, ad])).values()];
  const mem = ctx?.socket === 'AM5' ? 'DDR5' : ctx?.mem;
  const shortlisted = slot === 'ram' && mem ? candidates.filter((ad) =>
    memoryTypes(`${ad.name || ''}\n${pv(ad, 'ccrt')}`).every((type) => type === mem)) : candidates;
  const queue = shortlisted.slice(0, Math.max(30, limit * 2));
  await kufar.inspect(queue, { limit: 48, timeout: 5500 });
  const verified = await Promise.all(queue.filter(kufar.verified).map(async (ad) => {
    try {
      const part = await verifiedPart(slot, ad, ctx);
      return { ...ad, specs: part.specs, perf: part.perf || ad.perf };
    } catch {
      return null;
    }
  }));
  return verified.filter(Boolean).slice(0, limit);
}

module.exports = { compatible, enrich, findChipset, verifiedPart, verifiedOffers, TYPE, SCHEMA };
