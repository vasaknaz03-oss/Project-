// Страница «Новости»: свежие новости о компьютерах из RSS сайтов, фильтр по темам и источникам.
import { el, icon, api, debounce } from './util.js';
import { state, saveSettings } from './state.js';
import { ago } from './kufarui.js';

let root = null;
const N = { src: '', topic: '', q: '', data: null, loading: false, error: null };
let lastVisit = 0;

export function initNews(node) {
  root = node;
  lastVisit = +state.settings.newsVisit || 0;
}

export function rerenderNews() {
  if (!root) return;
  if (!N.data && !N.loading) load();
  else render();
  // Отмечаем визит: при следующем открытии новые новости будут помечены
  const now = Date.now();
  setTimeout(() => saveSettings({ newsVisit: now }).catch(() => {}), 3000);
}

async function load() {
  N.loading = true;
  N.error = null;
  render();
  try {
    const qs = new URLSearchParams({ src: N.src, topic: N.topic, q: N.q });
    N.data = await api('/api/news?' + qs);
  } catch (e) {
    N.error = e.message;
  }
  N.loading = false;
  render();
}

const reload = debounce(load, 400);

/** Карточки новостей — используются и на странице «Разгон». */
export function newsCards(items, { compact = false } = {}) {
  return el('div.news-grid', { class: compact ? 'compact' : '' }, items.map((it) => {
    const isNew = it.date && lastVisit && new Date(it.date).getTime() > lastVisit;
    return el('a.news-card', { href: it.link, target: '_blank', rel: 'noopener' },
      it.image && !compact ? el('div.news-img', el('img', { src: it.image, alt: '', loading: 'lazy', onerror: (e) => e.target.parentNode.remove() })) : null,
      el('div.news-body',
        el('div.news-meta',
          el('span.news-src', it.sourceName),
          it.date ? el('span', ago(it.date) === 'сегодня' ? new Date(it.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ago(it.date)) : null,
          isNew ? el('span.chip.ok', 'новое') : null),
        el('div.news-title', it.title),
        !compact && it.summary ? el('div.news-summary', it.summary) : null));
  }));
}

function render() {
  const d = N.data;
  const chip = (active, label, onclick, count) => el('button.chip.toggle-chip', { class: active ? 'on' : '', type: 'button', onclick }, label, count != null ? el('span.dim', ` ${count}`) : null);
  const search = el('input.input', {
    type: 'search', placeholder: 'Поиск по новостям: RTX 5070, Ryzen, цены на память…', value: N.q,
    oninput: (e) => { N.q = e.target.value; reload(); },
  });
  root.replaceChildren(
    el('div.page-head',
      el('div', el('h1', 'Новости'), el('p', 'Свежее о железе и играх с Onliner, 3DNews, Overclockers.ru, Хабра и Tom\'s Hardware. Нажмите на новость — откроется полная статья на сайте.')),
      el('button.btn', { onclick: load, disabled: N.loading }, icon('refresh'), 'Обновить')),
    el('div.card.news-filters',
      search,
      d ? el('div.row.wrap', { style: { gap: '6px' } },
        chip(!N.topic, 'Все темы', () => { N.topic = ''; load(); }),
        d.topics.map((t) => chip(N.topic === t.id, t.name, () => { N.topic = N.topic === t.id ? '' : t.id; load(); }))) : null,
      d ? el('div.row.wrap', { style: { gap: '6px' } },
        chip(!N.src, 'Все источники', () => { N.src = ''; load(); }),
        d.feeds.map((f) => chip(N.src === f.id, f.name, () => { N.src = N.src === f.id ? '' : f.id; load(); }))) : null),
    N.error ? el('div.notice.err', icon('error'), el('div', N.error)) : null,
    d && d.sources.some((s) => s.error) ? el('div.dim.small', { style: { margin: '8px 2px' } }, 'Не ответили: ' + d.sources.filter((s) => s.error).map((s) => s.name).join(', ')) : null,
    N.loading && !d ? el('div.card.loading', el('div.spinner'), el('b', 'Загружаем новости…')) : null,
    d ? (d.items.length ? newsCards(d.items) : el('div.card.empty-state', el('h3', 'Ничего не нашлось'), el('p.muted', 'Попробуйте другую тему или слово.'))) : null);
}
