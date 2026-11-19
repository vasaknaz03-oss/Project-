'use strict';
// Умный поиск: «ssd 512 gb» → раздел SSD + фильтр объёма; «ddr5 32gb» → память DDR5 32 ГБ;
// «бп 750w gold» → блоки питания от 750 Вт с сертификатом Gold; «монитор 27 165гц» → мониторы 27" от 165 Гц.
// Остальные слова запроса ищутся в названии товара.

const filters = require('./filters');
const Catalog = require('../web/catalog');

/** Нормализация: кириллица/латиница в единицах, «ти» → ti, «гб» → gb… */
function normalize(q) {
  return ` ${String(q || '').toLowerCase().replace(/ё/g, 'е')} `
    .replace(/(\d)\s*(гб|gb|гигабайт\w*)(?![a-zа-я])/g, '$1gb')
    .replace(/(\d)\s*(тб|tb|терабайт\w*)(?![a-zа-я])/g, '$1tb')
    .replace(/(\d)\s*(вт|w|ватт\w*)(?![a-zа-я])/g, '$1w')
    .replace(/(\d)\s*(гц|hz)(?![a-zа-я])/g, '$1hz')
    .replace(/(\d)\s*(дюйм\w*|inch|"|''|”)/g, '$1"')
    .replace(/(\d)\s*ти(?![a-zа-я])/g, '$1 ti').replace(/(\d)ti(?![a-z])/g, '$1 ti')
    .replace(/\bсупер\b/g, 'super').replace(/(\d)\s*super/g, '$1 super')
    .replace(/[,;]+/g, ' ').replace(/\s+/g, ' ');
}

// Раздел по словам запроса. Порядок важен: сначала более узкие.
// re — латиница и модели (там \b работает), stems — начала русских слов, words — русские слова целиком
// (в JS \b не работает с кириллицей, поэтому русские слова проверяем по отдельным словам запроса).
const SECTIONS = [
  ['nb_ram', { re: /so-?dimm/, combo: [['памят', 'оператив', 'ddr', 'озу'], ['ноутбук', 'ноутбуч']] }],
  ['nb_ssd', { combo: [['ssd', 'ссд', 'накопител'], ['ноутбук', 'ноутбуч']] }],
  ['notebook', { re: /\blaptop\b|macbook|thinkpad|ideapad|vivobook|zenbook|\blegion\b|nitro v|victus|\bloq\b/, stems: ['ноутбук', 'макбук'] }],
  ['ssd', { re: /\bssd\b|\bnvme\b/, stems: ['твердотельн'], words: ['ссд'] }],
  ['hdd', { re: /\bhdd\b/, stems: ['винчестер'], pairs: [['жестк', 'диск']] }],
  ['videocard', { re: /\brtx ?\d{4}|\bgtx ?\d{3,4}|\brx ?\d{3,4}|radeon rx|geforce|\barc [ab]\d{3}/, stems: ['видеокарт', 'видюх'] }],
  ['motherboard', { re: /\bmotherboard\b|\b[abhxzq][1-9]\d0e?m?\b(?! ?(ti|super))/, stems: ['материнк', 'материнск'], pairs: [['мат', 'плат']] }],
  ['cpu', { re: /\bryzen ?\d|\bcore ?(i[3579]|ultra)|\bi[3579][ -]?\d{4,5}|athlon|pentium|celeron|threadripper/, stems: ['процессор', 'проц'] }],
  ['dram', { re: /\bddr[345]\b|\bdimm\b|\bram\b/, stems: ['оператив', 'оперативк'], words: ['озу'] }],
  ['powersupply', { re: /\bpsu\b|\b\d{3,4}w\b/, words: ['бп'], pairs: [['блок', 'питани']] }],
  ['chassis', { re: /\bpc case\b/, stems: ['корпус'] }],
  ['fan', { re: /\baio\b/, stems: ['кулер', 'охлажден', 'водянк'], words: ['сжо'] }],
  ['display', { re: /\bmonitor\b|\b\d{2}(\.\d)?"/, stems: ['монитор'] }],
  ['keyboards', { re: /keyboard/, stems: ['клавиатур', 'клава'] }],
  ['mousepad', { stems: ['коврик'] }],
  ['mouse', { re: /\bmouse\b/, stems: ['мыш', 'мышк'] }],
  ['headphones', { re: /headset|headphones/, stems: ['наушник', 'гарнитур'] }],
  ['microphones', { stems: ['микрофон'] }],
  ['webcams', { re: /webcam/, stems: ['веб-камер', 'вебкамер'] }],
  ['sound', { stems: ['колонк', 'акустик'] }],
  ['wrouter', { re: /\brouter\b/, stems: ['роутер', 'маршрутизатор'] }],
  ['ups', { stems: ['бесперебойн'], words: ['ибп'] }],
  ['office_chair', { stems: ['кресл'] }],
  ['controllers', { stems: ['геймпад', 'джойстик'] }],
];

const tokensOf = (t) => t.trim().split(' ').filter(Boolean);
const hasStem = (toks, stems) => toks.some((w) => stems.some((st) => w.startsWith(st)));

function matchSection(t) {
  const toks = tokensOf(t);
  for (const [id, r] of SECTIONS) {
    if (r.combo && r.combo.every((group) => hasStem(toks, group))) return id;
    if (r.combo && !r.re && !r.stems) continue;
    if (r.re && r.re.test(t)) return id;
    if (r.stems && hasStem(toks, r.stems)) return id;
    if (r.words && toks.some((w) => r.words.includes(w))) return id;
    if (r.pairs && r.pairs.some(([a, b]) => hasStem(toks, [a]) && hasStem(toks, [b]))) return id;
  }
  return null;
}

// Слова, которые только называют раздел или ничего не значат, — из поиска по названию их убираем
const DROP_STEMS = ['видеокарт', 'видюх', 'процессор', 'материнск', 'материнк', 'плат', 'оператив', 'памят', 'накопител', 'твердотельн', 'жестк',
  'диск', 'винчестер', 'блок', 'питани', 'корпус', 'кулер', 'охлажден', 'водянк', 'монитор', 'ноутбук', 'ноутбуч', 'клавиатур', 'клава', 'мыш',
  'коврик', 'наушник', 'гарнитур', 'микрофон', 'веб-камер', 'вебкамер', 'колонк', 'акустик', 'роутер', 'маршрутизатор', 'бесперебойн', 'кресл',
  'геймпад', 'джойстик', 'купить', 'недорог', 'игров', 'нов'];
const DROP_WORDS = new Set(['ssd', 'ссд', 'hdd', 'nvme', 'ram', 'dimm', 'psu', 'бп', 'озу', 'сжо', 'ибп', 'мат', 'для', 'под', 'и', 'с', 'на', 'игр', 'проц',
  'monitor', 'laptop', 'motherboard', 'keyboard', 'mouse', 'headset', 'so-dimm', 'sodimm']);

function restOf(t) {
  return tokensOf(t).filter((w) => !DROP_WORDS.has(w) && !DROP_STEMS.some((st) => w.startsWith(st))).join(' ');
}

const SSD_CAP = { 128: ['120gb', '128gb'], 256: ['240gb', '256gb'], 512: ['480gb', '512gb'], 1000: ['960gb', '1tb'], 2000: ['2tb', '2tb'], 4000: ['4tb', '4tb'] };

function capGb(text) {
  const m = text.match(/\b(\d+(?:[.,]\d+)?)(tb|gb)\b/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return { gb: m[2] === 'tb' ? Math.round(v * 1000) : v, token: m[0] };
}

/** id значения фильтра-диапазона по числу в названии («27"» → 270, «165 Гц» → 165hz). */
async function rangeId(schema, param, num) {
  try {
    const meta = await filters.facets(schema);
    const item = meta.groups.flatMap((g) => g.items).find((i) => i.id === param);
    if (!item) return null;
    const v = item.values.find((x) => Math.abs(parseFloat(String(x.name).replace(',', '.')) - num) < 0.05);
    return v ? v.id : null;
  } catch {
    return null;
  }
}

/**
 * Разбор запроса. hint — раздел, если пользователь его уже выбрал.
 * Возвращает { section, filters, rest, chips } или null, если понимать нечего.
 */
async function parse(q, hint) {
  let t = normalize(q);
  let section = hint && Catalog.byId[hint] ? hint : null;
  if (!section) section = matchSection(t);
  if (!section) return null;
  const sec = Catalog.byId[section];
  const schema = sec.onliner;
  const f = {};
  const chips = [sec.name];
  const drop = (token) => { t = t.replace(token, ' '); };

  if (schema === 'ssd') {
    const c = capGb(t);
    if (c) {
      const key = c.gb >= 3000 ? 4000 : c.gb >= 1500 ? 2000 : c.gb >= 900 ? 1000 : c.gb >= 400 ? 512 : c.gb >= 200 ? 256 : 128;
      f.volume_hdd = { from: SSD_CAP[key][0], to: SSD_CAP[key][1] };
      chips.push(key >= 1000 ? `${key / 1000} ТБ` : `${key} ГБ`);
      drop(c.token);
    }
    if (/\bm\.?2\b/.test(t)) { f.form_ssd = ['m2']; chips.push('M.2'); t = t.replace(/\bm\.?2\b/, ' '); }
    if (/\bnvme\b/.test(t)) { f.interface_ssd = ['pcie30x4', 'pcie40x4', 'pcie5x4']; chips.push('NVMe'); }
    else if (/\bsata\b/.test(t)) { f.interface_ssd = ['sata30']; chips.push('SATA'); t = t.replace(/\bsata\b/, ' '); }
    if (/\b2[.,]5\b/.test(t)) { f.form_ssd = ['25']; chips.push('2.5"'); t = t.replace(/\b2[.,]5\b/, ' '); }
  }
  if (schema === 'dram') {
    const ty = t.match(/\bddr([345])\b/);
    if (ty) {
      f.dramkit = [`ddr${ty[1]}${section === 'nb_ram' ? 'sodimm' : 'dimm'}`];
      chips.push(`DDR${ty[1]}`);
      drop(ty[0]);
    }
    const kit = t.match(/\b(\d)\s?x\s?(\d{1,2})gb\b/);
    const c = kit ? { gb: +kit[1] * +kit[2], token: kit[0] } : capGb(t);
    if (c && c.gb >= 2 && c.gb <= 256) {
      f.volume_dram = { from: `${c.gb}gb`, to: `${c.gb}gb` };
      chips.push(`${c.gb} ГБ`);
      drop(c.token);
    }
  }
  if (schema === 'hdd') {
    const c = capGb(t);
    if (c && c.gb >= 1000 && Number.isInteger(c.gb / 1000)) {
      f.volume_hdd = { from: `${c.gb / 1000}tb`, to: `${c.gb / 1000}tb` };
      chips.push(`${c.gb / 1000} ТБ`);
      drop(c.token);
    }
  }
  // Сокет: «кулер для am5», «процессор am4», «плата lga1700»
  const sock = t.match(/\b(am4|am5|lga ?1700|lga ?1851|lga ?1200|lga ?1151)\b/);
  if (sock) {
    const id = sock[1].replace(/\s/g, '');
    if (schema === 'fan') { f.fan_socket = [id === 'lga1851' ? 'lga1700' : id]; chips.push(id.toUpperCase()); drop(sock[0]); }
    if (schema === 'cpu' || schema === 'motherboard') { f.socket_cpu = [id]; chips.push(id.toUpperCase()); drop(sock[0]); }
  }
  if (schema === 'fan') {
    const toks = tokensOf(t);
    if (toks.some((w) => w === 'сжо' || w === 'aio' || w.startsWith('водян'))) { f.type_fan = ['syslcp']; chips.push('СЖО'); }
    else if (!f.type_fan) f.type_fan = ['cpu', 'syslcp']; // кулеры процессора, а не корпусные вентиляторы и термопасты
  }
  if (schema === 'powersupply') {
    const w = t.match(/\b(\d{3,4})w\b/);
    if (w) { f.power_sup = { from: +w[1] }; chips.push(`от ${w[1]} Вт`); drop(w[0]); }
    const cert = t.match(/\b(bronze|бронз\S*|silver|gold|золот\S*|platinum|платин\S*|titanium)\b/);
    if (cert) {
      const id = /bronze|бронз/.test(cert[1]) ? 'bronze' : /silver/.test(cert[1]) ? 'silver' : /gold|золот/.test(cert[1]) ? 'golden' : /titan/.test(cert[1]) ? 'titanium' : 'platinum';
      f['80plus_conform'] = [id];
      chips.push(`80+ ${cert[1]}`);
      drop(cert[0]);
    }
  }
  if (schema === 'display') {
    const d = t.match(/\b(\d{2}(?:\.\d)?)"/) || (/\b(2[1-9]|3[0-9]|4[0-9])\b/.test(t) ? t.match(/\b(2[1-9]|3[0-9]|4[0-9])\b/) : null);
    if (d) {
      const id = await rangeId(schema, 'diagonal', parseFloat(d[1]));
      if (id) { f.diagonal = { from: id, to: id }; chips.push(`${d[1]}"`); drop(d[0]); }
    }
    const hz = t.match(/\b(\d{2,3})hz\b/);
    if (hz) {
      const id = await rangeId(schema, 'disp_refreshrate', +hz[1]);
      if (id) { f.disp_refreshrate = { from: id }; chips.push(`от ${hz[1]} Гц`); drop(hz[0]); }
    }
    const res = t.match(/\b(4k|uhd|2160p|2k|qhd|1440p|full ?hd|fhd|1080p)\b/);
    if (res) {
      const r = /4k|uhd|2160/.test(res[1]) ? '3840x2160' : /2k|qhd|1440/.test(res[1]) ? '2560x1440' : '1920x1080';
      f.resolution = { from: r, to: r };
      chips.push(r.replace('x', '×'));
      drop(res[0]);
    }
    const mx = t.match(/\b(ips|va|oled|tn)\b/);
    if (mx) { f.matrix_type_d = [mx[1]]; chips.push(mx[1].toUpperCase()); drop(mx[0]); }
  }

  // Остаток: слова модели и бренда
  const rest = restOf(t);
  if (!Object.keys(f).length && !hint && rest === normalize(q).trim()) {
    // Раздел определён только по модели («rtx 4060») — ищем по названию в этом разделе
    return { section, filters: {}, rest, chips };
  }
  return { section, filters: f, rest, chips };
}

/** Текст для поиска Kufar: без слов-названий раздела, но с объёмом и моделью («512gb» помогает найти нужное). */
function kufarText(q) {
  return restOf(normalize(q)).replace(/(\d)gb\b/g, '$1 gb').replace(/(\d)tb\b/g, '$1 tb');
}

module.exports = { parse, normalize, kufarText };
