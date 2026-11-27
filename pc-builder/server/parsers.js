'use strict';
// Разбор кратких описаний товаров Onliner в структурированные характеристики.

const num = (s) => (s == null ? null : parseFloat(String(s).replace(',', '.')));
const { gpuVram } = require('./perfdb');

const units = (text, unit) => {
  const m = String(text || '').match(new RegExp('([\\d]+(?:[.,]\\d+)?)\\s*' + unit, 'i'));
  return m ? num(m[1]) : null;
};

function gpuConnectors(text) {
  let s = String(text || '').trim().toLowerCase().replace(/[‐–—−]/g, '-').replace(/[×х]/g, 'x');
  if (/^(?:нет|без (?:доп(?:олнительного)?\.?\s*)?питания|не требуется|отсутствует)$/i.test(s)) return { six: 0, eight: 0, sixteen: 0 };
  s = s.replace(/\(?(?:12v[-\s]*2x6|12vhpwr)\)?/g, (m, i) => /16[\s-]*pin\s*\(?\s*$/.test(s.slice(0, i)) ? '' : '16 pin');
  s = s.replace(/(?<!\d)([68](?:\s*\+\s*[68])+)(?=\s*[- ]?(?:pin|пин|контакт))/g, (m) => m.split(/\s*\+\s*/).join(' pin + '));
  const out = { six: 0, eight: 0, sixteen: 0 };
  const matches = [...s.matchAll(/(?<![\d+])(?:(\d+)\s*x\s*)?(6\s*\+\s*2|16|8|6)\s*[- ]?\s*(?:pin|пин|контакт\p{L}*)(?!\p{L})/gu)];
  for (const m of matches) {
    const type = m[2] === '16' ? 'sixteen' : m[2] === '6' ? 'six' : 'eight';
    out[type] += Number(m[1] || 1);
  }
  return matches.length ? out : null;
}

function mm(text) {
  return units(text, '(?:мм|mm)');
}

function normSocket(raw) {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/^(AMD|INTEL)\s+/, '').replace(/\s+/g, ' ').trim();
  if (/^LGA\s?1151/.test(s)) return 'LGA1151';
  const m = s.match(/^(AM[1-5]\+?|LGA\s?\d{3,4}(?:-\d)?|FM2\+?|SP[3-6]|STR[X45]?\S*|STRX4|TR4)/);
  return m ? m[1].replace(/\s/g, '') : s;
}

function memTypes(text) {
  const set = new Set();
  for (const m of String(text).matchAll(/DDR(\d)/g)) set.add('DDR' + m[1]);
  return [...set];
}

function cpu(desc, name) {
  const d = desc || '';
  const spec = {};
  const sock = d.match(/сокет\s+([^,]+)/i);
  spec.socket = normSocket(sock && sock[1]);
  spec.cores = num((d.match(/(\d+)\s+яд(?:ер|ра|ро)/) || [])[1]);
  spec.threads = num((d.match(/(\d+)\s+пото/) || [])[1]);
  const fq = d.match(/частота\s+([\d.,]+)(?:\s*\/\s*([\d.,]+))?\s*ГГц/);
  if (fq) spec.boostGhz = num(fq[1]);
  const arch = d.match(/^\d{4}\s*г,\s*([^,]+)/);
  spec.arch = arch ? arch[1].trim() : '';
  spec.year = num((d.match(/^(\d{4})\s*г/) || [])[1]);
  const cache = d.match(/кэш\s+([\d.,]+\s*МБ(?:\s*\+\s*[\d.,]+\s*МБ)?)/);
  if (cache) {
    const nums = cache[1].match(/[\d.,]+/g).map(num);
    spec.l3 = nums[nums.length - 1];
  }
  const sup = d.match(/поддержка\s+([^,]+(?:,\s*DDR\d[^,]*)*)/);
  spec.mem = memTypes(sup ? sup[1] : d);
  spec.tdp = num((d.match(/TDP\s+(\d+)\s*W/i) || [])[1]);
  spec.box = /\bBOX\b/.test(d) || /\(BOX\)/i.test(name || '');
  spec.withCooler = /с кулером/.test(d);
  // Встроенная графика
  const n = String(name || '').toLowerCase();
  if (/intel/.test(n)) spec.hasIgpu = !/\d(f|kf)\b|xeon/.test(n);
  else if (/ryzen|athlon/.test(n)) {
    if (spec.socket === 'AM5') spec.hasIgpu = !/\d{4}f\b/.test(n);
    else spec.hasIgpu = /\d{4}(g|ge|gt)\b|athlon/.test(n);
  } else spec.hasIgpu = false;
  return spec;
}

