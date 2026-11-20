// Отзывы покупателей (Onliner) и ссылки на обзоры и форумы — чтобы новичок мог понять, что выбрать.
import { el, icon, api, modal, plural } from './util.js';
import { researchBlock, youtubeBlock, aiReviewsButton } from './ai.js';

const cache = new Map();
// «Недостатки: не обнаружил» — не показываем как минус
const NO_CONS = /^(нет|нету|не (нашёл|нашел|нашла|выявил\S*|обнаружил\S*|заметил\S*|замечено)|пока нет|отсутствуют)\.?!?$/i;

/** Загрузка отзывов с кэшем на время сеанса. */
export function loadReviews(it) {
  const key = it.id;
  if (!cache.has(key)) {
    const p = api('/api/reviews?key=' + encodeURIComponent(key) + (it.category ? '&cat=' + encodeURIComponent(it.category) : ''));
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key);
}

function stars(v) {
  const full = Math.round(v || 0);
  return el('span.stars', { title: `${(v || 0).toFixed(1)} из 5` }, '★★★★★'.slice(0, full), el('span.stars-off', '★★★★★'.slice(full)));
}

/** Короткий чип «★ 4.8 · 12 отзывов»; клик открывает отзывы. */
export function reviewChip(it) {
  if (!it || it.source !== 'onliner' || !it.reviews) return null;
  return el('button.chip.rev-chip', { type: 'button', title: 'Отзывы покупателей', onclick: (e) => { e.stopPropagation(); openReviews(it); } },
    `★ ${(it.rating || 0).toFixed(1)} · ${it.reviews} ${plural(it.reviews, 'отзыв', 'отзыва', 'отзывов')}`);
}

/** Название для поиска обзоров: модель без кодов производителя. */
function shortName(it) {
  if (it.perf && it.perf.name && /videocard|gpu/.test(it.category || '')) return it.perf.name;
  return String(it.name || '').replace(/\s[A-Z0-9-]{8,}$/, '').replace(/\(.*?\)/g, '').trim();
}

/** Полное название модели без кода производителя в конце («… DUAL-RTX5070-O12G»). */
function modelName(it) {
  const words = String(it.name || '').replace(/\(.*?\)/g, ' ').split(/\s+/).filter(Boolean);
  while (words.length > 3) {
    const w = words[words.length - 1];
    if ((/\d/.test(w) && /-/.test(w)) || /^[A-Z0-9]{7,}$/.test(w)) words.pop();
    else break;
  }
  return words.join(' ');
}

/** Где ещё почитать мнения реальных людей: обзоры, форумы, обсуждения. */
export function discussLinks(it) {
  const q = shortName(it);
  const e = encodeURIComponent;
  const links = [
    ['Видео-обзоры (YouTube)', `https://www.youtube.com/results?search_query=${e(q + ' обзор')}`],
    ['Форум Overclockers.ru', `https://www.google.com/search?q=${e(q + ' site:forums.overclockers.ru')}`],
    ['Обсуждения на Reddit', `https://www.reddit.com/search/?q=${e(q)}`],
    ['Отзывы в интернете', `https://www.google.com/search?q=${e(q + ' отзывы владельцев')}`],
  ];
  return el('div.ext-links.discuss', el('span.dim', 'Мнения и обзоры:'),
    links.map(([name, url]) => el('a', { href: url, target: '_blank', rel: 'noopener' }, name + ' ↗')));
}

function reviewCard(r) {
  return el('div.review',
    el('div.review-head', stars(r.rating), el('b', r.summary || 'Без заголовка'),
      el('span.dim', [r.author, r.date ? new Date(r.date).toLocaleDateString('ru-RU') : ''].filter(Boolean).join(' · '))),
    r.model ? el('div.dim.small', `Отзыв о модели: ${r.model}`) : null,
    r.pros ? el('div.review-pros', icon('thumbUp'), r.pros) : null,
    r.cons && !NO_CONS.test(r.cons.trim()) ? el('div.review-cons', icon('thumbDown'), r.cons) : null,
    r.text ? el('div.review-text', r.text.length > 400 ? r.text.slice(0, 400) + '…' : r.text) : null);
}

/**
 * Отзывы и мнения: вкладки «Покупатели» (Onliner), «Форумы и обзоры» (ИИ с веб-поиском) и «Видео» (YouTube).
 * Возвращает элемент сразу; содержимое вкладок подгружается при открытии.
 */
