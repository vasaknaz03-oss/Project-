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
// Монтаж кулера: LGA1851 использует крепление LGA1700, старые LGA115x — то же, что LGA1200
const COOLER_FAMILY = { AM4: 'am4', AM5: 'am5', LGA1700: 'lga1700', LGA1851: 'lga1700', LGA1200: 'lga1200', LGA1151: 'lga1200', LGA1150: 'lga1200', LGA1155: 'lga1200' };

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
function makeFetcher(F, warnings, conflicts) {
  return function fetchCat(schema, params, pages, what) {
    const merged = filters.merge(params, F[schema]);
    if (!merged) {
      if (conflicts) conflicts.add(schema); // фильтр противоречит условию подбора
      return Promise.resolve([]);
    }
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
  const conflicts = new Set();
  const fetchCat = makeFetcher(F, warnings, conflicts);
  const sockets = opts.platform === 'modern' ? MODERN_SOCKETS : ALL_SOCKETS;
  const cpuMfr = opts.cpuBrand === 'amd' ? ['amd'] : opts.cpuBrand === 'intel' ? ['intel'] : undefined;
  let useSockets = sockets.filter((s) => {
    if (opts.cpuBrand === 'amd') return s.startsWith('am');
    if (opts.cpuBrand === 'intel') return s.startsWith('lga');
    return true;
  });
  // Закреплённый процессор или плата важнее настроек: грузим всё под их сокет
  const pinned = opts.pins || {};
  const pinSockets = [pinned.cpu, pinned.motherboard].map((p) => p && p.specs && p.specs.socket).filter(Boolean);
  const pinIds = [...new Set(pinSockets.map((ps) => Object.keys(SOCKET_NAME).find((k) => SOCKET_NAME[k] === ps)).filter(Boolean))];
  let cpuMfrUse = cpuMfr;
  if (pinIds.length) {
    useSockets = pinIds;
    cpuMfrUse = undefined;
  }
  const memNeeded = new Set(useSockets.flatMap((s) => SOCKET_MEM[SOCKET_NAME[s]]));

  const jobs = {};
  // Узкие ценовые диапазоны: дешёвые модели не вытесняют дорогие из выдачи
  const cpuEdges = [0, 250, 400, 600, 850, 1200, 1700, 2500, 4000].filter((e) => e < B * 0.5).concat(Math.round(B * 0.5));
  jobs.cpus = banded(fetchCat, 'cpu', { order: 'price:asc', socket_cpu: useSockets, mfr: cpuMfrUse }, cpuEdges, 3, 'процессоры');

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
    // Для дорогих сборок сразу смотрим и СЖО: горячим процессорам башенного кулера может не хватить
    let coolTypes = B >= 5000 ? ['cpu', 'syslcp'] : ['cpu'];
    if (F.fan.type_fan) {
      const t = F.fan.type_fan.filter((x) => x === 'cpu' || x === 'syslcp');
      if (t.length) coolTypes = t;
      delete F.fan.type_fan;
    }
    // Кулеры под сокеты подбора и под сокет закреплённой детали (в том числе старый, например LGA1151)
    const fams = [...new Set(useSockets.map((s) => COOLER_FAMILY[SOCKET_NAME[s]]).concat(pinSockets.map((ps) => COOLER_FAMILY[ps])).filter(Boolean))];
    const maxPrice = coolTypes.includes('syslcp') ? 900 : 450;
    // Дешёвые по цене + хорошие по рейтингу дороже 60 р. (двухбашенные и СЖО иначе не попадают в выборку)
    jobs.coolers = Promise.all(fams.flatMap((f) => [
      fetchCat('fan', { order: 'price:asc', type_fan: coolTypes, fan_socket: [f], power_cooling: { from: 110 }, price: { to: maxPrice } }, 3, 'кулеры'),
      fetchCat('fan', { order: 'rating:desc', type_fan: coolTypes, fan_socket: [f], price: { from: 60, to: maxPrice } }, 2, 'кулеры'),
    ].map((job) => job.then((items) => items.map((it) => ({ ...it, family: f })))))).then((a) => a.flat());
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
      if (conflicts.has(schema)) {
        warnings.push(`Фильтр для «${SCHEMA_LABEL[schema]}» противоречит тонким настройкам (например, в фильтре видеокарта AMD, а в настройках — NVIDIA, или сокет не того производителя) — уберите одно из условий`);
      } else {
        warnings.push(`По вашим фильтрам для «${SCHEMA_LABEL[schema]}» в наличии ничего не нашлось в пределах бюджета — ослабьте фильтры`);
      }
    }
  }
  return { raw, warnings, F, sockets: useSockets.map((s) => SOCKET_NAME[s]) };
}

// ------------------------------------------------------------------ подготовка пулов

// LGA1151 бывает двух несовместимых версий: платы 100/200-й серии — Core 6–7 поколения, 300-й — Core 8–9
function lga1151Mismatch(cpuName, chipset) {
  const gen = Number((String(cpuName).match(/i[3579][- ]?([6-9])\d{3}/i) || [])[1]);
  if (!gen || !chipset) return false;
  const v2Board = /^[BHZQ]3\d\d/.test(chipset);
  const v1Board = /^[BHZQ][12]\d\d/.test(chipset);
  return (v2Board && gen < 8) || (v1Board && gen >= 8);
}

