'use strict';
// Подбор сборки под бюджет.
// 1) Собираем кандидатов из каталога Onliner (только то, что в наличии).
// 2) Перебираем совместимые комбинации процессор/плата/память/видеокарта/SSD,
//    БП, кулер и корпус подбираются под каждую комбинацию.
// 3) Выбираем комбинацию с максимальной оценкой под назначение в рамках бюджета.

const onliner = require('./providers/onliner');
const filters = require('./filters');
const Setup = require('./setup');
const Catalog = require('../web/catalog');
const Compat = require('../web/compat');

const ALL_SOCKETS = ['am4', 'am5', 'lga1700', 'lga1851', 'lga1200'];
const MODERN_SOCKETS = ['am5', 'lga1700', 'lga1851'];
const SOCKET_NAME = { am4: 'AM4', am5: 'AM5', lga1700: 'LGA1700', lga1851: 'LGA1851', lga1200: 'LGA1200' };
const SOCKET_MEM = { AM4: ['DDR4'], AM5: ['DDR5'], LGA1700: ['DDR4', 'DDR5'], LGA1851: ['DDR5'], LGA1200: ['DDR4'] };
// Монтаж кулера: LGA1851 использует крепление LGA1700
const COOLER_FAMILY = { AM4: 'am4', AM5: 'am5', LGA1700: 'lga1700', LGA1851: 'lga1700', LGA1200: 'lga1200' };

const ENTRY_CHIPSETS = /^(A320|A520|A620A?|B840|H610|H510|H410)$/;
const OLD_AM4_CHIPSETS = /^(A320|B350|X370)$/;
// Малоизвестные бренды (часто восстановленные карты из Китая) — штраф в оценке или исключение
const Brands = require('./brands');
const perf = require('./perfdb');
const SERVER_CPU = /epyc|xeon|threadripper|opteron/i;
// Процессоры AM4 до Ryzen (A-серия, Athlon X4 на Bristol Ridge): почти ни одна плата в продаже их не поддерживает
const PRE_RYZEN = /athlon\s*x4|\bA(4|6|8|10|12)[- ]\d{4}|bristol|excavator|carrizo/i;
// Проверенные производители БП — для дорогих сборок берём только их
const GOOD_PSU = /seasonic|be quiet|corsair|deepcool|cooler master|thermaltake|\bfsp\b|chieftec|\bmsi\b|asus|gigabyte|aorus|montech|super flower|\bxpg\b|adata|zalman|cougar|1stplayer|lian li|nzxt|fractal|silverstone|enermax|antec|\bevga\b|thermalright|arctic|segotep|pccooler|hiper|lian-li/i;
const PSU_AVOID = /exegate|ginzzu|accord|crown|kingprice|\bcbr\b|digma|3cott|linkworld|powerman|oklick|\bsven\b|frime|delux|pc pet|aerocool\s+vx/i;

const PROFILES = {
  gaming: { label: 'Игровой', wGpu: 0.66, wCpuG: 0.3, wCpuM: 0.04, ram: [16, 32, 64], ssd: [512, 1000, 2000], minRam: 16 },
  universal: { label: 'Универсальный', wGpu: 0.46, wCpuG: 0.22, wCpuM: 0.32, ram: [16, 32, 64], ssd: [512, 1000, 2000], minRam: 16 },
  work: { label: 'Для работы (монтаж, 3D, код)', wGpu: 0.24, wCpuG: 0.14, wCpuM: 0.62, ram: [16, 32, 64], ssd: [512, 1000, 2000], minRam: 16 },
  office: { label: 'Офис и учёба', wGpu: 0.08, wCpuG: 0.5, wCpuM: 0.42, ram: [8, 16, 32], ssd: [256, 512, 1000], minRam: 8, gpuCap: 30, cpuCapG: 115, cpuCapM: 140 },
};

const RAM_F = {
  gaming: { 8: 0.72, 16: 0.93, 24: 0.96, 32: 1, 48: 1.002, 64: 1.005 },
  universal: { 8: 0.72, 16: 0.92, 24: 0.95, 32: 1, 48: 1.004, 64: 1.008 },
  work: { 8: 0.6, 16: 0.82, 24: 0.9, 32: 0.95, 48: 0.975, 64: 1, 96: 1.01, 128: 1.02 },
  office: { 8: 0.88, 16: 1, 24: 1.005, 32: 1.012, 64: 1.015 },
};
const SSD_F = {
  gaming: { 128: 0.7, 240: 0.83, 256: 0.85, 480: 0.93, 512: 0.94, 1000: 1, 2000: 1.02, 4000: 1.025 },
  universal: { 128: 0.7, 240: 0.83, 256: 0.85, 480: 0.93, 512: 0.94, 1000: 1, 2000: 1.02, 4000: 1.025 },
  work: { 128: 0.65, 240: 0.78, 256: 0.8, 480: 0.89, 512: 0.9, 1000: 0.97, 2000: 1, 4000: 1.01 },
  office: { 128: 0.85, 240: 0.95, 256: 0.96, 480: 0.995, 512: 1, 1000: 1.01, 2000: 1.015 },
};

function stepFactor(table, value) {
  let f = null;
  for (const k of Object.keys(table).map(Number).sort((a, b) => a - b)) {
    if (value >= k * 0.94) f = table[k];
  }
  return f == null ? table[Object.keys(table)[0]] * 0.9 : f;
}

// ------------------------------------------------------------------ сбор кандидатов

async function safe(promise, warnings, what) {
  try {
    return (await promise).items;
  } catch (e) {
    warnings.push(`Не удалось загрузить: ${what} (${e.message})`);
    return [];
  }
}

function cheapestBy(items, keyFn) {
  const map = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (k == null) continue;
    const cur = map.get(k);
    if (!cur || it.price < cur.price) map.set(k, it);
  }
  return [...map.values()].sort((a, b) => a.price - b.price);
}