export async function reviewsPanel(it, { limit = 4 } = {}) {
  const q = shortName(it);
  const tabs = [
    ['buyers', it.source === 'onliner' && it.reviews ? `Покупатели (${it.reviews})` : 'Покупатели', () => buyersPanel(it, { limit })],
    ['forums', 'Форумы и обзоры (ИИ)', () => researchBlock(modelName(it), { mode: 'part' })],
    ['video', 'Видео', () => youtubeBlock(q + ' обзор')],
  ];
  const body = el('div.rev-tab-body');
  const bar = el('div.seg.rev-tabs');
  let current = null;
  const show = async (id) => {
    current = id;
    for (const b of bar.children) b.classList.toggle('on', b.dataset.id === id);
    const t = tabs.find((x) => x[0] === id);
    body.replaceChildren(el('div.row', el('div.spinner.inline'), el('span.muted', 'Загружаем…')));
    const node = await t[2]();
    // Пока грузилась эта вкладка, могли переключиться на другую — тогда её содержимое не показываем
    if (current === id) body.replaceChildren(node);
  };
  for (const [id, label] of tabs) bar.append(el('button', { type: 'button', 'data-id': id, onclick: () => show(id) }, label));
  // Нет отзывов покупателей — сразу открываем форумы и обзоры
  show(it.source === 'onliner' && it.reviews ? 'buyers' : 'forums');
  return el('div.rev-wrap', bar, body);
}

/** Отзывы покупателей Onliner: вывод для новичка, что хвалят и ругают, распределение оценок, свежие отзывы. */
async function buyersPanel(it, { limit = 4 } = {}) {
  if (it.source !== 'onliner') {
    return el('div',
      el('p.muted', 'Для объявлений и деталей, добавленных вручную, отзывов покупателей Onliner нет — откройте вкладку «Форумы и обзоры» или почитайте сами:'),
      discussLinks(it));
  }
  let r;
  try {
    r = await loadReviews(it);
  } catch (e) {
    return el('div', el('div.notice.err', icon('error'), el('div', 'Не удалось загрузить отзывы: ' + e.message)), discussLinks(it));
  }
  const s = r.summary || {};
  const v = s.verdict || { level: 'none', text: '' };
  const allUrl = (it.url || '') + '/reviews';
  if (!r.total) {
    return el('div.reviews',
      el('div.verdict', { class: 'v-none' }, icon('info'), el('div', v.text)),
      discussLinks(it));
  }
  const dist = r.stars || {};
  const maxN = Math.max(1, ...Object.values(dist));
  const list = el('div.review-list', r.items.slice(0, limit).map(reviewCard));
  const more = r.items.length > limit ? el('button.btn.btn-sm.btn-ghost', {
    onclick: (e) => { list.replaceChildren(...r.items.map(reviewCard)); e.currentTarget.remove(); },
  }, `Показать ещё ${r.items.length - limit}`) : null;
  return el('div.reviews',
    el('div.verdict', { class: 'v-' + v.level }, icon(v.level === 'bad' || v.level === 'mixed' ? 'alert' : 'sparkles'), el('div', el('b', 'Вывод по отзывам. '), v.text)),
    aiReviewsButton(it),
    el('div.rev-top',
      el('div.rev-score', el('div.rev-big', (r.rating || 0).toFixed(1)), stars(r.rating), el('div.dim.small', `${r.total} ${plural(r.total, 'отзыв', 'отзыва', 'отзывов')}${s.positive != null ? ` · ${s.positive}% рекомендуют` : ''}`)),
      el('div.rev-dist', [5, 4, 3, 2, 1].map((n) => el('div.rev-row', el('span', n + '★'), el('div.rev-bar', el('i', { style: { width: Math.round(((dist[n] || 0) / maxN) * 100) + '%' } })), el('span.dim', String(dist[n] || 0))))),
      el('div.rev-tags',
        s.pros && s.pros.length ? el('div', el('div.panel-title', 'Хвалят'), el('div.row.wrap', s.pros.map((p) => el('span.chip.ok', `${p.text}${p.count > 1 ? ' · ' + p.count : ''}`)))) : null,
        s.cons && s.cons.length ? el('div', el('div.panel-title', 'Жалуются'), el('div.row.wrap', s.cons.map((p) => el('span.chip.warn', `${p.text}${p.count > 1 ? ' · ' + p.count : ''}`)))) : null)),
    el('div.panel-title', { style: { marginTop: '12px' } }, 'Свежие отзывы'),
    list,
    el('div.row', { style: { gap: '8px', marginTop: '8px' } }, more,
      el('a.btn.btn-sm.btn-ghost', { href: allUrl, target: '_blank', rel: 'noopener' }, icon('external'), 'Все отзывы на Onliner')));
}

export function openReviews(it) {
  const body = el('div', el('div.row', el('div.spinner', { style: { width: '20px', height: '20px', borderWidth: '2px' } }), el('span.muted', 'Загружаем отзывы…')));
  modal('Отзывы: ' + it.name, body);
  reviewsPanel(it, { limit: 6 }).then((node) => body.replaceChildren(node));
}