function boardSuitable(cpu, mb) {
  const cs = cpu.specs;
  const ms = mb.specs;
  if (!ms.socket || ms.socket !== cs.socket) return false;
  if (!ms.mem || !(cs.mem || []).includes(ms.mem)) return false;
  if (ms.socket === 'LGA1151' && lga1151Mismatch(cpu.name, ms.chipset)) return false;
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
    if (pools.caseFor[form]) pools.caseFor[form].goodCase = true;
  }

  // Кулеры
  pools.coolerAll = cheapestBy((raw.coolers || []).filter(inStock), (c) => c.id + c.family);

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
    // owned — деталь, которая у пользователя уже есть (апгрейд): цена 0
    // keep — деталь из «своей сборки»: оставляем, даже если цену пользователь не указал
    if (!it || typeof it !== 'object' || !it.name || (!(Number(it.price) > 0) && !it.owned && !it.keep)) continue;
    out[slot] = { ...it, price: Number(it.price) || 0, specs: it.specs && typeof it.specs === 'object' ? it.specs : {}, pinned: true };
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
  function pickPsu(need, gpu) {
    if (opts.have && opts.have.psu) return null;
    if (pools.psuPinned) {
      const pin = pools.psuPinned;
      if ((pin.specs.watts && pin.specs.watts < need.min) || Compat.checkGpuPower(gpu, pin)?.level === 'error') return undefined;
      return pin;
    }
    const inputs = gpu?.specs?.gpuInputs;
    const key = [need.rec, inputs?.six, inputs?.eight, inputs?.sixteen, gpu?.specs?.adapter8].join(':');
    if (psuMemo.has(key)) return psuMemo.get(key);
    let list = inputs ? pools.psuAll.filter((p) => Compat.checkGpuPower(gpu, p)?.level !== 'error') : pools.psuAll;
    if (B > 1500 && !pools.psuUserBrand) {
      const good = list.filter((p) => GOOD_PSU.test(p.name));
      if (good.some((p) => p.specs.watts >= need.rec)) list = good;
    }
    // Проверенная серия, если она не намного дороже (в дорогих сборках — с большим допуском)
    const fit = list.filter((p) => p.specs.watts >= need.rec && p.specs.cert >= 2);
    const great = fit.find((p) => GREAT_PSU.test(p.name) && ratingFactor(p) >= 1);
    if (B > 3000 && great && fit[0] && great.price <= fit[0].price * (B >= 8000 ? 1.8 : 1.35) + 20) {
      psuMemo.set(key, great);
      return great;
    }
    const bronze = list.find((p) => p.specs.watts >= need.rec && p.specs.cert >= 2);
    const gold = list.find((p) => p.specs.watts >= need.rec && p.specs.cert >= 4);
    let pick = bronze || list.find((p) => p.specs.watts >= need.rec) || undefined;
    // Чем дороже сборка, тем важнее надёжный БП: на дорогих — Gold, даже если он заметно дороже Bronze
    const goldLimit = B >= 9000 || need.rec >= 850 || opts.quiet ? 2.4 : B >= 6000 ? 1.8 : 1.3;
    if (gold && bronze && (B > 4000 || need.rec >= 750) && gold.price <= bronze.price * goldLimit) pick = gold;
    psuMemo.set(key, pick);
    return pick;
  }

  const coolMemo = new Map();
  function pickCooler(cpu, maxH) {
    if (opts.have && opts.have.cooler) return null;
    const need = Compat.coolerNeed(cpu);
    if (pools.coolerPinned) return pools.coolerPinned;
    if (!need) return null;
    const fam = COOLER_FAMILY[cpu.specs.socket];
    // need — расчётная нагрузка процессора с запасом.
    let want = B >= 7000 ? Math.round(need * 1.25) : B >= 4500 ? Math.round(need * 1.15) : need;
    if (opts.quiet) want = Math.max(want, Math.round(need * 1.4));
    const key = fam + ':' + need + ':' + want + ':' + (maxH || '');
    if (coolMemo.has(key)) return coolMemo.get(key);
    // maxH — сколько кулера помещается в корпус по высоте
    const fitsH = (c) => c.family === fam && (!c.specs.heightMm || (c.specs.heightMm >= 70 && (!maxH || c.specs.heightMm <= maxH)));
    const available = pools.coolerAll.filter(fitsH).sort((a, b) => a.price - b.price);
    const watts = (c) => c.specs.dissipationWatts || 0;
    const choose = (min) => {
      const first = available.find((c) => watts(c) >= min);
      if (!first) return null;
      return available.find((c) => watts(c) >= min && c.price <= first.price * 1.3 + 15 && ratingFactor(c) > 1) || first;
    };
    const pick = choose(want) || choose(need) || available.sort((a, b) => watts(b) - watts(a))[0];
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
    if (pools.pins?.case || !pools.checkedHardware) return list;
    const extra = pools.caseAll.filter((c) => !list.includes(c) && Compat.boardFitsCase(form, c))
      .sort((a, b) => (b.specs.gpuMaxMm || 0) - (a.specs.gpuMaxMm || 0) || a.price - b.price).slice(0, 3);
    return list.concat(extra);
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

// Проверенные серии блоков питания (по обзорам и тестам)
const GREAT_PSU = /seasonic (focus|vertex|prime|core gx)|corsair (rm\d|rme|hx|sf\d|cx\d+f)|be quiet!? ?(pure power 1[23]|straight power|dark power|system power 1[01])|msi mag a\d+gl|deepcool (pq|pn|pm|px)\d|super flower leadex|xpg core ?reactor|cooler master (v\d+ gold|mwe gold)|thermaltake toughpower gf|fsp hydro (g|ti|pro)|chieftec (proton|polaris|vega)|montech (titan|century)|asus (rog|tuf gaming)|gigabyte (ud\d+gm|aorus)|zalman teramax|arctic|lian li (edge|sp)|nzxt c\d+/i;

/** Оценка покупателей на Onliner: заметно плохие отзывы — штраф, отличные — небольшой плюс. */
function ratingFactor(it, weight = 1) {
  if (!it || !it.reviews || it.reviews < 5 || !it.rating) return 1;
  let f = 1;
  if (it.rating < 3.5) f = 0.94;
  else if (it.rating < 4) f = 0.97;
  else if (it.rating >= 4.7 && it.reviews >= 15) f = 1.01;
  // weight — насколько деталь влияет на впечатление: видеокарта сильно, SSD и корпус слабо
  return 1 + (f - 1) * weight;
}

/** «Пожирнее» плата: фазы питания под горячий процессор, слоты памяти, M.2, Wi-Fi. rich — вес для дорогих сборок. */
function boardFactor(mb, cpu, rich) {
  const ms = mb.specs || {};
  const hot = Compat.cpuPower(cpu);
  let q = 1;
  if (ms.phases) {
    if (hot >= 150 && ms.phases < 10) q *= 0.96;
    else if (hot >= 120 && ms.phases < 8) q *= 0.97;
    else if (ms.phases >= 12) q *= 1.01;
  }
  if ((ms.memSlots || 2) >= 4) q *= 1.006;
  if ((ms.m2 || 1) >= 2) q *= 1.006;
  if ((ms.m2 || 1) >= 3) q *= 1.003;
  if (ms.wifi) q *= 1.003;
  // Плата важна, но не должна перевешивать видеокарту и процессор
  return Math.min(1.03, Math.max(0.96, 1 + (q - 1) * rich));
}

function scoreParts(prof, purpose, cpu, gpu, ram, ssd, mb, haveGpu, kase, quiet, budget) {
  const rich = budget >= 8000 ? 1.3 : budget >= 5000 ? 1.15 : 1;
  let g = haveGpu ? 100 : gpu ? gpu.perf.score : Math.max(1, cpu.perf.igpu || 1);
  if (prof.gpuCap) g = Math.min(g, prof.gpuCap);
  // Штраф за малоизвестный бренд — после ограничения, иначе для офиса он теряется
  if (gpu && gpu.noname) g *= Brands.PENALTY.videocard;
  // Б/у с Kufar: без гарантии магазина — берём, только если выгода заметная
  if (gpu && gpu.fromKufar) g *= 0.95;
  // Для офиса сверхмощный процессор не нужен: выше порога производительность не засчитывается
  const cg = prof.cpuCapG ? Math.min(cpu.perf.gaming, prof.cpuCapG) : cpu.perf.gaming;
  const cm = prof.cpuCapM ? Math.min(cpu.perf.multi, prof.cpuCapM) : cpu.perf.multi;
  let s = Math.pow(g, prof.wGpu) * Math.pow(cg, prof.wCpuG) * Math.pow(cm, prof.wCpuM);
  if (cpu.fromKufar) s *= 0.98;
  if (ram) {
    s *= stepFactor(RAM_F[purpose], ram.specs.totalGb);
    // Встроенной графике нужен двухканальный режим: с одной планкой она теряет до трети скорости
    if (ram.specs.modules === 1) s *= purpose === 'office' ? (!gpu && !haveGpu ? 0.97 : 0.98) : !gpu && !haveGpu ? 0.9 : 0.93;
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
    // Хороший продув важен мощному железу: при дорогой видеокарте «удачный» корпус в приоритете
    if (kase.goodCase && gpu && gpu.price >= 2500) s *= 1.012;
    if (kase.specs.fans === 0) s *= 0.99;
    if (quiet && kase.specs.fans != null && kase.specs.fans < 2) s *= 0.98;
  }
  // Офису отдельная видеокарта почти ничего не даёт, а шумит и тратит деньги
  if (purpose === 'office' && gpu) s *= 0.92;
  // Дорогому процессору — плата не начального уровня (питание, слоты, разгон памяти)
  if (mb && ENTRY_CHIPSETS.test(mb.specs.chipset || '')) s *= cpu.price >= 1200 ? 0.97 : cpu.price >= 700 ? 0.98 : 0.99;
  if (mb && mb.noname) s *= 0.985;
  if (mb) s *= boardFactor(mb, cpu, rich) * ratingFactor(mb, 0.5);
  if (ram) s *= ratingFactor(ram, 0.5);
  if (ssd) s *= ratingFactor(ssd, 0.3);
  if (gpu) s *= ratingFactor(gpu, 1);
  // Мощной видеокарте — корпус с продувом, а не самый дешёвый
  if (kase && gpu && gpu.price >= 3000 && !kase.goodCase) s *= 0.992;
  if (kase) s *= ratingFactor(kase, 0.3);
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
  // Штраф за трату: на маленьком бюджете бережём деньги, на большом — человек хочет максимум мощности
  const PENALTY = budget >= 8000 ? 0.025 : budget >= 5000 ? 0.045 : 0.06;

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
        // Кулер должен поместиться в корпус по высоте — иначе берём другой, пониже
        let cool = cooler;
        if (cool && kase && kase.specs.coolerMaxMm && cool.specs.heightMm && cool.specs.heightMm > kase.specs.coolerMaxMm && !pools.coolerPinned) {
          cool = P.pickCooler(cpu, kase.specs.coolerMaxMm);
          if (!cool) continue;
        }
        const plat = cpu.price + mb.price + ram.price + (cool ? cool.price : 0) + (kase ? kase.price : 0) + hddCost;
        if (plat > budget) continue;
        for (const gpu of gpuOpts) {
          const gp = gpu ? gpu.price : 0;
          if (plat + gp > budget) {
            if (gpu) break; // видеокарты отсортированы по цене
            continue;
          }
          if (Compat.gpuCaseErrors(gpu, kase).length) continue;
          const need = Compat.psuNeed(cpu, gpu, have.gpu ? 250 : 0);
          const psu = P.pickPsu(need, gpu);
          if (psu === undefined) continue;
          const base = plat + gp + (psu ? psu.price : 0);
          if (base > budget) continue;
          for (const ssd of ssdOpts) {
            const total = base + (ssd ? ssd.price : 0);
            if (total > budget) continue;
            const s = scoreParts(prof, purpose, cpu, gpu, ram, ssd, mb, have.gpu, kase, !!opts.quiet, budget);
            const obj = s * (1 - PENALTY * (total / budget));
            if (!best || obj > best.obj) {
              best = { obj, score: s, total, parts: { cpu, motherboard: mb, ram, gpu, ssd, hdd, psu, case: kase, cooler: cool }, need };
            }
          }
        }
      }
    }
  }
  return best;
}

