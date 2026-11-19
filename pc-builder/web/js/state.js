// Общее состояние приложения и описание слотов сборки.
import { api, el, money } from './util.js';

export const state = {
  page: 'build',
  rates: null,
  settings: {},
  builds: [],
  result: null, // ответ /api/build
  variant: 'optimal',
  compare: [],
  lastBuildForm: null,
};

export const SLOTS = [
  { key: 'cpu', label: 'Процессор', icon: 'cpu', cat: 'cpu' },
  { key: 'motherboard', label: 'Материнская плата', icon: 'board', cat: 'motherboard' },
  { key: 'ram', label: 'Оперативная память', icon: 'ram', cat: 'dram' },
  { key: 'gpu', label: 'Видеокарта', icon: 'gpu', cat: 'videocard' },
  { key: 'ssd', label: 'SSD-накопитель', icon: 'ssd', cat: 'ssd' },
  { key: 'hdd', label: 'Жёсткий диск', icon: 'hdd', cat: 'hdd' },
  { key: 'psu', label: 'Блок питания', icon: 'psu', cat: 'powersupply' },
  { key: 'case', label: 'Корпус', icon: 'case', cat: 'chassis' },
  { key: 'cooler', label: 'Кулер процессора', icon: 'fan', cat: 'fan' },
];

export const CAT_TO_SLOT = Object.fromEntries(SLOTS.map((s) => [s.cat, s.key]));
export const CAT_ICON = Object.fromEntries(SLOTS.map((s) => [s.cat, s.icon]));
// Иконки разделов каталога (мониторы, периферия, ноутбуки…)
for (const sec of window.Catalog.SECTIONS) {
  if (!CAT_ICON[sec.id]) CAT_ICON[sec.id] = sec.icon;
  if (sec.onliner && !CAT_ICON[sec.onliner]) CAT_ICON[sec.onliner] = sec.icon;
}

export const CATEGORIES = [
  ['', 'Все комплектующие'],
  ['cpu', 'Процессоры'],
  ['videocard', 'Видеокарты'],
  ['motherboard', 'Материнские платы'],
  ['dram', 'Оперативная память'],
  ['ssd', 'SSD'],
  ['hdd', 'Жёсткие диски'],
  ['powersupply', 'Блоки питания'],
  ['chassis', 'Корпуса'],
  ['fan', 'Охлаждение'],
];

export const DEFAULT_LINKS = [
  { name: 'Kufar', url: 'https://www.kufar.by/l?query={q}' },
  { name: '21vek', url: 'https://www.21vek.by/search/?term={q}' },
  { name: 'DNS', url: 'https://www.dns-shop.by/search/?q={q}' },
  { name: '5 элемент', url: 'https://5element.by/search?q={q}' },
  { name: 'Shop.by', url: 'https://shop.by/find/?findtext={q}' },
  { name: 'Wildberries', url: 'https://www.wildberries.by/catalog/0/search.aspx?search={q}' },
  { name: 'Ozon', url: 'https://ozon.by/search/?text={q}' },
  { name: 'AliExpress', url: 'https://aliexpress.ru/wholesale?SearchText={q}' },
  { name: 'Google', url: 'https://www.google.com/search?q={q}+купить+Беларусь' },
];

export function shopLinks() {
  const l = state.settings.shopLinks;
  return Array.isArray(l) && l.length ? l : DEFAULT_LINKS;
}

export function linkFor(tpl, q) {
  return tpl.replace(/\{q\}/g, encodeURIComponent(q));
}