const inStock = (it) => it.price && it.price > 0;

// Названия категорий для сообщений о фильтрах
const SCHEMA_LABEL = {
  cpu: 'Процессор', videocard: 'Видеокарта', motherboard: 'Материнская плата', dram: 'Оперативная память',
  ssd: 'SSD', hdd: 'Жёсткий диск', powersupply: 'Блок питания', chassis: 'Корпус', fan: 'Кулер',
};

/** Пользовательские фильтры Onliner по категориям (уже проверенные). */
function userFilters(opts) {
  const out = {};
  const src = opts.filters && typeof opts.filters === 'object' ? opts.filters : {};
  for (const schema of Object.keys(SCHEMA_LABEL)) out[schema] = filters.sanitize(src[schema]);
  // Эти условия подбор ставит сам: корпус без БП, крепление кулера под сокет
  delete out.chassis.type_chassis;
  delete out.fan.fan_socket;
  return out;
}

/**
 * Загрузка категории с учётом фильтров пользователя.
 * Если условия подбора и фильтры противоречат друг другу, запрос не делается.
 */
function makeFetcher(F, warnings) {
  return function fetchCat(schema, params, pages, what) {
    const merged = filters.merge(params, F[schema]);
    if (!merged) return Promise.resolve([]);
    return safe(onliner.category(schema, merged, pages), warnings, what);
  };
}

/** Загрузка категории ценовыми диапазонами параллельно: дешёвый хлам не вытесняет дорогие позиции. */
async function banded(fetchCat, schema, params, edges, pages, what) {
  const jobs = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const from = Math.round(edges[i]);
    const to = Math.round(edges[i + 1]);
    if (to <= from) continue;
    jobs.push(fetchCat(schema, { ...params, price: { from: from || undefined, to } }, pages, what));
  }
  const lists = await Promise.all(jobs);
  return cheapestBy(lists.flat(), (x) => x.id);
}

const RAM_CAPS = [8, 16, 24, 32, 48, 64, 96, 128];
const SSD_CAPS = [256, 512, 1000, 2000, 4000];

