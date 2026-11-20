// Страница «Новости»: свежие новости о компьютерах из RSS 20 сайтов, фильтр по языку, темам и источникам.
import { el, icon, api, debounce } from './util.js';
import { state, saveSettings } from './state.js';
import { ago } from './kufarui.js';

let root = null;
const N = { src: '', lang: '', topic: '', q: '', data: null, loading: false, error: null, shown: 60 };
const PAGE = 60;
let lastVisit = 0;

export function initNews(node) {
  root = node;
  lastVisit = +state.settings.newsVisit || 0;
  N.lang = ['ru', 'en'].includes(state.settings.newsLang) ? state.settings.newsLang : '';
}

// Ленты сайтов обновляются в течение дня: открываем страницу — подгружаем свежее, если прошло больше 15 минут
const STALE_MS = 15 * 60 * 1000;
let autoTimer = null;

export function rerenderNews() {
  if (!root) return;
  if ((!N.data || Date.now() - (N.loadedAt || 0) > STALE_MS) && !N.loading) load();
  else render();
  // Пока страница открыта — обновляем сами каждые 20 минут
  clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (state.page === 'news' && !N.loading && document.visibilityState !== 'hidden') load();
    else if (state.page !== 'news') clearInterval(autoTimer);
  }, 20 * 60 * 1000);
  // Отмечаем визит: при следующем открытии новые новости будут помечены
  const now = Date.now();
  setTimeout(() => saveSettings({ newsVisit: now }).catch(() => {}), 3000);
}

let seq = 0;
async function load() {
  // Ответ на устаревший запрос (уже сменили язык, источник или тему) не показываем
  const my = ++seq;
  N.loading = true;
  N.error = null;
  render();
  try {
    const qs = new URLSearchParams({ src: N.src, lang: N.lang, topic: N.topic, q: N.q });
    const data = await api('/api/news?' + qs);
    if (my !== seq) return;
    N.data = data;
    N.loadedAt = Date.now();
    N.shown = PAGE;
  } catch (e) {
    if (my !== seq) return;
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
  const setLang = (l) => {
    N.lang = l;
    // Источник другого языка в списке не останется — сбрасываем его
    if (N.src && d && d.feeds.find((f) => f.id === N.src && l && f.lang !== l)) N.src = '';
    saveSettings({ newsLang: l }).catch(() => {});
    load();
  };
  const feeds = d ? d.feeds : [];
  const cnt = (id) => {
    const x = d && d.sources.find((s) => s.id === id);
    return x ? x.count : null;
  };
  const srcSel = el('select.select', { onchange: (e) => { N.src = e.target.value; load(); } },
    el('option', { value: '' }, `Все источники (${feeds.filter((f) => !N.lang || f.lang === N.lang).length})`),
    [['ru', 'На русском'], ['en', 'На английском']].filter(([l]) => !N.lang || N.lang === l).map(([l, name]) => el('optgroup', { label: name },
      feeds.filter((f) => f.lang === l).map((f) => el('option', { value: f.id, selected: N.src === f.id }, f.name + (cnt(f.id) != null && N.src === '' ? ` · ${cnt(f.id)}` : ''))))));
  const failed = d ? d.sources.filter((x) => x.error) : [];
  const stale = d ? d.sources.filter((x) => x.stale) : [];
  const slow = d ? d.sources.filter((x) => x.slow && !x.count) : [];
  const items = d ? d.items : [];
  const names = feeds.filter((f) => f.lang === 'ru').slice(0, 5).map((f) => f.name).join(', ');
  root.replaceChildren(
    el('div.page-head',
      el('div', el('h1', 'Новости'), el('p', `Свежее о железе и играх из ${feeds.length || 20} источников на русском и английском: ${names || 'Onliner, 3DNews, iXBT…'} и другие. Нажмите на новость — откроется полная статья на сайте.`),
        N.loadedAt ? el('p.dim.small', `Обновлено в ${new Date(N.loadedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · новые новости подгружаются сами каждые 20 минут, пока страница открыта${d ? ` · новых с прошлого визита: ${items.filter((it) => it.date && lastVisit && new Date(it.date).getTime() > lastVisit).length}` : ''}`) : null),
      el('button.btn', { onclick: load, disabled: N.loading }, icon('refresh'), 'Обновить')),
    el('div.card.news-filters',
      search,
      el('div.row.wrap', { style: { gap: '6px', alignItems: 'center' } },
        chip(!N.lang, 'Все языки', () => setLang('')),
        chip(N.lang === 'ru', 'На русском', () => setLang('ru')),
        chip(N.lang === 'en', 'На английском', () => setLang('en')),
        d ? srcSel : null),
      d ? el('div.row.wrap', { style: { gap: '6px' } },
        chip(!N.topic, 'Все темы', () => { N.topic = ''; load(); }),
        d.topics.map((t) => chip(N.topic === t.id, t.name, () => { N.topic = N.topic === t.id ? '' : t.id; load(); }))) : null),
    N.error ? el('div.notice.err', icon('error'), el('div', N.error)) : null,
    failed.length || stale.length || slow.length ? el('div.dim.small', { style: { margin: '8px 2px' } },
      failed.length ? 'Не ответили: ' + failed.map((x) => x.name).join(', ') + '. ' : '',
      stale.length ? 'Показаны новости с прошлой загрузки: ' + stale.map((x) => x.name).join(', ') + '. ' : '',
      slow.length ? 'Ещё загружаются (появятся при обновлении): ' + slow.map((x) => x.name).join(', ') + '.' : '') : null,
    N.loading && !d ? el('div.card.loading', el('div.spinner'), el('b', 'Загружаем новости…')) : null,
    d ? (items.length ? newsCards(items.slice(0, N.shown)) : el('div.card.empty-state', el('h3', 'Ничего не нашлось'), el('p.muted', 'Попробуйте другую тему, язык или слово.'))) : null,
    d && items.length > N.shown ? el('div.row', { style: { justifyContent: 'center', marginTop: '14px' } },
      el('button.btn', { onclick: () => { N.shown += PAGE; render(); } }, `Показать ещё (${items.length - N.shown})`)) : null);
}
