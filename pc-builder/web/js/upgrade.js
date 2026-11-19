// Страница «Апгрейд ПК»: что стоит сейчас → что заменить за бюджет и сколько это даст.
import { el, icon, api, money, toast, thumb } from './util.js';
import { state, SLOTS } from './state.js';
import { fpsTable } from './games.js';

let root = null;
const F = {
  cpu: '', gpu: '', noGpu: false, mb: '', ramType: 'DDR4', ramGb: '16', ramModules: '2', psu: '550',
  budget: 1500, currency: 'BYN', purpose: 'gaming',
};
let result = null;
let loading = false;
let error = null;

const CPU_HINTS = ['Ryzen 5 3600', 'Ryzen 5 5600', 'Ryzen 7 5700X3D', 'Ryzen 5 7500F', 'Core i5-10400F', 'Core i5-12400F', 'Core i3-12100F', 'Core i7-8700', 'Core i5-9400F'];
const GPU_HINTS = ['GTX 1650', 'GTX 1660 Super', 'RTX 2060', 'RTX 3050', 'RTX 3060', 'RTX 3070', 'RTX 4060', 'RX 580', 'RX 6600', 'RX 6700 XT'];

export async function initUpgrade(node) {
  root = node;
  try {
    const r = await api('/api/store/upgradeForm');
    if (r.value && typeof r.value === 'object') Object.assign(F, r.value);
  } catch {}
  F.currency = state.settings.currency || F.currency;
  render();
}

export function rerenderUpgrade() {
  if (root) render();
}

function save() {
  api('/api/store/upgradeForm', { method: 'PUT', body: F }).catch(() => {});
}

function input(key, attrs) {
  return el('input.input', { value: F[key], oninput: (e) => { F[key] = e.target.value; save(); }, ...attrs });
}

function select(key, options) {
  return el('select.select', { onchange: (e) => { F[key] = e.target.value; save(); } },
    options.map(([v, l]) => el('option', { value: v, selected: String(F[key]) === String(v) }, l)));
}

function datalist(id, list) {
  return el('datalist', { id }, list.map((x) => el('option', { value: x })));
}

function render() {
  const gpuInput = input('gpu', { placeholder: 'например, RTX 3060', list: 'upGpuList', disabled: F.noGpu });
  root.replaceChildren(
    el('div.page-head', el('div',
      el('h1', 'Апгрейд моего ПК'),
      el('p', 'Укажите, что стоит в компьютере сейчас, и бюджет — программа найдёт слабое место и посчитает, что выгоднее заменить: видеокарту, процессор, память или всю платформу.'))),
    el('div.card.upgrade-form',
      el('div.up-grid',
        el('div.field', el('label', 'Процессор'), input('cpu', { placeholder: 'например, Ryzen 5 3600', list: 'upCpuList' }), datalist('upCpuList', CPU_HINTS)),
        el('div.field', el('label', 'Видеокарта'), gpuInput, datalist('upGpuList', GPU_HINTS),
          el('label.check.small', el('input', { type: 'checkbox', checked: F.noGpu, onchange: (e) => { F.noGpu = e.target.checked; save(); render(); } }), 'нет видеокарты (встроенная графика)')),
        el('div.field.wide', el('label', 'Оперативная память'),
          el('div.row', select('ramType', [['DDR4', 'DDR4'], ['DDR5', 'DDR5']]), select('ramGb', [['8', '8 ГБ'], ['16', '16 ГБ'], ['32', '32 ГБ'], ['64', '64 ГБ']]),
            select('ramModules', [['1', '1 планка'], ['2', '2 планки'], ['4', '4 планки']]))),
        el('div.field', el('label', 'Блок питания'), select('psu', [['400', '400 Вт'], ['450', '450 Вт'], ['500', '500 Вт'], ['550', '550 Вт'], ['600', '600 Вт'], ['650', '650 Вт'], ['700', '700 Вт'], ['750', '750 Вт'], ['850', '850 Вт'], ['1000', '1000 Вт']])),
        el('div.field', el('label', 'Материнская плата (необязательно)'), input('mb', { placeholder: 'например, MSI B450M Pro-VDH' }), el('div.dim.small', 'Нужна, чтобы точнее понять, какие процессоры встанут')),
        el('div.field', el('label', 'Для чего'), select('purpose', [['gaming', 'Игры'], ['universal', 'Всё понемногу'], ['work', 'Работа: монтаж, 3D, код']])),
        el('div.field', el('label', 'Бюджет на апгрейд'),
          el('div.budget-input.small', input('budget', { type: 'number', min: '100', step: '50' }),
            el('select.select', { onchange: (e) => { F.currency = e.target.value; save(); } },
              (state.rates ? state.rates.currencies : [{ code: 'BYN' }]).map((c) => el('option', { value: c.code, selected: c.code === F.currency }, c.code)))))),
      el('div.row', { style: { marginTop: '16px' } },
        el('button.btn.btn-primary.btn-lg', { disabled: loading, onclick: run }, icon('trendUp'), loading ? 'Считаем…' : 'Подобрать апгрейд'),
        el('span.dim.small', 'Корпус, накопители и кулер считаем вашими; кулер добавим, если меняется платформа.'))),
    error ? el('div.notice.err', icon('error'), el('div', error)) : null,
    loading ? el('div.card.loading', el('div.spinner'), el('b', 'Считаем варианты апгрейда…')) : null,
    result && !loading ? renderResult() : null);
}