async function gather(opts, B) {
  const warnings = [];
  const prof = PROFILES[opts.purpose] || PROFILES.gaming;
  const have = opts.have || {};
  const F = userFilters(opts);
  const fetchCat = makeFetcher(F, warnings);
  const sockets = opts.platform === 'modern' ? MODERN_SOCKETS : ALL_SOCKETS;
  const cpuMfr = opts.cpuBrand === 'amd' ? ['amd'] : opts.cpuBrand === 'intel' ? ['intel'] : undefined;
  const useSockets = sockets.filter((s) => {
    if (opts.cpuBrand === 'amd') return s.startsWith('am');
    if (opts.cpuBrand === 'intel') return s.startsWith('lga');
    return true;
  });
  const memNeeded = new Set(useSockets.flatMap((s) => SOCKET_MEM[SOCKET_NAME[s]]));

  const jobs = {};
  // Узкие ценовые диапазоны: дешёвые модели не вытесняют дорогие из выдачи
  const cpuEdges = [0, 250, 400, 600, 850, 1200, 1700, 2500, 4000].filter((e) => e < B * 0.5).concat(Math.round(B * 0.5));
  jobs.cpus = banded(fetchCat, 'cpu', { order: 'price:asc', socket_cpu: useSockets, mfr: cpuMfr }, cpuEdges, 3, 'процессоры');

  if (!have.gpu) {
    const gpuChip = { nvidia: ['nvidia'], amd: ['ati'], intel: ['intel'] }[opts.gpuBrand];
    const maxShare = opts.purpose === 'office' ? 0.3 : 0.62;
    const lo = Math.max(150, B * 0.05);
    const hi = Math.max(lo + 100, B * maxShare);
    const step = (hi - lo) / 4;
    jobs.gpus = banded(fetchCat, 'videocard', { order: 'price:asc', gpu_videocard: gpuChip },
      [lo, lo + step, lo + 2 * step, lo + 3 * step, hi], opts.purpose === 'office' ? 2 : 5, 'видеокарты');
  }

  const wifi = opts.wifi ? 1 : undefined;
  jobs.boards = Promise.all(useSockets.flatMap((s) => [
    fetchCat('motherboard', { order: 'price:asc', socket_cpu: [s], mother_wifi: wifi }, 2, 'материнские платы ' + SOCKET_NAME[s]),
    fetchCat('motherboard', {
      order: 'rating:desc', socket_cpu: [s], mother_wifi: wifi, price: { from: Math.round(Math.max(250, B * 0.04)), to: Math.round(Math.max(600, B * 0.16)) },
    }, 2, 'материнские платы ' + SOCKET_NAME[s]),
  ])).then((a) => a.flat());

  // Объёмы памяти: из фильтра пользователя, из «Тонких настроек» или по назначению
  let ramCaps;
  if (F.dram.volume_dram) ramCaps = RAM_CAPS.filter((c) => filters.inRange(c, F.dram.volume_dram)).slice(0, 3);
  else if (opts.ram && opts.ram !== 'auto') ramCaps = [Number(opts.ram)];
  else ramCaps = prof.ram.filter((c) => c <= 32 || B > 6000 || opts.purpose === 'work');
  const ramJobs = [];
  for (const mem of memNeeded) {
    for (const cap of ramCaps) {
      ramJobs.push(fetchCat('dram', {
        order: 'price:asc', dramkit: [mem.toLowerCase() + 'dimm'], volume_dram: { from: cap + 'gb', to: cap + 'gb' },
      }, 1, `память ${mem} ${cap} ГБ`));
    }
  }
  jobs.ram = Promise.all(ramJobs).then((a) => a.flat());

  if (!have.ssd) {
    let ssdCaps;
    if (F.ssd.volume_hdd) ssdCaps = SSD_CAPS.filter((c) => filters.inRange(c, F.ssd.volume_hdd));
    else if (opts.storage && opts.storage !== 'auto') ssdCaps = [Number(opts.storage)];
    else ssdCaps = prof.ssd;
    const capRange = { 256: ['240gb', '256gb'], 512: ['480gb', '512gb'], 1000: ['960gb', '1tb'], 2000: ['2tb', '2tb'], 4000: ['4tb', '4tb'] };
    const ssdJobs = [];
    for (const cap of ssdCaps) {
      const [from, to] = capRange[cap] || ['1tb', '1tb'];
      ssdJobs.push(fetchCat('ssd', { order: 'price:asc', volume_hdd: { from, to }, interface_ssd: ['pcie30x4', 'pcie40x4', 'pcie5x4'] }, 1, `SSD ${cap}`));
      ssdJobs.push(fetchCat('ssd', { order: 'price:asc', volume_hdd: { from, to }, interface_ssd: ['sata30'] }, 1, `SSD SATA ${cap}`));
    }
    jobs.ssd = Promise.all(ssdJobs).then((a) => a.flat());
  }

  if (opts.hdd && Number(opts.hdd) > 0) {
    const tb = Math.max(1, Math.round(Number(opts.hdd) / 1000));
    jobs.hdd = fetchCat('hdd', { order: 'price:asc', volume_hdd: { from: tb + 'tb', to: tb + 'tb' } }, 1, 'жёсткие диски');
  }

  if (!have.psu) {
    const certs = ['bronze', 'silver', 'golden', 'platinum', 'titanium'];
    jobs.psus = Promise.all([
      fetchCat('powersupply', { order: 'price:asc', power_sup: { from: 450, to: 700 }, '80plus_conform': certs, ffactorsize: ['atx'] }, 4, 'блоки питания'),
      fetchCat('powersupply', { order: 'price:asc', power_sup: { from: 750 }, '80plus_conform': certs, ffactorsize: ['atx'] }, 4, 'блоки питания 750+'),
      fetchCat('powersupply', { order: 'price:asc', power_sup: { from: 400 }, ffactorsize: ['atx'] }, 1, 'блоки питания (бюджетные)'),
    ]).then((a) => a.flat());
  }

  if (!have.case) {
    const target = Math.min(500, Math.max(80, B * 0.045));
    jobs.cases = Promise.all([
      fetchCat('chassis', { order: 'rating:desc', type_chassis: ['nopsu'], price: { from: Math.round(target * 0.5), to: Math.round(target * 1.6) } }, 2, 'корпуса'),
      fetchCat('chassis', { order: 'price:asc', type_chassis: ['nopsu'] }, 2, 'корпуса (дешёвые)'),
      fetchCat('chassis', { order: 'rating:desc', type_chassis: ['nopsu'], price: { from: 90, to: Math.round(Math.max(160, target * 0.6)) } }, 1, 'корпуса (недорогие с хорошим рейтингом)'),
    ]).then((a) => a.flat());
  }

  if (!have.cooler) {
    // Тип охлаждения: башенный кулер по умолчанию, СЖО — если пользователь выбрал её в фильтре
    let coolTypes = ['cpu'];
    if (F.fan.type_fan) {
      const t = F.fan.type_fan.filter((x) => x === 'cpu' || x === 'syslcp');
      if (t.length) coolTypes = t;
      delete F.fan.type_fan;
    }
    const fams = [...new Set(useSockets.map((s) => COOLER_FAMILY[SOCKET_NAME[s]]))];
    jobs.coolers = Promise.all(fams.map((f) => fetchCat('fan', {
      order: 'price:asc', type_fan: coolTypes, fan_socket: [f], power_cooling: { from: 110 }, price: { to: coolTypes.includes('syslcp') ? 900 : 450 },
    }, 3, 'кулеры').then((items) => items.map((it) => ({ ...it, family: f }))))).then((a) => a.flat());
  }

  const keys = Object.keys(jobs);
  const vals = await Promise.all(keys.map((k) => jobs[k]));
  const raw = {};
  keys.forEach((k, i) => (raw[k] = vals[i]));

  // Предупреждаем, если фильтры не оставили ни одного товара
  const RAW_KEY = { cpu: 'cpus', videocard: 'gpus', motherboard: 'boards', dram: 'ram', ssd: 'ssd', hdd: 'hdd', powersupply: 'psus', chassis: 'cases', fan: 'coolers' };
  for (const [schema, f] of Object.entries(F)) {
    if (!filters.countActive(f)) continue;
    const list = raw[RAW_KEY[schema]];
    if (list && !list.some(inStock)) {
      warnings.push(`По вашим фильтрам для «${SCHEMA_LABEL[schema]}» в наличии ничего не нашлось в пределах бюджета — ослабьте фильтры`);
    }
  }
  return { raw, warnings, F, sockets: useSockets.map((s) => SOCKET_NAME[s]) };
}

// ------------------------------------------------------------------ подготовка пулов

function boardSuitable(cpu, mb) {
  const cs = cpu.specs;
  const ms = mb.specs;
  if (!ms.socket || ms.socket !== cs.socket) return false;
  if (!ms.mem || !(cs.mem || []).includes(ms.mem)) return false;
  if (ms.socket === 'AM4' && OLD_AM4_CHIPSETS.test(ms.chipset || '') && /\b5\d{3}/.test(cpu.name)) return false;
  // A520 не поддерживает Ryzen 1000/2000 и Athlon 200GE/220GE/240GE
  if (ms.socket === 'AM4' && /^A520$/.test(ms.chipset || '') && /ryzen\s*\d\s*(pro\s*)?[12]\d{3}|athlon\s*(pro\s*)?2[024]0ge/i.test(cpu.name)) return false;
  const power = Compat.cpuPower(cpu);
  if (power >= 140 && /^(H610|H510|H410|A320|A520)$/.test(ms.chipset || '')) return false;
  // Мощному процессору — плату с нормальным питанием: не начального уровня и не «копеечную»
  if (power >= 190 && (ENTRY_CHIPSETS.test(ms.chipset || '') || mb.noname || mb.price < cpu.price * 0.22)) return false;
  return true;
}