function motherboard(desc) {
  const d = desc || '';
  const spec = {};
  const ff = d.match(/^(E-?ATX|ATX|mATX|micro-ATX|mini-ITX|miniITX|Mini-ITX|Thin Mini-ITX)/i);
  spec.form = ff ? normForm(ff[1]) : null;
  const sock = d.match(/сокет\s+([^,]+)/i);
  spec.socket = normSocket(sock && sock[1]);
  const ch = d.match(/чипсет\s+(?:AMD|Intel)?\s*([A-Za-z]?\d{2,4}[A-Za-z]?)/);
  spec.chipset = ch ? ch[1].toUpperCase() : null;
  const mem = d.match(/память\s+(\d+)x(DDR\d)/);
  if (mem) {
    spec.memSlots = num(mem[1]);
    spec.mem = mem[2];
  }
  spec.m2 = num((d.match(/(\d+)xM\.2/) || [])[1]) || 0;
  spec.wifi = /Wi-?Fi|802\.11/i.test(d);
  const pcie = d.match(/PCIe x16\s+([\d.]+)/);
  spec.pcie = pcie ? num(pcie[1]) : null;
  // «12+2+1 фаз питания»: первое число — фазы питания ядер процессора
  const ph = d.match(/(\d{1,2})(?:\s*\+\s*\d{1,2})*\s*фаз/);
  spec.phases = ph ? num(ph[1]) : null;
  return spec;
}

function normForm(s) {
  const v = String(s).toLowerCase().replace(/\s+/g, '');
  if (v.includes('itx')) return 'ITX';
  if (v === 'matx' || v.includes('micro')) return 'mATX';
  if (v.startsWith('e')) return 'EATX';
  return 'ATX';
}

function dram(desc) {
  const d = desc || '';
  const spec = {};
  spec.totalGb = num((d.match(/^([\d.,]+)\s*ГБ/) || [])[1]);
  spec.modules = num((d.match(/(\d+)\s+модул/) || [])[1]) || 1;
  const t = d.match(/(DDR\d)\s+(SO-DIMM|DIMM|CUDIMM)/);
  spec.type = t ? t[1] : null;
  spec.form = t ? t[2] : null;
  spec.registered = /Registered|RDIMM|ECC/i.test(d);
  spec.mhz = num((d.match(/частота\s+(\d+)\s*МГц/) || [])[1]);
  spec.cl = num((d.match(/CL\s*(\d+)/) || [])[1]);
  return spec;
}

function capacityGb(text) {
  const m = String(text || '').match(/([\d.,]+)\s*(ТБ|TB|ГБ|GB)(?![A-Za-zА-Яа-яЁё])/i);
  if (!m) return null;
  const v = num(m[1]);
  return /т|t/i.test(m[2][0]) ? Math.round(v * 1000) : v;
}