/** Краткие характеристики детали в виде «чипов». */
export function specChips(cat, it) {
  const s = it.specs || {};
  const out = [];
  const add = (v, cls) => v && out.push(el('span.chip', { class: cls || '' }, v));
  switch (cat) {
    case 'cpu':
      add(s.socket, 'accent');
      if (s.cores) add(`${s.cores} ядер / ${s.threads || s.cores} потоков`);
      if (s.boostGhz) add(`до ${s.boostGhz} ГГц`);
      add((s.mem || []).join('/'));
      if (s.tdp) add(`TDP ${s.tdp} Вт`);
      if (s.withCooler) add('кулер в комплекте', 'ok');
      add(s.hasIgpu ? 'встроенная графика' : null);
      break;
    case 'motherboard':
      add(s.socket, 'accent');
      add(s.chipset);
      add(s.form);
      if (s.mem) add(`${s.memSlots || '?'}×${s.mem}`);
      if (s.m2) add(`${s.m2}×M.2`);
      if (s.wifi) add('Wi-Fi', 'ok');
      break;
    case 'dram':
      if (s.totalGb) add(`${s.totalGb} ГБ${s.modules > 1 ? ` (${s.modules}×${s.totalGb / s.modules})` : ''}`, 'accent');
      add(s.type);
      if (s.mhz) add(`${s.mhz} МГц`);
      if (s.cl) add(`CL${s.cl}`);
      if (s.modules === 1) add('1 модуль', 'warn');
      break;
    case 'videocard':
      if (it.perf) add(it.perf.name, 'accent');
      if (s.vramGb) add(`${s.vramGb} ГБ ${s.vramType || ''}`);
      if (s.power) add(`питание ${s.power}`);
      if (it.perf && it.perf.watts) add(`~${it.perf.watts} Вт`);
      break;
    case 'ssd':
      if (s.capacityGb) add(s.capacityGb >= 1000 ? `${s.capacityGb / 1000} ТБ` : `${s.capacityGb} ГБ`, 'accent');
      add(s.form);
      if (s.iface) add(s.iface === 'NVMe' ? `NVMe PCIe ${s.pcie || ''}` : 'SATA');
      if (s.read) add(`${s.read} МБ/с`);
      break;
    case 'hdd':
      if (s.capacityGb) add(s.capacityGb >= 1000 ? `${s.capacityGb / 1000} ТБ` : `${s.capacityGb} ГБ`, 'accent');
      if (s.rpm) add(`${s.rpm} об/мин`);
      add(s.form);
      break;
    case 'powersupply':
      if (s.watts) add(`${s.watts} Вт`, 'accent');
      if (s.cert) add(`80+ ${s.certName}`);
      if (s.modular) add(s.modular === 'full' ? 'модульный' : 'полумодульный');
      break;
    case 'chassis':
      add(s.class, 'accent');
      if (s.boards && s.boards.length) add(s.boards.join(' / '));
      add(s.fans ? `${s.fans} вент.` : 'без вентиляторов');
      if (s.gpuMaxMm) add(`GPU до ${s.gpuMaxMm} мм`);
      if (s.coolerMaxMm) add(`кулер до ${s.coolerMaxMm} мм`);
      break;
    case 'fan':
      if (s.aio) add(s.radMm ? `СЖО ${s.radMm} мм` : 'СЖО', 'accent');
      if (s.tdp) add(`до ${s.tdp} Вт`, s.aio ? '' : 'accent');
      if (s.heightMm) add(`высота ${s.heightMm} мм`);
      if (s.fanMm) add(`вентилятор ${s.fanMm} мм`);
      break;
    case 'display': {
      const d = it.description || '';
      const diag = d.match(/([\d.,]+)"/);
      const res = d.match(/(\d{3,4})x(\d{3,4})/);
      const hz = d.match(/(\d{2,3})\s*Гц/);
      const mtx = d.match(/\b(IPS|VA|TN|OLED|QD-OLED|Mini-?LED)\b/i);
      if (diag) add(diag[1] + '"', 'accent');
      if (res) add(res[0]);
      if (hz) add(hz[1] + ' Гц', +hz[1] >= 144 ? 'ok' : '');
      if (mtx) add(mtx[1]);
      break;
    }
    default:
      // Для остальных разделов — первые характеристики из описания Onliner
      for (const part of String(it.description || '').split(/,\s*/).filter((x) => x && x.length <= 40).slice(0, 4)) add(part);
      break;
  }
  if (it.noname) out.push(el('span.chip.warn', { title: 'Малоизвестный бренд: часто это восстановленные карты. Проверяйте гарантию.' }, 'малоизвестный бренд'));
  return out;
}

export async function loadSettings() {
  const r = await api('/api/store/settings');
  state.settings = r.value || {};
  return state.settings;
}

export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await api('/api/store/settings', { method: 'PUT', body: state.settings });
}

export async function loadBuilds() {
  const r = await api('/api/store/builds');
  state.builds = Array.isArray(r.value) ? r.value : [];
  updateSavedCount();
  return state.builds;
}

export async function saveBuilds() {
  await api('/api/store/builds', { method: 'PUT', body: state.builds });
  updateSavedCount();
}

export function updateSavedCount() {
  const n = state.builds.length;
  document.getElementById('savedCount').textContent = n ? String(n) : '';
}

/** Облегчённая копия товара для сохранения. */
export function slim(it) {
  if (!it) return null;
  const { id, source, category, name, price, url, pricesUrl, image, specs, perf, offers, noname, rating, reviews, description, usedCount, usedMin, usedUrl, kufarNote } = it;
  return { id, source, category, name, price, url, pricesUrl, image, specs, perf, offers, noname, rating, reviews, description, usedCount, usedMin, usedUrl, kufarNote };
}

export function buildText(title, parts, total, extra = '', setup = null) {
  const lines = [title, ''];
  const line = (label, it) => {
    lines.push(`${label}: ${it.name} — ${money.fmt(it.price)}${money.currency !== 'BYN' ? ` (${money.fmt(it.price, 'BYN')})` : ''}`);
    if (it.url) lines.push(`   ${it.url}`);
  };
  for (const s of SLOTS) if (parts[s.key]) line(s.label, parts[s.key]);
  const setupItems = window.Catalog.SETUP.filter((x) => setup && setup[x.id]);
  if (setupItems.length) {
    lines.push('', 'Сетап:');
    for (const x of setupItems) line(x.label, setup[x.id]);
  }
  lines.push('', `Итого: ${money.fmt(total)}${money.currency !== 'BYN' ? ` (${money.fmt(total, 'BYN')})` : ''}`);
  if (extra) lines.push(extra);
  lines.push(`Подобрано в ПодборПК, цены Onliner на ${new Date().toLocaleDateString('ru-RU')}`);
  return lines.join('\n');
}