function preparePools(raw, opts, B, F = {}) {
  const prof = PROFILES[opts.purpose] || PROFILES.gaming;
  const pools = { F };
  const allowedSockets = new Set(Object.values(SOCKET_NAME));

  // Процессоры: известная производительность, нужный сокет, отдельно OEM и BOX с кулером
  const cpus = (raw.cpus || []).filter((c) => inStock(c) && c.perf && allowedSockets.has(c.specs.socket) && (c.specs.mem || []).length &&
    !SERVER_CPU.test(c.name) && !PRE_RYZEN.test(c.name + ' ' + (c.specs.arch || '')));
  pools.cpuAll = cpus;
  pools.cpus = cheapestBy(cpus, (c) => (c.perf.key || c.name) + (c.specs.withCooler ? '+cooler' : ''));

  // Видеокарты: дешевейший вариант каждого чипа (с учётом объёма памяти)
  const strict = !!opts.trustedOnly;
  const gpus = (raw.gpus || []).filter((g) => inStock(g) && g.perf && g.perf.score >= 9).map((g) => ((g.noname = Brands.isNoname('videocard', g.name)), g)).filter((g) => !(strict && g.noname));
  pools.gpuAll = gpus;
  // убираем видеокарты, которые и дороже, и слабее другой
  const eff = (g) => g.perf.score * (g.noname ? 0.92 : 1);
  pools.gpus = cheapestBy(gpus, (g) => g.perf.key + ':' + (g.specs.vramGb || '') + (g.noname ? ':nn' : ''));
  pools.gpus = pools.gpus.filter((g, i, arr) => !arr.some((o, j) => j < i && eff(o) >= eff(g) && o.price < g.price));

  // Платы
  const userForms = F.motherboard && F.motherboard.type_mother;
  const formOk = (f) => {
    if (userForms) return f === 'ATX' || f === 'mATX' || f === 'ITX'; // формат задан фильтром Onliner
    if (opts.form === 'atx') return f === 'ATX';
    if (opts.form === 'matx') return f === 'mATX';
    return f === 'ATX' || f === 'mATX';
  };
  pools.boardAll = (raw.boards || [])
    .filter((m) => inStock(m) && m.specs.socket && m.specs.mem && formOk(m.specs.form) && (!opts.wifi || m.specs.wifi))
    .map((m) => ((m.noname = Brands.isNoname('motherboard', m.name)), m))
    .filter((m) => !(strict && m.noname));

  // Память: обычные DIMM, без серверной
  const ramOk = (r) => inStock(r) && r.specs.type && (r.specs.form === 'DIMM' || r.specs.form === 'CUDIMM') && !r.specs.registered && r.specs.totalGb;
  pools.ramAll = (raw.ram || []).filter(ramOk).map((r) => ((r.noname = Brands.isNoname('dram', r.name)), r)).filter((r) => !(strict && r.noname));
  pools.ram = {};
  for (const mem of ['DDR4', 'DDR5']) {
    const list = pools.ramAll.filter((r) => r.specs.type === mem && r.specs.form === 'DIMM');
    const out = [];
    const caps = [...new Set(list.map((r) => r.specs.totalGb))];
    for (const cap of caps) {
      const sub = list.filter((r) => r.specs.totalGb === cap).sort((a, b) => a.price - b.price);
      const fast = mem === 'DDR4' ? 3200 : 6000;
      const picks = [
        sub[0],
        sub.find((r) => r.specs.modules >= 2),
        sub.find((r) => r.specs.modules >= 2 && r.specs.mhz >= fast),
        // известные бренды: Kingston, Corsair, G.Skill, Crucial…
        sub.find((r) => !r.noname && r.specs.modules >= 2),
        sub.find((r) => !r.noname && r.specs.modules >= 2 && r.specs.mhz >= fast),
        sub.find((r) => !r.noname),
      ];
      for (const p of picks) if (p && !out.includes(p)) out.push(p);
    }
    pools.ram[mem] = out.sort((a, b) => a.price - b.price);
  }

  // SSD: по 2 варианта на объём (NVMe и SATA)
  const ssds = (raw.ssd || []).filter((s) => inStock(s) && s.specs.capacityGb)
    .map((x) => ((x.noname = Brands.isNoname('ssd', x.name)), x)).filter((x) => !(strict && x.noname));
  pools.ssdAll = ssds;
  pools.ssd = cheapestBy(ssds, (x) => Math.round(x.specs.capacityGb / 100) + ':' + (x.specs.iface || '?') + (x.noname ? ':nn' : ''));

  pools.hdd = (raw.hdd || []).filter(inStock).sort((a, b) => a.price - b.price)[0] || null;
  if (pools.hdd) pools.hdd.slot = 'hdd';

  // БП
  const psus = (raw.psus || []).filter((p) => inStock(p) && p.specs.watts && (!p.specs.form || p.specs.form === 'ATX') && !/без кабел/i.test(p.name));
  const goodBrands = psus.filter((p) => !PSU_AVOID.test(p.name));
  // Если производитель БП выбран в фильтре — уважаем выбор пользователя
  pools.psuUserBrand = !!(F.powersupply && F.powersupply.mfr);
  pools.psuAll = cheapestBy(B > 1200 && goodBrands.length > 5 && !pools.psuUserBrand ? goodBrands : psus, (p) => p.id);

  // Корпуса: «удачный» вариант около целевой цены для ATX и для mATX
  const target = Math.min(500, Math.max(80, B * 0.045));
  const cases = cheapestBy((raw.cases || []).filter((c) => inStock(c) && !c.specs.psuIncluded && !/SFF|горизонт/i.test(c.specs.class || ''))
    .map((c) => ((c.noname = Brands.isNoname('chassis', c.name)), c)).filter((c) => !(strict && c.noname)), (c) => c.id);
  pools.caseAll = cases;
  const caseScore = (c) => {
    const s = c.specs;
    let v = (c.rating || 3.8) + Math.min(s.fans || 0, 4) * 0.12 + (s.mesh ? 0.25 : 0) + (s.window ? 0.05 : 0);
    if (s.gpuMaxMm && s.gpuMaxMm < 300) v -= 0.6;
    v -= Math.abs(c.price - target) / target;
    return v;
  };
  const bestCase = (pred) => cases.filter(pred).sort((a, b) => caseScore(b) - caseScore(a))[0] || null;
  // Бюджетный, но приличный корпус: известный бренд, вентиляторы, длинная видеокарта влезает
  const cheapCase = (pred) => cases.filter((c) => pred(c) && !c.noname && (c.specs.fans || 0) >= 1 && (!c.specs.gpuMaxMm || c.specs.gpuMaxMm >= 320))
    .sort((a, b) => a.price - b.price)[0] || null;
  const fits = {
    ATX: (c) => c.specs.boards.includes('ATX'),
    mATX: (c) => c.specs.boards.includes('mATX') || c.specs.boards.includes('ATX'),
    ITX: (c) => c.specs.boards.length > 0,
  };
  pools.caseFor = {};
  pools.caseOpts = {};
  for (const [form, pred] of Object.entries(fits)) {
    pools.caseFor[form] = bestCase(pred);
    // Корпус тоже участвует в переборе: можно сэкономить на нём ради видеокарты
    pools.caseOpts[form] = [pools.caseFor[form], cheapCase(pred)].filter((c, i, a) => c && a.indexOf(c) === i);
  }

  // Кулеры
  pools.coolerAll = cheapestBy((raw.coolers || []).filter((c) => inStock(c) && c.specs.tdp), (c) => c.id + c.family);

  pools.prof = prof;
  applyPins(pools, opts);
  return pools;
}

