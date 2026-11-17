// Страница «Настройки».
import { el, icon, api, money, toast } from './util.js';
import { state, saveSettings, DEFAULT_LINKS, shopLinks } from './state.js';

let root;
let onRatesChanged = () => {};

export function initSettings(container, ratesCallback) {
  root = container;
  onRatesChanged = ratesCallback;
  render();
}

export function rerenderSettings() {
  if (root) render();
}

function render() {
  root.replaceChildren(
    el('div.page-head', el('div', el('h1', 'Настройки'), el('p', 'Валюта, курсы, ссылки на магазины и данные приложения.'))),
    el('div.set-grid', currencyCard(), ratesCard(), linksCard(), aboutCard()));
}

function currencyCard() {
  const sel = el('select.select', {
    onchange: async (e) => {
      await saveSettings({ currency: e.target.value });
      toast('Валюта по умолчанию сохранена');
    },
  }, (state.rates ? state.rates.currencies : [{ code: 'BYN', name: 'Белорусский рубль' }]).map((c) => el('option', { value: c.code }, `${c.code} — ${c.name}`)));
  sel.value = state.settings.currency || 'BYN';
  return el('div.card', el('h3', 'Валюта по умолчанию'), el('p', 'В ней вводится бюджет и показываются цены. Сменить можно и прямо в форме подбора.'), sel);
}

function ratesCard() {
  const r = state.rates;
  const manual = state.settings.manualRates || {};
  const codes = r ? r.currencies.map((c) => c.code).filter((c) => c !== 'BYN') : ['USD', 'EUR', 'RUB'];
  const inputs = {};
  const rows = codes.map((code) => {
    inputs[code] = el('input.input', { type: 'number', step: 'any', min: '0', placeholder: 'авто', value: manual[code] || '' });
    return [el('b', code), el('span.muted.small', r && r.rates[code] ? `НБ/авто: ${(+r.rates[code]).toFixed(code === 'RUB' || code === 'KZT' || code === 'UAH' ? 5 : 4)} р.` : ''), inputs[code]];
  });
  return el('div.card',
    el('h3', 'Курсы валют'),
    el('p', r ? `Источник: ${r.source}${r.date ? ', ' + new Date(r.date).toLocaleDateString('ru-RU') : ''}. Можно задать свой курс (BYN за 1 единицу), например курс вашего банка.` : 'Загрузка…'),
    el('div.rate-edit', rows.flat()),
    el('div.row', { style: { marginTop: '14px' } },
      el('button.btn.btn-primary.btn-sm', {
        onclick: async () => {
          const m = {};
          for (const [k, inp] of Object.entries(inputs)) if (inp.value && +inp.value > 0) m[k] = +inp.value;
          await saveSettings({ manualRates: m });
          await onRatesChanged(true);
          toast('Курсы сохранены');
          render();
        },
      }, 'Сохранить курсы'),
      el('button.btn.btn-sm', {
        onclick: async () => {
          await onRatesChanged(true);
          toast('Курсы обновлены');
          render();
        },
      }, icon('refresh'), 'Обновить с НБРБ')));
}

function linksCard() {
  let links = shopLinks().map((l) => ({ ...l }));
  const box = el('div');
  const draw = () => {
    box.replaceChildren(...links.map((l, i) => el('div.link-edit',
      el('input.input', { value: l.name, placeholder: 'Название', oninput: (e) => (l.name = e.target.value) }),
      el('input.input', { value: l.url, placeholder: 'https://…{q}…', oninput: (e) => (l.url = e.target.value) }),
      el('button.icon-btn', { title: 'Удалить', onclick: () => { links.splice(i, 1); draw(); } }, icon('trash')))));
  };
  draw();
  return el('div.card.full',
    el('h3', 'Ссылки на магазины'),
    el('p', 'Кнопки «искать также на…» в поиске и у каждой детали. {q} заменяется на название товара. Если магазин поменял адрес поиска, поправьте здесь.'),
    box,
    el('div.row', { style: { marginTop: '6px' } },
      el('button.btn.btn-sm', { onclick: () => { links.push({ name: '', url: 'https://' }); draw(); } }, icon('plus'), 'Добавить'),
      el('button.btn.btn-primary.btn-sm', {
        onclick: async () => {
          const clean = links.filter((l) => l.name.trim() && /^https?:\/\//.test(l.url) && l.url.includes('{q}'));
          await saveSettings({ shopLinks: clean });
          toast('Ссылки сохранены');
          render();
        },
      }, 'Сохранить'),
      el('button.btn.btn-ghost.btn-sm', { onclick: async () => { links = DEFAULT_LINKS.map((l) => ({ ...l })); await saveSettings({ shopLinks: [] }); draw(); toast('Ссылки сброшены'); } }, 'По умолчанию')));
}

function aboutCard() {
  const info = el('p.small.muted', '');
  api('/api/info').then((i) => (info.textContent = `Версия ${i.version}. Данные (сборки, настройки) хранятся в папке: ${i.dataDir}`)).catch(() => {});
  return el('div.card.full',
    el('h3', 'О программе'),
    el('p', 'ПодборПК берёт цены из открытого каталога Onliner (минимальная цена среди магазинов) и объявлений Kufar. Производительность процессоров и видеокарт — усреднённая оценка по тестам, она нужна для сравнения вариантов, а не для точного FPS. Перед покупкой проверяйте наличие и характеристики на странице магазина.'),
    info,
    el('div.row', { style: { marginTop: '10px' } },
      el('button.btn.btn-sm', {
        onclick: async () => {
          await api('/api/cache/clear', { method: 'POST' });
          toast('Кэш очищен: следующий подбор загрузит свежие цены');
        },
      }, icon('refresh'), 'Очистить кэш цен')));
}

export { money };