async function verifyHardware(best, pools, opts, budget) {
  for (let attempt = 0; best && attempt < 5; attempt++) {
    const { gpu, psu, case: kase, cpu, cooler } = best.parts;
    await Promise.all([gpu, psu, kase, cooler].map(onliner.enrichHardware));
    const need = Compat.psuNeed(cpu, gpu, opts.have?.gpu ? 250 : 0);
    const coolerLimit = kase?.specs?.coolerMaxMm;
    const tooTall = !cooler?.specs?.aio && coolerLimit > 0 && cooler?.specs?.heightMm > coolerLimit;
    const fit = !Compat.gpuCaseErrors(gpu, kase).length && Compat.checkGpuPower(gpu, psu)?.level !== 'error'
      && (!tooTall || pools.coolerPinned);
    const watts = psu?.specs.watts;
    const requiredWatts = psu?.pinned || pools.psuPinned ? need.min : need.rec;
    const adequate = !watts || watts >= requiredWatts;
    if (fit && adequate) return { ...best, need };
    if (attempt === 4) break;
    await tick();
    best = optimize({ ...pools, checkedHardware: true }, opts, budget);
  }
  return null;
}

/**
 * Закреплена плата или процессор под сокет, которого уже нет в новых товарах (LGA1151 и т. п.):
 * вторую деталь пары подбираем из объявлений Kufar.
 */