const PIN_SLOTS = ['cpu', 'gpu', 'motherboard', 'ram', 'ssd', 'hdd', 'psu', 'case', 'cooler'];

/** Закреплённые пользователем детали (из Onliner, Kufar или поиска) — подбор строится вокруг них. */
function sanitizePins(pins) {
  const out = {};
  for (const slot of PIN_SLOTS) {
    const it = pins && pins[slot];
    if (!it || typeof it !== 'object' || !it.name || !(Number(it.price) > 0)) continue;
    out[slot] = { ...it, price: Number(it.price), specs: it.specs && typeof it.specs === 'object' ? it.specs : {}, pinned: true };
  }
  return out;
}

function applyPins(pools, opts) {
  const pins = sanitizePins(opts.pins);
  pools.pins = pins;
  if (pins.cpu) {
    const c = pins.cpu;
    if (!c.perf || c.perf.gaming == null) c.perf = perf.cpuPerf(c.name, c.specs) || { gaming: 80, multi: 80, igpu: 0 };
    if (!c.specs.mem || !c.specs.mem.length) c.specs.mem = { AM4: ['DDR4'], AM5: ['DDR5'], LGA1700: ['DDR4', 'DDR5'], LGA1851: ['DDR5'], LGA1200: ['DDR4'] }[c.specs.socket] || ['DDR4', 'DDR5'];
    pools.cpus = [c];
  }
  if (pins.gpu) {
    const g = pins.gpu;
    if (!g.perf || g.perf.score == null) {
      const key = perf.gpuKey(g.name);
      g.perf = key ? { key, ...perf.gpuPerf(key, g.specs.vramGb) } : { score: 60, watts: 200, name: g.name };
    }
    pools.gpus = [g];
  }
  if (pins.motherboard) pools.boardAll = [pins.motherboard];
  if (pins.ram) {
    const r = pins.ram;
    pools.ram = { DDR4: [], DDR5: [] };
    pools.ram[r.specs.type || 'DDR4'] = [r];
  }
  if (pins.ssd) pools.ssd = [pins.ssd];
  if (pins.hdd) pools.hdd = pins.hdd;
  if (pins.psu) pools.psuPinned = pins.psu;
  if (pins.case) {
    for (const f of Object.keys(pools.caseOpts)) pools.caseOpts[f] = [pins.case];
    pools.caseFor = { ATX: pins.case, mATX: pins.case, ITX: pins.case };
  }
  if (pins.cooler) pools.coolerPinned = pins.cooler;
}

// ------------------------------------------------------------------ оптимизация