function ssd(desc, name) {
  const d = desc || '';
  const spec = {};
  spec.capacityGb = capacityGb(d) || capacityGb(name);
  if (/M\.2/.test(d)) spec.form = 'M.2';
  else if (/2\.5"/.test(d)) spec.form = '2.5"';
  else if (/mSATA/i.test(d)) spec.form = 'mSATA';
  const pci = d.match(/PCI Express\s+([\d.]+)\s*x(\d)/);
  if (pci) {
    spec.iface = 'NVMe';
    spec.pcie = num(pci[1]);
    spec.lanes = num(pci[2]);
  } else if (/SATA/.test(d)) spec.iface = 'SATA';
  const sp = d.match(/последовательный доступ:\s*(\d+)\s*\/\s*(\d+)/);
  if (sp) {
    spec.read = num(sp[1]);
    spec.write = num(sp[2]);
  }
  spec.qlc = /QLC/.test(d);
  return spec;
}

function hdd(desc, name) {
  const d = desc || '';
  return {
    capacityGb: capacityGb(name) || capacityGb(d),
    rpm: num((d.match(/(\d{4,5})\s*об\/мин/) || [])[1]),
    form: (d.match(/^(3\.5"|2\.5")/) || [])[1] || null,
  };
}

const CERT = { 'базовый': 1, 'бронзовый': 2, 'серебряный': 3, 'золотой': 4, 'платиновый': 5, 'титановый': 6 };
const CERT_NAMES = ['нет', '80+', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Titanium'];

function powersupply(desc) {
  const d = desc || '';
  const spec = {};
  spec.watts = num((d.match(/(\d{3,4})\s*Вт/) || [])[1]);
  const f = d.match(/^(ATX|SFX-L|SFX|TFX|Flex ATX)/i);
  spec.form = f ? f[1].toUpperCase() : null;
  const c = d.match(/(\S+)\s+сертификат\s+80\s*Plus/i);
  spec.cert = c ? CERT[c[1].toLowerCase()] || 1 : 0;
  spec.certName = CERT_NAMES[spec.cert];
  spec.modular = /полумодульный/.test(d) ? 'semi' : /модульный/.test(d) ? 'full' : null;
  spec.pcie5 = /PCIe Gen5|12V-2x6|12VHPWR/i.test(d);
  const gen = d.match(/(\d+)\s*[xх×]\s*PCIe\s*Gen\s*5/i);
  if (gen) spec.gpuOutputs = { sixteen: Number(gen[1]) };
  return spec;
}

function chassis(desc) {
  const d = desc || '';
  const spec = {};
  const cls = d.match(/^(Mini Tower|Mid Tower|Full Tower|Super Tower|Dual System Tower|SFF|[^,]*горизонтальный)/i);
  spec.class = cls ? cls[1] : null;
  spec.psuIncluded = !/БП отсутствует/.test(d);
  const pw = d.match(/БП\s+(\d+)\s*Вт/);
  spec.psuWatts = pw ? num(pw[1]) : null;
  const boards = d.match(/для плат\s+([^,]+)/);
  const list = boards ? boards[1] : '';
  spec.boards = [];
  if (/(^|\/)E-?ATX/i.test(list)) spec.boards.push('EATX');
  if (/(^|\/|\s)ATX/i.test(list.replace(/E-?ATX/gi, '').replace(/micro-ATX|mini-ITX/gi, ''))) spec.boards.push('ATX');
  if (/micro-ATX|mATX/i.test(list)) spec.boards.push('mATX');
  if (/mini-ITX/i.test(list)) spec.boards.push('ITX');
  if (!boards) spec.boards = ['ATX', 'mATX', 'ITX']; // не указано — обычно стандартный ATX-корпус
  spec.gpuMaxMm = mm((d.match(/видеокарта до\s+([\d.,]+\s*(?:мм|mm))/i) || [])[1]);
  spec.coolerMaxMm = num((d.match(/охлаждение ЦП до\s+(\d+)\s*мм/) || [])[1]);
  const fans = d.match(/с\s+(\d+)\s+вентилятор/);
  spec.fans = fans ? num(fans[1]) : 0;
  spec.window = /окно/.test(d);
  spec.mesh = /сетк|забором воздуха|mesh/i.test(d);
  return spec;
}

// Типичное рассеивание СЖО по размеру радиатора, если производитель его не указал
const AIO_TDP = { 120: 150, 140: 170, 240: 250, 280: 280, 360: 320, 420: 350 };

function cooler(desc, name) {
  const d = desc || '';
  const radMm = num((d.match(/типоразмер\s+(\d{3})/) || [])[1]);
  const aio = !!radMm || /СЖО|жидкост|\bAIO\b/i.test(d + ' ' + (name || ''));
  let tdp = num((d.match(/рассеивание до\s+(\d+)\s*Вт/) || [])[1]);
  if (!tdp && radMm) tdp = AIO_TDP[radMm] || 200;
  return {
    tdp,
    // у СЖО «высота» — толщина радиатора, с высотой кулера в корпусе её сравнивать нельзя
    heightMm: aio ? null : num((d.match(/высота\s+([\d.]+)\s*мм/) || [])[1]),
    fanMm: num((d.match(/вентилятор\s+(\d+)\s*мм/) || [])[1]),
    aio,
    radMm,
  };
}

function videocard(desc, name) {
  const d = desc || '';
  const spec = {};
  const v = d.match(/(?:^|[^\p{L}\d])(\d{1,2})\s*(?:ГБ|GB)\s+(GDDR\dX?|HBM\d?)/iu);
  spec.vramGb = v ? num(v[1]) : gpuVram(name);
  if (v) {
    spec.vramGb = num(v[1]);
    spec.vramType = v[2].replace(/,$/, '');
  }
  const pw = d.match(/(?:разъ[её]мы питания|питание)\s*[:–-]?\s*(?:\n\s*)?([^,;\n]+)/i);
  spec.power = pw ? pw[1].trim() : null;
  if (/без\s+(?:доп(?:\.|олнительного)?\s+)питания/i.test(d)) spec.power = 'без питания';
  spec.gpuInputs = gpuConnectors(spec.power);
  spec.slots = units(d, '(?:слот|slots?)');
  spec.lengthMm = mm((d.match(/(?:длина(?: видеокарты)?|length)\s*[:–-]?\s*([\d.,]+\s*(?:мм|mm))/i) || [])[1]);
  spec.thicknessMm = mm((d.match(/(?:толщина(?: видеокарты)?|thickness)\s*[:–-]?\s*([\d.,]+\s*(?:мм|mm))/i) || [])[1]);
  spec.boardWatts = units((d.match(/(?:потребление видеокарты|энергопотребление|TBP|TGP)\s*[:–-]?\s*([\d.,]+\s*(?:Вт|W))/i) || [])[1], '(?:Вт|W)');
  spec.rt = /трассировка/.test(d);
  return spec;
}

function display(desc) {
  const d = desc || '';
  const res = d.match(/(\d{3,4})x(\d{3,4})/);
  return {
    diagonal: num((d.match(/^([\d.,]+)"/) || [])[1]),
    resW: res ? num(res[1]) : null,
    resH: res ? num(res[2]) : null,
    hz: num((d.match(/(\d{2,3})\s*Гц/) || [])[1]),
    matrix: (d.match(/\b(IPS|VA|TN|OLED|QD-OLED)\b/i) || [])[1] || null,
  };
}

const BY_SCHEMA = {
  cpu, motherboard, dram, ssd, hdd, powersupply, chassis, fan: cooler, videocard, display,
};

function parseSpecs(schema, desc, name) {
  const fn = BY_SCHEMA[schema];
  if (!fn) return {};
  try {
    return fn(desc, name);
  } catch {
    return {};
  }
}

function hardwareRows(html) {
  const clean = (cell) => cell.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&times;|&#215;/gi, '×')
    .replace(/\s+/g, ' ').trim().toLowerCase().replace(/ё/g, 'е');
  const rows = new Map();
  for (const [, row] of String(html || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)];
    if (cells.length < 2) continue;
    const raw = cells[1][1];
    const value = clean(raw) || (/\bclass=["'][^"']*\bi-x\b/i.test(raw) ? 'нет' : '');
    rows.set(clean(cells[0][1]), value);
  }
  return rows;
}

/** Читаем только подписанные поля полной карточки Onliner. */
function parseHardware(schema, html) {
  const rows = hardwareRows(html);
  const get = (...names) => names.map((name) => rows.get(name)).find(Boolean) || '';
  let spec = {};
  if (schema === 'videocard') {
    const power = get('разъемы питания', 'дополнительное питание');
    const adapter = get('комплектация').match(/(?:переходник|разветвитель)[^;\n]{0,45}?(\d+)\s*[xх×]\s*8[\s-]*pin\s*(?:[-–—→]|на)\s*(?:1\s*[xх×]\s*)?(?:16[\s-]*pin|12v(?:hpwr|-2x6))/i);
    spec = {
      vramGb: units(get('видеопамять'), '(?:ГБ|GB)'), lengthMm: mm(get('длина видеокарты')),
      thicknessMm: mm(get('толщина видеокарты')), slots: units(get('толщина системы охлаждения'), '(?:слот|slots?)'),
      recommendedPsuWatts: units(get('рекомендуемый блок питания'), '(?:Вт|W)'),
      boardWatts: units(get('потребляемая мощность', 'энергопотребление', 'потребление видеокарты'), '(?:Вт|W)'),
      power: power || null, gpuInputs: gpuConnectors(power), adapter8: adapter ? Number(adapter[1]) : null,
    };
  } else if (schema === 'chassis') {
    spec = {
      gpuMaxMm: mm(get('макс. длина видеокарты', 'максимальная длина видеокарты', 'длина видеокарты')),
      gpuMaxThicknessMm: mm(get('макс. толщина видеокарты', 'максимальная толщина видеокарты')),
      expansionSlots: units(get('горизонтальные слоты расширения', 'слоты расширения', 'количество слотов расширения'), '(?:слот)?'),
    };
  } else if (schema === 'powersupply') {
    const gpuOutputs = {};
    for (const [key, label] of Object.entries({ six: 'pcie 6 pin', flex: 'pcie 6+2 pin', eight: 'pcie 8 pin', sixteen: 'pcie gen5' })) {
      const text = get(label);
      if (text === 'нет') gpuOutputs[key] = 0;
      else if (/^\d+$/.test(text)) gpuOutputs[key] = Number(text);
    }
    spec = { gpuOutputs: Object.keys(gpuOutputs).length ? gpuOutputs : null, gpu16Type: get('тип разъема pcie gen5') || null };
  }
  return Object.fromEntries(Object.entries(spec).filter(([, v]) => v !== null));
}

module.exports = { parseSpecs, parseHardware, gpuConnectors, normSocket, capacityGb, CERT_NAMES };
