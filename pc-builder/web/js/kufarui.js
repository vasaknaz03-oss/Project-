// Общие элементы объявлений Kufar: продавец, дата, доставка и оплата, оценка цены относительно рынка,
// отметки «просмотрено» и «скрыто».
import { el, icon, api, money, debounce, modal } from './util.js';
import { aiStatus } from './ai.js';

const marks = { hidden: {}, viewed: {} };
let loaded = false;

export async function loadMarks() {
  try {
    const r = await api('/api/store/kufarMarks');
    if (r.value && typeof r.value === 'object') {
      marks.hidden = r.value.hidden || {};
      marks.viewed = r.value.viewed || {};
    }
  } catch {}
  loaded = true;
}

// Храним только последние отметки, чтобы файл данных не рос бесконечно
function trim(map, max) {
  const keys = Object.keys(map);
  if (keys.length <= max) return map;
  keys.sort((a, b) => map[a] - map[b]);
  for (const k of keys.slice(0, keys.length - max)) delete map[k];
  return map;
}

const saveMarks = debounce(() => {
  if (!loaded) return;
  api('/api/store/kufarMarks', { method: 'PUT', body: { hidden: trim(marks.hidden, 3000), viewed: trim(marks.viewed, 5000) } }).catch(() => {});
}, 600);

export const isHidden = (u) => !!marks.hidden[u.id];
export const isBlocked = (ad) => ad.risk?.level === 'blocked';
export const isFiltered = (ad) => isHidden(ad) || isBlocked(ad);
export const isViewed = (u) => !!marks.viewed[u.id];
export const hiddenCount = (list) => list.filter(isHidden).length;

export function markViewed(u) {
  if (marks.viewed[u.id]) return;
  marks.viewed[u.id] = Date.now();
  saveMarks();
}

export function setHidden(u, on) {
  if (on) marks.hidden[u.id] = Date.now();
  else delete marks.hidden[u.id];
  saveMarks();
}

/** Ссылка на объявление: при открытии помечается «просмотрено». */
export function adLink(u, text, onOpen) {
  return el('a', {
    href: u.url, target: '_blank', rel: 'noopener',
    onclick: () => {
      markViewed(u);
      if (onOpen) onOpen();
      if (u.market && u.market.deal === 'suspicious') {
        document.dispatchEvent(new CustomEvent('mascot', { detail: { id: 'kufar-suspicious', level: 'warn', title: 'Осторожно', text: 'Цена сильно ниже рынка — так бывает у мошенников, нерабочих или «не тех» моделей. Не переводите предоплату, проверяйте вживую или берите с «Куфар Оплатой».' } }));
      }
    },
  }, text || u.name);
}

/** Сколько времени назад размещено объявление. */
export function ago(date) {
  if (!date) return null;
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  return d.toLocaleDateString('ru-RU');
}

/** Чипы с информацией о продавце и сделке. */
export function adChips(u) {
  const out = [];
  const chip = (text, cls, title) => out.push(el('span.chip', { class: cls || '', title: title || '' }, text));
  if (u.best) out.push(el('span.chip.best', { title: 'Одно из самых выгодных среди найденных: мощность или объём за рубль, цена относительно рынка, понятный производитель, безопасная сделка' }, icon('star'), 'лучшее предложение'));
  if (u.date) chip(ago(u.date), '', 'Когда размещено (или поднято) объявление');
  chip(u.company ? 'компания' : 'частное лицо', u.company ? 'accent' : '', u.seller ? `Продавец: ${u.seller}` : '');
  if (u.delivery) chip('Куфар Доставка', 'ok', 'Можно заказать доставку через Kufar');
  if (u.safedeal) chip('Куфар Оплата', 'ok', 'Безопасная сделка: деньги продавец получит только после того, как вы заберёте товар');
  if (u.guarantee) chip('гарантия', 'ok');
  if (u.installment) chip('рассрочка', 'ok');
  if (u.exchange) chip('обмен');
  const deal = dealChip(u);
  if (deal) out.push(deal);
  return out;
}

const RISK_TITLE = { blocked: 'Скрыто фильтром', caution: 'Понижено в выдаче', unknown: 'Описание не проверено', clear: 'Признаков неисправности в тексте не найдено' };
const CONFIDENCE = { high: 'высокая', medium: 'средняя', low: 'низкая' };
const AI_VERDICT = {
  fault: 'По мнению ИИ, продавец описывает текущий дефект.',
  seller_reports_working: 'ИИ считает, что продавец заявляет о рабочем состоянии.',
  unclear: 'ИИ не смог определить, что продавец сообщает о работоспособности.',
};