function makePickers(pools, opts, B) {
  const psuMemo = new Map();
  function pickPsu(need) {
    if (opts.have && opts.have.psu) return null;
    if (pools.psuPinned) return pools.psuPinned;
    const key = need.rec;
    if (psuMemo.has(key)) return psuMemo.get(key);
    let list = pools.psuAll;
    if (B > 4000 && !pools.psuUserBrand) {
      const good = list.filter((p) => GOOD_PSU.test(p.name));
      if (good.some((p) => p.specs.watts >= need.rec)) list = good;
    }
    const bronze = list.find((p) => p.specs.watts >= need.rec && p.specs.cert >= 2);
    const gold = list.find((p) => p.specs.watts >= need.rec && p.specs.cert >= 4);
    let pick = bronze || list.find((p) => p.specs.watts >= need.rec) || undefined;
    if (gold && bronze && (B > 4000 || need.rec >= 750) && gold.price <= bronze.price * 1.3) pick = gold;
    psuMemo.set(key, pick);
    return pick;
  }

  const coolMemo = new Map();
  function pickCooler(cpu) {
    if (opts.have && opts.have.cooler) return null;
    const need = Compat.coolerNeed(cpu);
    if (pools.coolerPinned) return pools.coolerPinned;
    if (!need) return null;
    const fam = COOLER_FAMILY[cpu.specs.socket];
    const key = fam + ':' + need;
    if (coolMemo.has(key)) return coolMemo.get(key);
    const pick = pools.coolerAll.find((c) => c.family === fam && c.specs.tdp >= need && (!c.specs.heightMm || c.specs.heightMm >= 70));
    coolMemo.set(key, pick);
    return pick;
  }

  function pickCase(form) {
    if (opts.have && opts.have.case) return null;
    return pools.caseFor[form] || pools.caseFor.ATX || undefined;
  }

  function caseOptions(form) {
    if (opts.have && opts.have.case) return [null];
    const list = pools.caseOpts[form] && pools.caseOpts[form].length ? pools.caseOpts[form] : pools.caseOpts.ATX || [];
    return list;
  }

  const boardMemo = new Map();
  function boardsFor(cpu) {
    const key = cpu.id;
    if (boardMemo.has(key)) return boardMemo.get(key);
    const ok = pools.boardAll.filter((m) => boardSuitable(cpu, m)).sort((a, b) => a.price - b.price);
    const out = [];
    const seen = new Set();
    for (const m of ok) {
      const tier = ENTRY_CHIPSETS.test(m.specs.chipset || '') ? 'entry' : 'mid';
      const k = m.specs.mem + m.specs.form + tier;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(m);
    }
    boardMemo.set(key, out);
    return out;
  }

  return { pickPsu, pickCooler, pickCase, caseOptions, boardsFor };
}

function scoreParts(prof, purpose, cpu, gpu, ram, ssd, mb, haveGpu, kase) {
  let g = haveGpu ? 100 : gpu ? gpu.perf.score * (gpu.noname ? 0.92 : 1) : Math.max(1, cpu.perf.igpu || 1);
  if (prof.gpuCap) g = Math.min(g, prof.gpuCap);
  // Для офиса сверхмощный процессор не нужен: выше порога производительность не засчитывается
  const cg = prof.cpuCapG ? Math.min(cpu.perf.gaming, prof.cpuCapG) : cpu.perf.gaming;
  const cm = prof.cpuCapM ? Math.min(cpu.perf.multi, prof.cpuCapM) : cpu.perf.multi;
  let s = Math.pow(g, prof.wGpu) * Math.pow(cg, prof.wCpuG) * Math.pow(cm, prof.wCpuM);
  if (ram) {
    s *= stepFactor(RAM_F[purpose], ram.specs.totalGb);
    if (ram.specs.modules === 1) s *= purpose === 'office' ? 0.98 : 0.93;
    const mhz = ram.specs.mhz || 0;
    if (ram.specs.type === 'DDR4' && mhz < 3000) s *= 0.975;
    if (ram.specs.type === 'DDR5' && mhz < 5600) s *= 0.985;
    if (ram.noname) s *= Brands.PENALTY.dram;
  }
  if (ssd) {
    s *= stepFactor(SSD_F[purpose], ssd.specs.capacityGb);
    if (ssd.specs.iface === 'SATA') s *= purpose === 'office' ? 0.99 : 0.975;
    if (ssd.specs.qlc) s *= 0.99;
    if (ssd.noname) s *= Brands.PENALTY.ssd;
  }
  if (kase) {
    if (kase.noname) s *= Brands.PENALTY.chassis;
    if (!kase.specs.fans) s *= 0.99; // без вентиляторов придётся докупать
  }
  // Офису отдельная видеокарта почти ничего не даёт, а шумит и тратит деньги
  if (purpose === 'office' && gpu) s *= 0.95;
  if (mb && ENTRY_CHIPSETS.test(mb.specs.chipset || '')) s *= 0.99;
  if (mb && mb.noname) s *= 0.985;
  return s;
}

function optimize(pools, opts, budget) {
  const prof = pools.prof;
  const purpose = opts.purpose in PROFILES ? opts.purpose : 'gaming';
  const have = opts.have || {};
  const P = makePickers(pools, opts, budget);
  const userRam = (pools.F && pools.F.dram && pools.F.dram.volume_dram) || (pools.pins && pools.pins.ram);
  const minRam = userRam ? 0 : opts.ram && opts.ram !== 'auto' ? Number(opts.ram) : prof.minRam;
  const pinnedGpu = pools.pins && pools.pins.gpu;
  const ssdOpts = have.ssd ? [null] : pools.ssd;
  const hdd = pools.hdd;
  const hddCost = hdd ? hdd.price : 0;
  const PENALTY = 0.06;

  let best = null;
  for (const cpu of pools.cpus) {
    if (cpu.price > budget) continue;
    const cooler = P.pickCooler(cpu);
    if (cooler === undefined) continue;
    const gpuOpts = have.gpu ? [null] : pinnedGpu ? [pinnedGpu] : [...(cpu.specs.hasIgpu ? [null] : []), ...pools.gpus];
    for (const mb of P.boardsFor(cpu)) {
      const caseList = P.caseOptions(mb.specs.form);
      if (!caseList.length) continue;
      const rams = (pools.ram[mb.specs.mem] || []).filter((r) => r.specs.totalGb >= minRam * 0.94 && r.specs.modules <= (mb.specs.memSlots || 4));
      for (const kase of caseList)
      for (const ram of rams) {
        if (kase && kase.pinned && !Compat.boardFitsCase(mb.specs.form, kase)) continue;
        const plat = cpu.price + mb.price + ram.price + (cooler ? cooler.price : 0) + (kase ? kase.price : 0) + hddCost;
        if (plat > budget) continue;
        for (const gpu of gpuOpts) {
          const gp = gpu ? gpu.price : 0;
          if (plat + gp > budget) {
            if (gpu) break; // видеокарты отсортированы по цене
            continue;
          }
          const need = Compat.psuNeed(cpu, gpu, have.gpu ? 250 : 0);
          const psu = P.pickPsu(need);
          if (psu === undefined) continue;
          const base = plat + gp + (psu ? psu.price : 0);
          if (base > budget) continue;
          for (const ssd of ssdOpts) {
            const total = base + (ssd ? ssd.price : 0);
            if (total > budget) continue;
            const s = scoreParts(prof, purpose, cpu, gpu, ram, ssd, mb, have.gpu, kase);
            const obj = s * (1 - PENALTY * (total / budget));
            if (!best || obj > best.obj) {
              best = { obj, score: s, total, parts: { cpu, motherboard: mb, ram, gpu, ssd, hdd, psu, case: kase, cooler }, need };
            }
          }
        }
      }
    }
  }
  return best;
}