async function kufarForPinnedSocket(pools, warnings) {
  const pins = pools.pins || {};
  const KC = require('./kufarCompat');
  const mb = pins.motherboard;
  const cpu = pins.cpu;
  if (mb && !cpu && mb.specs && mb.specs.socket && !pools.cpus.some((c) => boardSuitable(c, mb))) {
    const sock = mb.specs.socket;
    if (!/^DDR[45]$/.test(mb.specs.mem || '')) {
      warnings.push(`Плата под ${sock} с памятью ${mb.specs.mem || '?'}: такие сборки программа не подбирает автоматически — процессор и память для неё ищите в «Поиске» на Kufar.`);
      return;
    }
    let found = [];
    try {
      // Все объявления с процессорами под сокет (до 4 страниц), дешёвые Celeron отсекает порог цены
      const r = await KC.compatible('cpu', { specs: { socket: sock }, price: 300 }, {}, { limit: 200, pages: 4 });
      found = r.items.filter((it) => it.perf?.gaming && !SERVER_CPU.test(it.name) && boardSuitable(it, mb))
        .map((it) => ({ ...it, category: 'cpu', slot: 'cpu', fromKufar: true, offers: 0, kufarNote: 'процессор с Kufar под закреплённую плату' }));
    } catch {}
    if (found.length) {
      pools.cpus = pools.cpus.concat(cheapestBy(found, (x) => x.perf.key));
      warnings.push(`Новых процессоров под ${sock} в продаже нет — к закреплённой плате подобраны объявления Kufar. Проверьте состояние и продавца.`);
    } else {
      warnings.push(`Под сокет ${sock} не нашлось процессоров ни в магазинах, ни на Kufar. Закрепите процессор вручную через «Поиск» → Kufar.`);
    }
  }
  if (cpu && !mb && cpu.specs && cpu.specs.socket && !pools.boardAll.some((m) => boardSuitable(cpu, m))) {
    const sock = cpu.specs.socket;
    let found = [];
    try {
      const mem = (cpu.specs.mem || []).find((m) => /^DDR[45]$/.test(m));
      const r = await KC.compatible('motherboard', { specs: { socket: sock, mem }, price: 300 }, {}, { limit: 60, pages: 2 });
      found = r.items.filter((m) => m.specs.chipset && boardSuitable(cpu, m)).slice(0, 30)
        .map((m) => ({ ...m, category: 'motherboard', slot: 'motherboard', fromKufar: true, offers: 0, kufarNote: 'плата с Kufar под закреплённый процессор' }));
    } catch {}
    if (found.length) {
      pools.boardAll = pools.boardAll.concat(found);
      warnings.push(`Новых плат под ${sock} в продаже нет — к закреплённому процессору подобраны объявления Kufar. Проверьте состояние и продавца.`);
    } else {
      warnings.push(`Под сокет ${sock} не нашлось плат ни в магазинах, ни на Kufar. Закрепите плату вручную через «Поиск» → Kufar.`);
    }
  }
}

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
      if (Compat.gpuCaseErrors(gpu, kase).length) continue;
      const psu = P.pickPsu(Compat.psuNeed(cpu, gpu, 0), gpu);
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
  const gpuFits = (g) => !Compat.gpuCaseErrors(g, p.case).length && Compat.checkGpuPower(g, p.psu)?.level !== 'error'
    && (!p.psu?.specs.watts || p.psu.specs.watts >= Compat.psuNeed(p.cpu, g, 0).min);
  if (p.gpu) {
    alt.gpu = around(pools.gpus.filter(gpuFits), p.gpu).map((g) => wrap(g, p.gpu, { perf: `производительность ${fmtPct(pct(g.perf.score, p.gpu.perf.score))}` }));
    const variant = perf.gpuVariantKey(p.gpu.perf.key, p.gpu.specs.vramGb);
    alt.gpuSame = pools.gpuAll
      .filter((g) => variant && perf.gpuVariantKey(g.perf.key, g.specs.vramGb) === variant && g.id !== p.gpu.id && gpuFits(g))
      .sort((a, b) => a.price - b.price)
      .slice(0, 6)
      .map((g) => wrap(g, p.gpu, { perf: 'тот же чип, другой производитель' }));
  } else if (!(opts.have && opts.have.gpu) && pools.gpus.length) {
    alt.gpu = pools.gpus.filter(gpuFits).slice(0, 6).map((g) => ({ item: g, diff: g.price, perf: `${g.perf.name}: вместо встроенной графики` }));
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
    const list = pools.psuAll.filter((x) => x.specs.watts >= need && x.id !== p.psu.id && Compat.checkGpuPower(p.gpu, x)?.level !== 'error')
      .sort((a, b) => a.price - b.price);
    const picks = list.slice(0, 5);
    const gold = list.find((x) => x.specs.cert >= 4);
    if (gold && !picks.includes(gold)) picks.push(gold);
    alt.psu = picks.map((x) => wrap(x, p.psu, { perf: `${x.specs.watts} Вт, ${x.specs.certName}` }));
  }
  if (p.case) {
    const form = p.motherboard ? p.motherboard.specs.form : 'ATX';
    const list = pools.caseAll.filter((c) => Compat.boardFitsCase(form, c) && !Compat.gpuCaseErrors(p.gpu, c).length);
    alt.case = around(list, p.case, 3, 4).map((c) => wrap(c, p.case, { perf: [c.specs.class, c.specs.fans ? c.specs.fans + ' вент.' : null, c.specs.gpuMaxMm ? 'GPU до ' + c.specs.gpuMaxMm + ' мм' : null].filter(Boolean).join(', ') }));
  }
  if (p.cooler) {
    const need = Compat.coolerNeed(p.cpu);
    const fam = COOLER_FAMILY[p.cpu?.specs.socket];
    const limit = p.case?.specs?.coolerMaxMm;
    const list = pools.coolerAll.filter((c) => c.family === fam
      && (!c.specs.dissipationWatts || c.specs.dissipationWatts >= need)
      && (!limit || !c.specs.heightMm || c.specs.heightMm <= limit));
    alt.cooler = around(list, p.cooler, 2, 5).map((c) => wrap(c, p.cooler, { perf: Compat.coolerLabels(c).join(', ') }));
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
  await kufarForPinnedSocket(pools, warnings);
  if (!pools.cpus.length) {
    // Различаем «фильтры ничего не оставили» и «нет связи с Onliner»
    if (filters.countActive(F.cpu) || opts.cpuBrand === 'amd' || opts.cpuBrand === 'intel' || opts.platform === 'modern') {
      throw new Error('Под эти условия не подошёл ни один процессор в наличии: фильтры процессора противоречат настройкам '
        + '(например, выбран производитель Intel, а в фильтре — сокет AM5) или слишком узкие. Ослабьте фильтры или поменяйте «Процессор» в тонких настройках.');
    }
    // Пустой список при маленьком бюджете — это не «нет связи», а «на такие деньги процессоров нет»
    let cheapest = null;
    try {
      const r = await onliner.categoryPage('cpu', { order: 'price:asc' }, 1);
      cheapest = r.items.find((it) => it.price > 0) || null;
    } catch {
      throw new Error('Не удалось загрузить процессоры с Onliner. Проверьте интернет и попробуйте ещё раз.');
    }
    // Связь есть, а процессоров нет — значит, бюджет слишком мал. Узнаём, от скольки начинается рабочая сборка.
    if (cheapest && budget < 600) {
      let min = null;
      try {
        const probe = await build({ ...opts, budgetByn: 600, setup: [] });
        min = probe.minNeeded || (probe.variants.find((v) => v.build) || {}).budget || null;
      } catch {}
      const minText = min ? `примерно от ${Math.ceil(min / 50) * 50} р.` : 'примерно от 1000 р.';
      throw new Error(`Бюджет слишком мал для нового компьютера: самые простые совместимые сборки из того, что сейчас в продаже, стоят ${minText} `
        + 'Увеличьте бюджет, посмотрите б/у на Kufar или раздел «Апгрейд ПК».');
    }
    throw new Error('Не удалось загрузить процессоры с Onliner. Проверьте интернет и попробуйте ещё раз.');
  }

  const variants = [];
  for (const v of VARIANTS) {
    await tick(); // перебор тяжёлый: даём серверу ответить на другие запросы между вариантами
    const b = Math.round(budget * v.k);
    let best;
    let setup = null;
    if (setupIds.length) {
      // 1) ПК на бюджет за вычетом примерной доли сетапа; 2) сетап (монитор — под получившуюся видеокарту);
      // 3) ПК заново на точный остаток
      const first = optimize(pools, opts, b - Setup.reserve(setupIds, b));
      const idx = first ? Compat.indices(first.parts, opts.have && opts.have.gpu) : { gaming: 0 };
      setup = Setup.choose(setupIds, setupPools, b, opts.purpose, idx.gaming);
      best = await verifyHardware(optimize(pools, opts, b - setup.total), pools, opts, b - setup.total);
      // Сетап съел бюджет: берём периферию попроще, чтобы осталось на компьютер
      for (const k of [0.6, 0.3, 0]) {
        if (best) break;
        const cheaper = Setup.choose(setupIds, setupPools, Math.round(b * k), opts.purpose, idx.gaming);
        const pc = await verifyHardware(optimize(pools, opts, b - cheaper.total), pools, opts, b - cheaper.total);
        if (pc) { setup = cheaper; best = pc; }
      }
    } else {
      best = await verifyHardware(optimize(pools, opts, b), pools, opts, b);
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
  let minSetup = null;
  if (!opt.build) {
    minNeeded = minimalCost(pools, opts);
    const pr = (pools.pins || {}).ram;
    const ramType = pr && pr.specs && pr.specs.type;
    if (!minNeeded && ramType && !sockets.some((sk) => (SOCKET_MEM[sk] || []).includes(ramType))) {
      const list = sockets.map((sk) => `${sk} — ${(SOCKET_MEM[sk] || []).join('/')}`).join(', ');
      warnings.push(`Закреплённая память ${ramType} не подходит к выбранной платформе (${list}). Открепите память или поменяйте «Платформу» и «Процессор» в тонких настройках.`);
    }
    if (!minNeeded && !warnings.length) {
      warnings.push(Object.keys(pools.pins || {}).length
        ? 'С закреплёнными деталями совместимую сборку собрать не получилось: открепите часть деталей или ослабьте фильтры.'
        : 'В пределах бюджета под эти условия сборка не складывается: бюджет мал для выбранных настроек '
          + '(объём памяти, накопитель, платформа, Wi-Fi) или фильтры слишком узкие. Увеличьте бюджет или поставьте «Авто» в тонких настройках.');
    }
    // С сетапом — плюс самая доступная периферия
    if (minNeeded && setupIds.length) {
      minSetup = Math.round(Setup.choose(setupIds, setupPools, 0, opts.purpose, 0).total);
      minNeeded += minSetup;
    }
  }

  return {
    budget,
    purpose: opts.purpose,
    purposeLabel: (PROFILES[opts.purpose] || PROFILES.gaming).label,
    variants,
    minNeeded,
    minSetup,
    warnings,
    stats: {
      cpus: pools.cpus.length, gpus: pools.gpus.length, boards: pools.boardAll.length,
      ram: pools.ramAll.length, ssd: pools.ssdAll.length, psu: pools.psuAll.length, cases: pools.caseAll.length,
      sockets, ms: Date.now() - t0,
    },
  };
}

// ------------------------------------------------------------------ вариант «новое + б/у»

/** Объявления Kufar с процессорами или видеокартами, у которых известна производительность. */
async function kufarUsedParts(kind, pools, opts, budget) {
  const kufar = require('./providers/kufar');
  const market = require('./market');
  const cct = kind === 'gpu' ? '11' : '10';
  const all = [];
  let cursor;
  for (let i = 0; i < 4; i++) {
    const r = await kufar.search({ cat: 16010, params: { cct }, condition: 'used', sort: 'new', size: 50, priceMin: 40, priceMax: Math.round(budget * (kind === 'gpu' ? 0.65 : 0.45)), cursor });
    all.push(...r.items);
    if (!r.next) break;
    cursor = r.next;
  }
  const twins = kind === 'gpu' ? (pools.gpuAll || pools.gpus) : pools.cpus;
  const matches = [];
  for (const ad of all) {
    if (!ad.price || kufar.offTopic(ad.name) || kufar.risk(ad).level === 'blocked') continue;
    const key = kind === 'gpu' ? kufar.adGpuKey(ad) : perf.cpuKey(ad.name);
    if (!key) continue;
    // Карточка каталога нужна для сравнения цены и для параметров той же модели процессора.
    const twin = twins.find((t) => t.perf && t.perf.key === key);
    if (!twin) continue;
    if (kind === 'gpu') {
      if (opts.gpuBrand === 'nvidia' && !/^(rtx|gtx)/.test(key)) continue;
      if (opts.gpuBrand === 'amd' && !/^rx/.test(key)) continue;
    }
    matches.push({ ad, twin });
  }
  const candidates = matches.map(({ ad }) => ad);
  await kufar.inspect(candidates, { limit: 28, timeout: 5500 });
  const verified = candidates.filter((ad) => kufar.verified(ad));
  await market.annotate(verified, kind);
  const accepted = new Set(verified);
  const out = [];
  for (const { ad, twin: original } of matches) {
    if (!accepted.has(ad) || ad.market?.deal === 'suspicious') continue;
    const gpu = kind === 'gpu' ? kufar.adGpuInfo(ad) : null;
    const twin = gpu ? twins.find((t) => t.perf && gpu.variant && perf.gpuVariantKey(t.perf.key, t.specs?.vramGb) === gpu.variant) : original;
    if (!twin || (gpu && market.gpuPriceRisk(ad, twin.price))) continue;
    out.push({
      ...twin, id: 'kufar-' + ad.id, source: 'kufar', name: ad.name, price: ad.price, url: ad.url, image: ad.image,
      offers: 0, fromKufar: true, noname: false, market: ad.market || null, location: ad.location, date: ad.date,
      ...(gpu ? { description: '', brand: '', pricesUrl: null, usedUrl: null } : {}),
      delivery: ad.delivery, safedeal: ad.safedeal, company: ad.company, risk: ad.risk,
      specs: gpu ? gpu.specs : { ...twin.specs, withCooler: false },
      perf: gpu ? { key: gpu.key, ...perf.gpuPerf(gpu.key, gpu.vramGb) } : twin.perf,
      kufarNote: 'б/у с Kufar — проверьте перед покупкой',
    });
  }
  // По каждой модели — два самых дешёвых нормальных объявления
  const byKey = {};
  for (const it of out.sort((a, b) => a.price - b.price)) {
    const k = it.perf.variantKey || it.perf.key;
    byKey[k] = byKey[k] || [];
    if (byKey[k].length < 2) byKey[k].push(it);
  }
  return Object.values(byKey).flat();
}

/**
 * Вариант «новое + б/у»: процессор и видеокарта могут быть с Kufar, остальное — новое.
 * Возвращает сборку на «оптимальный» бюджет и сравнение с полностью новой.
 */
async function hybrid(opts) {
  const budget = Number(opts.budgetByn);
  if (!(budget > 0)) throw new Error('Укажите бюджет');
  const o = { ...opts, setup: [] };
  const { raw, F } = await gather(o, budget * 1.15);
  const pools = preparePools(raw, o, budget * 1.15, F);
  if (!pools.cpus.length) throw new Error('Нет данных о процессорах');
  const base = await verifyHardware(optimize(pools, o, budget), pools, o, budget);
  const pins = pools.pins || {};
  const [gpus, cpus] = await Promise.all([
    o.have && o.have.gpu || pins.gpu ? [] : kufarUsedParts('gpu', pools, o, budget).catch(() => []),
    pins.cpu ? [] : kufarUsedParts('cpu', pools, o, budget).catch(() => []),
  ]);
  if (!gpus.length && !cpus.length) return { none: true, reason: 'Среди проверенных описаний Kufar не нашлось подходящих б/у процессоров и видеокарт.' };
  const mixed = { ...pools, gpus: pools.gpus.concat(gpus), cpus: pools.cpus.concat(cpus) };
  await tick();
  const best = await verifyHardware(optimize(mixed, o, budget), mixed, o, budget);
  if (!best) return { none: true, reason: 'Совместимую сборку с б/у деталями собрать не получилось.' };
  const used = Object.entries(best.parts).filter(([, x]) => x && x.fromKufar).map(([k]) => k);
  if (!used.length) return { none: true, reason: 'Б/у варианты на Kufar сейчас не выгоднее новых — полностью новая сборка лучше.' };
  const result = {
    total: Math.round(best.total * 100) / 100,
    parts: best.parts,
    need: best.need,
    index: Compat.indices(best.parts, o.have && o.have.gpu),
    checks: Compat.check(best.parts, o.have),
    used,
  };
  result.alternatives = alternatives(result, mixed, o);
  const baseIdx = base ? Compat.indices(base.parts, o.have && o.have.gpu) : null;
  return {
    build: result,
    budget,
    base: base ? { total: Math.round(base.total * 100) / 100, index: baseIdx } : null,
  };
}

// ------------------------------------------------------------------ апгрейд своего ПК

const tick = () => new Promise((r) => setImmediate(r));

const UPGRADE_SCENARIOS = [
  { id: 'gpu', title: 'Только видеокарта', replace: ['gpu'] },
  { id: 'gpu-psu', title: 'Видеокарта и блок питания', replace: ['gpu', 'psu'] },
  { id: 'cpu', title: 'Только процессор (на ту же плату)', replace: ['cpu'] },
  { id: 'ram', title: 'Оперативная память', replace: ['ram'] },
  { id: 'platform', title: 'Платформа: процессор, плата и память', replace: ['cpu', 'motherboard', 'ram'] },
  { id: 'platform-gpu', title: 'Платформа и видеокарта', replace: ['cpu', 'motherboard', 'ram', 'gpu', 'psu'] },
];

/** Текущие детали пользователя → объекты деталей с характеристиками (цена 0). */
async function ownedParts(cur) {
  const KC = require('./kufarCompat');
  const own = (slot, it, name) => (it ? { ...it, id: 'owned-' + slot, source: 'owned', owned: true, price: 0, offers: 0, name: it.name || name, kufarNote: 'уже есть' } : null);
  const out = {};
  if (!cur || !cur.cpu || !cur.cpu.name) throw new Error('Укажите процессор');
  const cpu = await KC.enrich('cpu', { name: String(cur.cpu.name).slice(0, 120), price: 0, params: {} });
  if (!cpu.perf || !cpu.specs.socket) throw new Error(`Не удалось распознать процессор «${cur.cpu.name}». Напишите модель полностью, например «Ryzen 5 3600» или «Core i5-10400F».`);
  out.cpu = own('cpu', cpu);
  if (cur.gpu && cur.gpu.name) {
    const gpu = await KC.enrich('gpu', { name: String(cur.gpu.name).slice(0, 120), price: 0, params: {} });
    if (!gpu.perf) throw new Error(`Не удалось распознать видеокарту «${cur.gpu.name}». Например: «RTX 3060» или «RX 6600».`);
    out.gpu = own('gpu', gpu);
  }
  const memType = (cur.ram && cur.ram.type) || (cpu.specs.mem || [])[0] || 'DDR4';
  let mb = null;
  if (cur.motherboard && cur.motherboard.name) mb = await KC.enrich('motherboard', { name: String(cur.motherboard.name).slice(0, 120), price: 0, params: {} });
  if (!mb || !mb.specs.socket) mb = { name: 'Ваша материнская плата', specs: { socket: cpu.specs.socket, mem: memType, form: 'mATX', chipset: null, memSlots: 4, m2: 1 } };
  if (!mb.specs.mem) mb.specs.mem = memType;
  out.motherboard = own('motherboard', mb, 'Ваша материнская плата');
  const totalGb = Number(cur.ram && cur.ram.totalGb) || 16;
  const modules = Number(cur.ram && cur.ram.modules) || 2;
  out.ram = own('ram', { name: `Ваша память ${memType} ${totalGb} ГБ (${modules}×${Math.round(totalGb / modules)})`, specs: { type: memType, form: 'DIMM', totalGb, modules, mhz: Number(cur.ram && cur.ram.mhz) || null } });
  const watts = Number(cur.psu && cur.psu.watts) || 500;
  out.psu = own('psu', { name: `Ваш блок питания ${watts} Вт`, specs: { watts, cert: 2, certName: 'Bronze', form: 'ATX' } });
  return out;
}

/** Что ограничивает текущий ПК. */
function bottleneck(parts) {
  const c = parts.cpu.perf.gaming;
  const g = parts.gpu ? parts.gpu.perf.score : parts.cpu.perf.igpu || 1;
  const rs = parts.ram.specs;
  const notes = [];
  if (!parts.gpu && !(parts.cpu.specs && parts.cpu.specs.hasIgpu) && !parts.cpu.perf.igpu) notes.push('У процессора нет встроенной графики, а видеокарты нет: без видеокарты не будет изображения. Начните с видеокарты.');
  else if (!parts.gpu) notes.push('Нет отдельной видеокарты: для игр это главное узкое место.');
  else if (g > c * 1.6) notes.push(`Процессор слабее видеокарты: в играх он не даёт ей раскрыться (процессор ${c}, видеокарта ${g} по нашему индексу).`);
  else if (g < c * 0.65) notes.push(`Видеокарта — слабое место: процессор потянет карту заметно мощнее (процессор ${c}, видеокарта ${g}).`);
  else notes.push(`Процессор и видеокарта примерно сбалансированы (процессор ${c}, видеокарта ${g}).`);
  if (rs.totalGb < 16) notes.push(`Памяти ${rs.totalGb} ГБ мало для современных игр и браузера — нужно хотя бы 16 ГБ, лучше 32 ГБ.`);
  if (rs.modules === 1) notes.push('Одна планка памяти работает в одноканальном режиме — вторая такая же планка добавит заметно FPS.');
  return notes;
}

/**
 * Апгрейд: какие детали заменить, чтобы получить больше за бюджет.
 * opts: { current: {cpu:{name}, gpu:{name}, motherboard:{name}, ram:{type,totalGb,modules}, psu:{watts}}, budgetByn, purpose }
 */
async function upgrade(opts) {
  const budget = Number(opts.budgetByn);
  if (!(budget >= 100)) throw new Error('Укажите бюджет на апгрейд');
  const owned = await ownedParts(opts.current);
  const purpose = opts.purpose in PROFILES ? opts.purpose : 'gaming';
  const nowIdx = Compat.indices(owned, false);
  const key = purpose === 'work' ? 'work' : 'gaming';
  // Пулы: бюджет на апгрейд может уйти целиком в одну деталь
  const o = { ...opts, purpose, setup: [], pins: {}, have: { ssd: true, case: true, hdd: true } };
  const { raw, F } = await gather({ ...o, platform: 'any', cpuBrand: 'any' }, Math.max(budget * 2, 1200));
  const results = [];
  for (const sc of UPGRADE_SCENARIOS) {
    await tick();
    if (sc.id === 'ram' && owned.ram.specs.totalGb >= 32 && owned.ram.specs.modules >= 2) continue;
    const pins = {};
    for (const slot of ['cpu', 'gpu', 'motherboard', 'ram', 'psu']) if (owned[slot] && !sc.replace.includes(slot)) pins[slot] = owned[slot];
    // Новый процессор на другой сокет — нужен и кулер; при той же плате старый кулер обычно подходит
    const so = { ...o, pins, have: { ...o.have, cooler: !sc.replace.includes('motherboard') } };
    if (!owned.gpu && !sc.replace.includes('gpu')) so.have.gpu = false;
    let pools;
    try {
      pools = preparePools(raw, so, Math.max(budget * 2, 1200), F);
    } catch {
      continue;
    }
    if (!pools.cpus.length) continue;
    // Видеокарты нет и вариант её не меняет — подбор не должен «тайком» её добавлять
    if (!owned.gpu && !sc.replace.includes('gpu')) pools.gpus = [];
    const best = await verifyHardware(optimize(pools, so, budget), pools, so, budget);
    if (!best) continue;
    const parts = { ...best.parts };
    const checks = Compat.check(parts, so.have);
    if (checks.some((c) => c.level === 'error')) continue;
    const idx = Compat.indices(parts, false);
    const before = nowIdx[key] || 1;
    const gain = Math.round(((idx[key] || 0) / before - 1) * 100);
    const buy = Object.entries(parts).filter(([, x]) => x && !x.owned).map(([slot, x]) => ({ slot, item: x }));
    if (!buy.length || gain < 3) continue;
    results.push({ id: sc.id, title: sc.title, cost: Math.round(best.total * 100) / 100, index: idx, gain, buy, parts, checks: checks.filter((c) => c.level !== 'ok') });
  }
  results.sort((a, b) => b.gain - a.gain || a.cost - b.cost);
  // Лучший по «приросту за рубль» — отдельно
  const value = results.slice().sort((a, b) => b.gain / Math.max(1, b.cost) - a.gain / Math.max(1, a.cost))[0] || null;
  return { current: owned, index: nowIdx, bottleneck: bottleneck(owned), scenarios: results, best: results[0] ? results[0].id : null, value: value ? value.id : null, purpose };
}

module.exports = { build, hybrid, upgrade, PROFILES, boardSuitable, COOLER_FAMILY, _internal: { gather, preparePools, optimize, scoreParts, kufarUsedParts } };