export function adRisk(ad, onChange) {
  const risk = ad.risk;
  if (!risk || risk.level === 'clear') return null;
  return el('div.small', { style: { marginTop: '5px' } },
    el('b', RISK_TITLE[risk.level]),
    risk.level !== 'unknown' && risk.reasons[0] ? el('div.dim', risk.reasons[0]) : null,
    /^\d{1,16}$/.test(ad.id) ? el('button.link-btn', { onclick: () => checkAd(ad, onChange) }, 'Проверить объявление') : null);
}

async function checkAd(ad, onChange) {
  const panel = el('div', el('p.muted', 'Загружаем описание Kufar…'));
  modal('Проверка объявления Kufar', panel);
  const request = (useAi = false) => api('/api/kufar/check', { method: 'POST', body: { id: ad.id, ai: useAi } });
  try {
    const { risk } = await request();
    ad.risk = risk;
    if (onChange) onChange();
    const answer = el('div', { role: 'status' });
    const note = risk.level === 'clear' ? 'Проверка основана на словах продавца.' : `Уверенность по тексту — ${CONFIDENCE[risk.confidence]}.`;
    panel.replaceChildren(el('h3', ad.name), el('p', RISK_TITLE[risk.level]),
      risk.reasons.length ? el('ul', risk.reasons.map((reason) => el('li', reason))) : null,
      el('p.dim.small', note), answer);
    if (risk.level !== 'caution' || !risk.full) return;
    const status = await aiStatus(true);
    if (!status.kufarReview) return;
    const button = el('button.btn.btn-sm.btn-primary', { onclick: async () => {
      button.disabled = true;
      answer.replaceChildren(el('p.muted', 'ИИ читает описание…'));
      try {
        const r = await request(true);
        ad.risk = r.risk;
        if (onChange) onChange();
        answer.replaceChildren(el('p', r.review ? AI_VERDICT[r.review.verdict] || AI_VERDICT.unclear : RISK_TITLE[r.risk.level]));
      } catch (e) {
        answer.replaceChildren(el('div.notice.err', e.message));
        button.disabled = false;
      }
    } }, icon('sparkles'), 'Проверить через ИИ');
    answer.before(el('p.dim.small', `Заголовок и описание будут переданы в ${status.providerLabel || 'подключённый сервис'}. Ссылки и распознанные контакты скрываются.`), button);
  } catch (e) {
    panel.replaceChildren(el('div.notice.err', icon('error'), e.message));
  }
}

/** Цена относительно рынка (медиана б/у этой модели на Kufar). */
export function dealChip(u) {
  const m = u.market;
  if (!m || !m.deal) return null;
  const title = `Обычная цена б/у этой модели на Kufar — около ${money.fmt(m.median)} (по ${m.n} объявлениям)`;
  if (m.deal === 'suspicious') return el('span.chip.warn', { title: title + '. Слишком низкая цена бывает у мошенников, неисправных или «не той» моделей — проверяйте внимательно.' }, icon('alert'), 'подозрительно дёшево');
  if (m.deal === 'great') return el('span.chip.ok', { title }, icon('tag'), `выгодно: ${m.pct}% к рынку`);
  if (m.deal === 'good') return el('span.chip.ok', { title }, `${m.pct}% к рынку`);
  if (m.deal === 'expensive') return el('span.chip', { title }, `+${m.pct}% к рынку`);
  return null;
}

/** Кнопка «Скрыть / Вернуть». */
export function hideButton(u, onChange) {
  if (isBlocked(u)) return null;
  const hidden = isHidden(u);
  return el('button.btn.btn-sm.btn-ghost', {
    title: hidden ? 'Вернуть объявление в списки' : 'Скрыть объявление: больше не показывать его',
    onclick: () => { setHidden(u, !hidden); if (onChange) onChange(); },
  }, icon(hidden ? 'eye' : 'eyeOff'));
}

/** Кнопка-переключатель «Показать скрытые (N)». */
export function hiddenToggle(n, shown, onToggle) {
  if (!n) return null;
  return el('button.link-btn', { onclick: onToggle }, shown ? 'Спрятать скрытые объявления' : `Показать скрытые (${n})`);
}