/** Минимально возможная стоимость сборки (для подсказки, если бюджета не хватает). */
function minimalCost(pools, opts) {
  const o = { ...opts, purpose: 'office', ram: 'auto' };
  const p = { ...pools, prof: PROFILES.office };
  const P = makePickers(p, o, 1000);
  let min = Infinity;
  for (const cpu of pools.cpus) {
    const cooler = P.pickCooler(cpu);
    if (cooler === undefined) continue;
    for (const mb of P.boardsFor(cpu)) {
      const kase = P.pickCase(mb.specs.form);
      const ram = (pools.ram[mb.specs.mem] || [])[0];
      if (!ram || kase === undefined) continue;
      const gpu = cpu.specs.hasIgpu || (opts.have && opts.have.gpu) ? null : pools.gpus[0];
      if (gpu === undefined) continue;
      const psu = P.pickPsu(Compat.psuNeed(cpu, gpu, 0));
      if (psu === undefined) continue;
      const ssd = opts.have && opts.have.ssd ? null : pools.ssd[0];
      const t = cpu.price + mb.price + ram.price + (cooler ? cooler.price : 0) + (kase ? kase.price : 0) +
        (gpu ? gpu.price : 0) + (psu ? psu.price : 0) + (ssd ? ssd.price : 0);
      if (t < min) min = t;
    }
  }
  return min === Infinity ? null : Math.ceil(min);
}

// ------------------------------------------------------------------ альтернативы

function around(list, current, below = 3, above = 4) {
  const sorted = list.filter((x) => x && x.id !== current.id).sort((a, b) => a.price - b.price);
  const lower = sorted.filter((x) => x.price <= current.price).slice(-below);
  const upper = sorted.filter((x) => x.price > current.price).slice(0, above);
  return lower.concat(upper);
}

function pct(a, b) {
  if (!a || !b) return null;
  return Math.round((a / b - 1) * 100);
}

function alternatives(build, pools, opts) {
  const p = build.parts;
  const alt = {};
  const wrap = (item, cur, extra) => ({ item, diff: Math.round((item.price - cur.price) * 100) / 100, ...extra });

  if (p.cpu) {
    const mb = p.motherboard;
    const list = pools.cpus.filter((c) => !mb || boardSuitable(c, mb));
    alt.cpu = around(list, p.cpu).map((c) => wrap(c, p.cpu, {
      perf: `игры ${fmtPct(pct(c.perf.gaming, p.cpu.perf.gaming))}, многопоток ${fmtPct(pct(c.perf.multi, p.cpu.perf.multi))}`,
    }));
  }
  if (p.gpu) {
    alt.gpu = around(pools.gpus, p.gpu).map((g) => wrap(g, p.gpu, { perf: `производительность ${fmtPct(pct(g.perf.score, p.gpu.perf.score))}` }));
    alt.gpuSame = pools.gpuAll
      .filter((g) => g.perf.key === p.gpu.perf.key && g.id !== p.gpu.id)
      .sort((a, b) => a.price - b.price)
      .slice(0, 6)
      .map((g) => wrap(g, p.gpu, { perf: 'тот же чип, другой производитель' }));
  } else if (!(opts.have && opts.have.gpu) && pools.gpus.length) {
    alt.gpu = pools.gpus.slice(0, 6).map((g) => ({ item: g, diff: g.price, perf: `${g.perf.name}: вместо встроенной графики` }));
  }
  if (p.motherboard) {
    const list = pools.boardAll.filter((m) => p.cpu && boardSuitable(p.cpu, m) && (!p.ram || m.specs.mem === p.ram.specs.type));
    const sorted = list.filter((m) => m.id !== p.motherboard.id).sort((a, b) => a.price - b.price);
    const picks = sorted.slice(0, 5);
    const wifi = sorted.find((m) => m.specs.wifi);
    if (wifi && !picks.includes(wifi)) picks.push(wifi);
    const atx = sorted.find((m) => m.specs.form !== p.motherboard.specs.form);
    if (atx && !picks.includes(atx)) picks.push(atx);
    alt.motherboard = picks.map((m) => wrap(m, p.motherboard, { perf: [m.specs.chipset, m.specs.form, m.specs.wifi ? 'Wi-Fi' : null].filter(Boolean).join(', ') }));
  }
  if (p.ram) {
    const list = pools.ramAll.filter((r) => r.specs.type === p.ram.specs.type && r.specs.form === 'DIMM');
    const byCap = cheapestBy(list, (r) => r.specs.totalGb + ':' + r.specs.modules + ':' + (r.specs.mhz || 0));
    alt.ram = around(byCap, p.ram, 3, 5).map((r) => wrap(r, p.ram, { perf: `${r.specs.totalGb} ГБ, ${r.specs.modules}×, ${r.specs.mhz || '?'} МГц` }));
  }
  if (p.ssd) {
    const byCap = cheapestBy(pools.ssdAll, (s) => s.id);
    alt.ssd = around(byCap, p.ssd, 3, 5).map((s) => wrap(s, p.ssd, { perf: `${fmtCap(s.specs.capacityGb)}, ${s.specs.iface || ''}${s.specs.read ? ', ' + s.specs.read + ' МБ/с' : ''}` }));
  }
  if (p.psu) {
    const need = build.need ? build.need.rec : 0;
    const list = pools.psuAll.filter((x) => x.specs.watts >= need && x.id !== p.psu.id).sort((a, b) => a.price - b.price);
    const picks = list.slice(0, 5);
    const gold = list.find((x) => x.specs.cert >= 4);
    if (gold && !picks.includes(gold)) picks.push(gold);
    alt.psu = picks.map((x) => wrap(x, p.psu, { perf: `${x.specs.watts} Вт, ${x.specs.certName}` }));
  }
  if (p.case) {
    const form = p.motherboard ? p.motherboard.specs.form : 'ATX';
    const list = pools.caseAll.filter((c) => Compat.boardFitsCase(form, c));
    alt.case = around(list, p.case, 3, 4).map((c) => wrap(c, p.case, { perf: [c.specs.class, c.specs.fans ? c.specs.fans + ' вент.' : 'без вентиляторов', c.specs.gpuMaxMm ? 'GPU до ' + c.specs.gpuMaxMm + ' мм' : null].filter(Boolean).join(', ') }));
  }
  if (p.cooler) {
    const need = Compat.coolerNeed(p.cpu);
    const fam = COOLER_FAMILY[p.cpu.specs.socket];
    const list = pools.coolerAll.filter((c) => c.family === fam && c.specs.tdp >= need);
    alt.cooler = around(list, p.cooler, 2, 5).map((c) => wrap(c, p.cooler, { perf: `до ${c.specs.tdp} Вт${c.specs.heightMm ? ', ' + c.specs.heightMm + ' мм' : ''}` }));
  }
  return alt;
}