async function run() {
  if (!F.cpu.trim()) {
    toast('Укажите процессор', 'err');
    return;
  }
  loading = true;
  error = null;
  render();
  try {
    result = await api('/api/upgrade', {
      method: 'POST',
      body: {
        budget: Number(F.budget), currency: F.currency, purpose: F.purpose,
        current: {
          cpu: { name: F.cpu.trim() }, gpu: F.noGpu || !F.gpu.trim() ? null : { name: F.gpu.trim() },
          motherboard: F.mb.trim() ? { name: F.mb.trim() } : null,
          ram: { type: F.ramType, totalGb: Number(F.ramGb), modules: Number(F.ramModules) }, psu: { watts: Number(F.psu) },
        },
      },
    });
  } catch (e) {
    error = e.message;
    result = null;
  }
  loading = false;
  render();
}

const GAMES_SHOWN = ['Counter-Strike 2', 'Fortnite', 'Cyberpunk 2077'];

function fpsLine(parts) {
  const rows = fpsTable(parts, '1080', false) || [];
  return rows.filter((r) => GAMES_SHOWN.includes(r.name));
}

function renderResult() {
  const r = result;
  const key = r.purpose === 'work' ? 'work' : 'gaming';
  const nowFps = fpsLine(r.current);
  const head = el('div.card.upgrade-now',
    el('h3', icon('cpu'), ' Сейчас'),
    el('div.up-now',
      el('div', el('div.big-num', String(r.index[key] || '—')), el('div.dim.small', key === 'work' ? 'рабочий индекс' : 'игровой индекс')),
      el('div', el('b', r.index.tier), el('div.dim.small', [r.current.cpu.name, r.current.gpu ? r.current.gpu.name : 'встроенная графика'].join(' + ')))),
    el('div.bottleneck', r.bottleneck.map((t) => el('div.ck.warn', icon('alert', 'ci'), el('div', t)))));
  if (!r.scenarios.length) {
    return el('div', head, el('div.notice', icon('info'), el('div', 'За этот бюджет заметного прироста не получается: увеличьте бюджет или проверьте, правильно ли указаны детали.')));
  }
  return el('div', head,
    el('div.up-scenarios', r.scenarios.map((sc) => {
      const scFps = fpsLine(sc.parts);
      const tags = [sc.id === r.best ? el('span.chip.ok', 'максимальный прирост') : null, sc.id === r.value ? el('span.chip.accent', 'выгоднее всего за рубль') : null];
      return el('div.card.up-card', { class: sc.id === r.best ? 'best' : '' },
        el('div.up-card-head',
          el('div', el('h3', sc.title), el('div.row.wrap', tags)),
          el('div.up-gain', el('b', `+${sc.gain}%`), el('div.dim.small', money.fmt(sc.cost)))),
        el('div.dim.small', `Станет: ${sc.index.tier} (индекс ${sc.index[key]})`),
        el('div.up-buy', sc.buy.map(({ slot, item }) => {
          const meta = SLOTS.find((s) => s.key === slot) || { label: slot, icon: 'cpu' };
          return el('div.up-buy-row',
            thumb(item.image, meta.icon),
            el('div', el('div.dim.small', meta.label), el('a', { href: item.url, target: '_blank', rel: 'noopener' }, item.name)),
            el('b', money.fmt(item.price)));
        })),
        nowFps.length && scFps.length && r.purpose !== 'work' ? el('div.up-fps', scFps.map((f, i) => el('span.chip', `${f.name}: ${nowFps[i].fps} → ${f.fps} FPS`))) : null,
        sc.checks.length ? el('div.up-checks', sc.checks.map((c) => el('div.ck', { class: c.level }, icon(c.level === 'warn' ? 'alert' : 'info', 'ci'), el('div', c.text)))) : null);
    })),
    el('p.dim.small', 'FPS — примерно, 1080p, высокие настройки. Цены — минимальные на Onliner сейчас. Б/у варианты этих деталей можно поискать во вкладке «Поиск» → Kufar.'));
}