function fmtPct(v) {
  if (v == null) return '?';
  if (v === 0) return '±0%';
  return (v > 0 ? '+' : '') + v + '%';
}

function fmtCap(gb) {
  return gb >= 1000 ? gb / 1000 + ' ТБ' : gb + ' ГБ';
}

// ------------------------------------------------------------------ главная функция

const VARIANTS = [
  { id: 'economy', label: 'Экономнее', k: 0.85, hint: 'Почти то же, но дешевле' },
  { id: 'optimal', label: 'Оптимально', k: 1, hint: 'Максимум за ваш бюджет' },
  { id: 'plus', label: 'С запасом', k: 1.15, hint: 'Если добавить ~15%' },
];

async function build(opts) {
  const budget = Number(opts.budgetByn);
  if (!(budget > 0)) throw new Error('Укажите бюджет');
  const t0 = Date.now();
  // Сетап: что добавить к ПК (монитор, клавиатура, …)
  const setupIds = (Array.isArray(opts.setup) ? opts.setup : []).filter((id) => Catalog.setupById[id]);
  const setupWarnings = [];
  const [{ raw, warnings, sockets, F }, setupPools] = await Promise.all([
    gather(opts, budget * 1.15),
    setupIds.length ? Setup.gather(setupIds, budget * 1.15, opts.filters, setupWarnings) : Promise.resolve({}),
  ]);
  warnings.push(...setupWarnings);
  const pools = preparePools(raw, opts, budget * 1.15, F);
  if (!pools.cpus.length) throw new Error('Не удалось загрузить процессоры с Onliner. Проверьте интернет и попробуйте ещё раз.');

  const variants = [];
  for (const v of VARIANTS) {
    const b = Math.round(budget * v.k);
    let best;
    let setup = null;
    if (setupIds.length) {
      // 1) ПК на бюджет за вычетом примерной доли сетапа; 2) сетап (монитор — под получившуюся видеокарту);
      // 3) ПК заново на точный остаток
      const first = optimize(pools, opts, b - Setup.reserve(setupIds, b));
      const idx = first ? Compat.indices(first.parts, opts.have && opts.have.gpu) : { gaming: 0 };
      setup = Setup.choose(setupIds, setupPools, b, opts.purpose, idx.gaming);
      best = optimize(pools, opts, b - setup.total) || first;
    } else {
      best = optimize(pools, opts, b);
    }
    if (!best) {
      variants.push({ id: v.id, label: v.label, hint: v.hint, budget: b, build: null });
      continue;
    }
    const result = {
      total: Math.round(best.total * 100) / 100,
      parts: best.parts,
      need: best.need,
      index: Compat.indices(best.parts, opts.have && opts.have.gpu),
      checks: Compat.check(best.parts, opts.have),
    };
    result.alternatives = alternatives(result, pools, opts);
    if (setup) {
      result.setup = setup.items;
      result.setupNotes = setup.notes;
      result.setupTotal = Math.round(setup.total * 100) / 100;
      result.setupAlternatives = {};
      for (const [id, it] of Object.entries(setup.items)) result.setupAlternatives[id] = Setup.alternatives(setupPools[id] || [], it);
    }
    variants.push({ id: v.id, label: v.label, hint: v.hint, budget: b, build: result });
  }
  // Убираем одинаковые варианты
  const sig = (v) => (v.build ? Object.values(v.build.parts).concat(Object.values(v.build.setup || {})).map((x) => (x ? x.id : '-')).join('|') : '');
  const opt = variants.find((v) => v.id === 'optimal');
  for (const v of variants) if (v.id !== 'optimal' && v.build && sig(v) === sig(opt)) v.same = true;

  let minNeeded = null;
  if (!opt.build) minNeeded = minimalCost(pools, opts);

  return {
    budget,
    purpose: opts.purpose,
    purposeLabel: (PROFILES[opts.purpose] || PROFILES.gaming).label,
    variants,
    minNeeded,
    warnings,
    stats: {
      cpus: pools.cpus.length, gpus: pools.gpus.length, boards: pools.boardAll.length,
      ram: pools.ramAll.length, ssd: pools.ssdAll.length, psu: pools.psuAll.length, cases: pools.caseAll.length,
      sockets, ms: Date.now() - t0,
    },
  };
}

module.exports = { build, PROFILES, boardSuitable };
