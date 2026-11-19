// Страница «Поиск комплектующих»: Onliner (новые, цены магазинов) и Kufar (объявления).
import { el, icon, api, money, toast, modal, thumb, plural } from './util.js';
import { adChips, adLink, hideButton, isHidden, isViewed, hiddenToggle } from './kufarui.js';
import { isWatched, toggleWatch, saveKufarSearch } from './watch.js';
import { offersTable, historyBlock } from './shops.js';
import { state, CAT_TO_SLOT, CAT_ICON, specChips, shopLinks, linkFor } from './state.js';
import { replaceFromSearch, hasActiveBuild, takeKufarToBuild } from './build.js';
import { facetPanel, loadFacets, loadKufarFacets, countActive } from './facets.js';

const Catalog = window.Catalog;

const S = {
  q: '', cat: '', src: 'onliner', cond: '', min: '', max: '', sort: '', page: 1,
  items: [], total: 0, pages: 0, loading: false, error: null, searched: false, replaceSlot: null,
  filters: {}, ktype: {}, next: null, layoutKey: '',
};

const section = () => (S.cat ? Catalog.byId[S.cat] || null : null);
const fkey = () => S.src + '|' + S.cat;
/** Есть ли у раздела фильтры для текущего источника. */
function hasFilters() {
  const sec = section();
  if (!sec) return false;
  if (S.src === 'wb') return false;
  return S.src === 'onliner' ? !!sec.onliner : !!sec.kufar;
}
/** Раздел может быть только на одном из сайтов — переключаемся на доступный. */
function fixSource() {
  const sec = section();
  if (!sec) return;
  if (S.src === 'onliner' && !sec.onliner) S.src = 'kufar';
}
let root;

export function initSearch(container) {
  root = container;
  render();
}

export function rerenderSearch() {
  if (root) render();
}

/** Переход из сборки: «Найти другую в поиске». */
export function openSearchFor(cat, slot) {
  S.cat = cat;
  S.q = '';
  S.src = 'onliner';
  S.replaceSlot = slot;
  S.sort = 'rating';
  // Те же фильтры Onliner, что были заданы в подборе
  const bf = state.lastBuildForm && state.lastBuildForm.filters && state.lastBuildForm.filters[cat];
  if (bf && countActive(bf)) S.filters['onliner|' + cat] = JSON.parse(JSON.stringify(bf));
  run(true);
}

function render() {
  fixSource();
  S.layoutKey = fkey() + '|' + (S.ktype[S.cat] || '');
  const results = el('div#searchResults', renderResults());
  root.replaceChildren(
    el('div.page-head', el('div', el('h1', 'Поиск'), el('p', 'Комплектующие, ноутбуки, мониторы, периферия и всё для рабочего места. Новое — по каталогу Onliner с ценами магазинов, объявления — по Kufar. Фильтры у каждого раздела свои, как на сайтах.'))),
    el('div#searchBar', renderBar()),
    hasFilters() ? el('div.search-layout', filtersColumn(), results) : results);
  renderTray();
}

/** Обновление без пересборки панели фильтров (чтобы не терять раскрытые списки). */
function refresh() {
  fixSource();
  const key = fkey() + '|' + (S.ktype[S.cat] || '');
  if (key !== S.layoutKey || !document.getElementById('searchResults')) {
    render();
    return;
  }
  document.getElementById('searchBar').replaceChildren(renderBar());
  document.getElementById('searchResults').replaceChildren(...[].concat(renderResults()));
}

/** Левая колонка с фильтрами раздела: у Onliner и Kufar свои наборы, у каждого раздела — свои. */
function filtersColumn() {
  const key = fkey();
  const cat = S.cat;
  const isKufar = S.src === 'kufar';
  const n = countActive(S.filters[key]);
  const host = el('div', el('div.row', el('div.spinner', { style: { width: '18px', height: '18px', borderWidth: '2px' } }), el('span.muted.small', 'Загружаем фильтры…')));
  const col = el('aside.card.filters-col',
    el('div.filters-col-head',
      el('h3', 'Фильтры', n ? el('span.badge-count', String(n)) : null),
      n ? el('button.link-btn', { type: 'button', onclick: () => { delete S.filters[key]; delete S.ktype[cat]; S.layoutKey = ''; run(true); } }, 'Сбросить') : null),
    el('div.dim.small', { style: { marginBottom: '10px' } }, isKufar ? 'Фильтры Kufar для этого раздела' : 'Фильтры Onliner для этого раздела'),
    host);
  let timer;
  const load = isKufar ? loadKufarFacets(cat, S.ktype[cat]) : loadFacets(cat);
  load.then((meta) => {
    if (isKufar && meta.none) {
      host.replaceChildren(el('div.muted.small', 'У Kufar нет отдельной категории для этого раздела — ищем по словам.'));
      return;
    }
    // Убираем фильтры, которых нет у этого набора (например, после смены «Типа» на Kufar)
    const ids = new Set(meta.groups.flatMap((g) => g.items.map((i) => i.id)));
    if (S.filters[key]) for (const k of Object.keys(S.filters[key])) if (!ids.has(k)) delete S.filters[key][k];
    if (meta.partial) host.before(el('div.notice', { style: { marginBottom: '10px', fontSize: '12.5px' } }, icon('info'), el('div', 'Kufar сейчас ограничил запросы — показаны фильтры по найденным объявлениям.')));
    host.replaceChildren(facetPanel(meta, S.filters[key], (v) => {
      // Смена «Типа» на Kufar: у нового типа свои характеристики — перезагружаем набор фильтров
      if (isKufar && meta.typeParam) {
        const t = (v[meta.typeParam] || [])[0];
        const cur = S.ktype[cat] ? S.ktype[cat].split(':')[1] : undefined;
        if (t !== cur) {
          if (t) S.ktype[cat] = meta.typeParam + ':' + t;
          else delete S.ktype[cat];
          S.filters[key] = v;
          clearTimeout(timer);
          run(true);
          return;
        }
      }
      if (countActive(v)) S.filters[key] = v;
      else delete S.filters[key];
      const badge = col.querySelector('.filters-col-head h3');
      badge.replaceChildren('Фильтры', countActive(v) ? el('span.badge-count', String(countActive(v))) : '');
      clearTimeout(timer);
      timer = setTimeout(() => run(true), 450);
    }, { compact: true, hide: meta.preset || [] }));
  }).catch((e) => host.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message))));
  return col;
}

function renderBar() {
  const q = el('input.input', {
    type: 'search', placeholder: 'Например: RTX 5060, Ryzen 5 7500F, 32 ГБ DDR5', value: S.q,
    oninput: (e) => (S.q = e.target.value),
    onkeydown: (e) => e.key === 'Enter' && run(true),
  });
  const cat = el('select.select', { onchange: (e) => { S.cat = e.target.value; S.replaceSlot = null; run(true); } },
    el('option', { value: '' }, 'Все разделы'),
    Catalog.GROUPS.map((g) => el('optgroup', { label: g.name },
      Catalog.SECTIONS.filter((x) => x.group === g.id).map((x) => el('option', { value: x.id }, x.name)))));
  cat.value = S.cat;

  const sec = section();
  const src = el('div.seg', [['onliner', 'Новые · Onliner'], ['kufar', 'Объявления · Kufar'], ['wb', 'Wildberries']].map(([v, l]) => el('button', {
    type: 'button', class: S.src === v ? 'on' : '',
    disabled: v === 'onliner' && sec && !sec.onliner,
    title: v === 'onliner' && sec && !sec.onliner ? 'На Onliner нет такого раздела' : '',
    onclick: () => { S.src = v; run(true); },
  }, l)));

  const cond = el('select.select', { onchange: (e) => { S.cond = e.target.value; run(true); } },
    [['', 'Любое состояние'], ['used', 'Только б/у'], ['new', 'Только новое']].map(([v, l]) => el('option', { value: v }, l)));
  cond.value = S.cond;

  // У Kufar нет сортировки «популярные» — сбрасываем на «новые»
  if (S.src === 'kufar' && S.sort === 'rating') S.sort = '';
  const sort = el('select.select', { onchange: (e) => { S.sort = e.target.value; run(true); } },
    (S.src === 'kufar'
      ? [['', 'Сначала новые объявления'], ['price_asc', 'Сначала дешёвые'], ['price_desc', 'Сначала дорогие']]
      : [['', 'По релевантности'], ['rating', 'Популярные'], ['price_asc', 'Сначала дешёвые'], ['price_desc', 'Сначала дорогие']]
    ).map(([v, l]) => el('option', { value: v }, l)));
  sort.value = S.sort;

  const priceInput = (key, ph) => el('input.input', {
    type: 'number', min: '0', placeholder: ph, value: S[key],
    oninput: (e) => (S[key] = e.target.value),
    onkeydown: (e) => e.key === 'Enter' && run(true),
  });

  const query = S.q.trim() || (sec ? sec.name : '');
  return el('div.card',
    el('div.search-bar',
      el('div.search-input', icon('search'), q),
      cat,
      el('button.btn.btn-primary', { onclick: () => run(true) }, 'Найти')),
    el('div.filters',
      src,
      S.src === 'kufar' && !hasFilters() ? cond : null,
      el('div.row', el('span.label', `Цена, ${money.symbol()}`), priceInput('min', 'от'), el('span.dim', '—'), priceInput('max', 'до')),
      el('div.row', el('span.label', 'Сортировка'), sort)),
    query ? el('div.ext-links', el('span.dim', `Искать «${query}» также на:`),
      shopLinks().map((l) => el('a', { href: linkFor(l.url, query), target: '_blank', rel: 'noopener' }, l.name, ' ↗'))) : null,
    S.replaceSlot && hasActiveBuild() ? el('div.notice.info', { style: { marginTop: '14px' } }, icon('swap'),
      el('div.grow', 'Выберите деталь и нажмите «В сборку» — она заменит текущую в подобранной сборке.'),
      el('button.btn.btn-sm.btn-ghost', { onclick: () => { S.replaceSlot = null; render(); } }, 'Отмена')) : null);
}

async function run(reset) {
  if (reset) {
    S.page = 1;
    S.items = [];
    S.next = null;
  }
  if (!S.q.trim() && !S.cat) {
    S.searched = false;
    render();
    return;
  }
  S.loading = true;
  S.error = null;
  S.searched = true;
  refresh();
  const toByn = (v) => (v === '' || v == null ? '' : Math.round(money.fromCur(+v) * 100) / 100);
  const params = new URLSearchParams({
    q: S.q.trim(), cat: S.cat, src: S.src, cond: S.cond, sort: S.sort, page: String(S.page), min: String(toByn(S.min)), max: String(toByn(S.max)),
  });
  if (hasFilters() && countActive(S.filters[fkey()])) params.set('f', JSON.stringify(S.filters[fkey()]));
  if (S.src === 'kufar' && !reset && S.next) params.set('cursor', S.next);
  // Ответ на устаревший запрос (пользователь уже поменял раздел, источник или текст) не показываем
  const seq = (S.seq = (S.seq || 0) + 1);
  try {
    const r = await api('/api/search?' + params);
    if (seq !== S.seq) return;
    S.items = reset ? r.items : S.items.concat(r.items);
    S.total = r.total;
    S.pages = r.pages;
    S.next = r.next || null;
    S.blocked = r.blocked ? r.url : null;
  } catch (e) {
    if (seq !== S.seq) return;
    S.error = e.message;
  } finally {
    if (seq === S.seq) S.loading = false;
  }
  if (seq === S.seq) {
    const box = document.getElementById('searchResults');
    if (box) box.replaceChildren(...[].concat(renderResults()));
  }
}

function renderResults() {
  if (!S.searched) {
    return el('div.card.empty-state', { style: { marginTop: '16px' } },
      icon('search', 'big-ico'),
      el('h3', 'Что ищем?'),
      el('p.muted', 'Введите модель или выберите раздел.'),
      el('div.section-picker', Catalog.GROUPS.map((g) => el('div.section-group',
        el('div.label', g.name),
        el('div.row.wrap', Catalog.SECTIONS.filter((x) => x.group === g.id).map((x) => el('button.btn.btn-sm', {
          onclick: () => { S.cat = x.id; S.sort = x.onliner ? 'rating' : ''; run(true); },
        }, icon(x.icon || 'cpu'), x.name)))))));
  }
  const out = [];
  if (S.error) out.push(el('div.notice.err', { style: { marginTop: '16px' } }, icon('error'), el('div', S.error)));
  if (S.src === 'wb' && S.blocked && !S.loading) {
    out.push(el('div.notice', { style: { marginTop: '16px' } }, icon('alert'), el('div',
      'Wildberries не ответил на автоматический запрос (сайт защищён от роботов). ',
      el('a', { href: S.blocked, target: '_blank', rel: 'noopener' }, 'Открыть этот поиск на Wildberries ↗'))));
    return out;
  }
  if (S.items.length) {
    out.push(el('div.dim.small', { style: { marginTop: '14px' } },
      S.src === 'kufar' ? `Найдено объявлений: ${S.total.toLocaleString('ru-RU')} · показано ${S.items.length}${S.next ? ' — ниже кнопка «Показать ещё»' : ''}` : S.cat ? `Товаров в разделе: ${S.total.toLocaleString('ru-RU')}` : 'Результаты каталога Onliner: компьютеры, периферия, мониторы и всё для сетапа'));
    const hiddenN = S.src === 'kufar' ? S.items.filter(isHidden).length : 0;
    const shown = S.src === 'kufar' && !S.showHidden ? S.items.filter((it) => !isHidden(it)) : S.items;
    if (hiddenN) out.push(el('div.dim.small', { style: { marginTop: '6px' } }, `Скрыто объявлений: ${hiddenN}. `, hiddenToggle(hiddenN, S.showHidden, () => { S.showHidden = !S.showHidden; render(); })));
    if (S.src === 'kufar') {
      out.push(el('div.notice.watch-hint', icon('bell'),
        el('div', el('b', 'Следить за новыми объявлениями. '), 'Программа будет проверять этот поиск (раздел, запрос, фильтры и цена) и сообщит о новых объявлениях — выгодные отметит отдельно.'),
        el('button.btn.btn-sm.btn-primary', {
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            const sec = section();
            const toByn = (v) => (v === '' || v == null ? null : Math.round(money.fromCur(+v) * 100) / 100);
            try {
              await saveKufarSearch({
                name: [sec ? sec.name : null, S.q.trim() ? `«${S.q.trim()}»` : null].filter(Boolean).join(' ') || 'Kufar',
                cat: S.cat, q: S.q.trim(), filters: S.filters[fkey()] || {}, priceMax: toByn(S.max), cond: S.cond,
              });
            } catch (err) {
              toast(err.message, 'err');
              e.currentTarget.disabled = false;
            }
          },
        }, 'Следить')));
    }
    out.push(el('div.grid', shown.map(card)));
  } else if (!S.loading && !S.error) {
    out.push(el('div.card.empty-state', { style: { marginTop: '16px' } }, el('h3', 'Ничего не нашлось'), el('p.muted', 'Попробуйте короче: например, «4060» вместо полного названия.')));
  }
  if (S.loading) {
    out.push(el('div.grid', Array.from({ length: S.items.length ? 4 : 8 }, () => el('div.pcard', el('div.skeleton', { style: { height: '140px' } }), el('div.skeleton', { style: { height: '14px' } }), el('div.skeleton', { style: { height: '14px', width: '60%' } })))));
  } else if (S.src === 'onliner' && S.page < S.pages && S.items.length) {
    out.push(el('div.more-row', el('button.btn', { onclick: () => { S.page++; run(false); } }, 'Показать ещё')));
  } else if (S.src === 'kufar' && S.next && S.items.length) {
    out.push(el('div.more-row', el('button.btn', { onclick: () => run(false) }, 'Показать ещё объявления')));
  }
  return out;
}

function card(it) {
  const isOnliner = it.source === 'onliner';
  const slot = isOnliner ? CAT_TO_SLOT[it.category] : null;
  const setupSlot = isOnliner && !slot && Catalog.setupById[it.category] ? it.category : null;
  const inCompare = state.compare.some((c) => c.id === it.id && c.source === it.source);
  const p = money.both(it.price);
  const node = el('div.pcard', { class: it.source === 'kufar' && isViewed(it) ? 'viewed' : '' },
    thumb(it.image, CAT_ICON[it.category] || CAT_ICON[S.cat] || 'cpu'),
    el('div.pcard-top',
      el('span.badge', { class: it.source }, isOnliner ? 'Onliner' : it.source === 'wb' ? 'Wildberries' : 'Kufar'),
      isOnliner ? el('span.chip', it.categoryName) : it.source === 'wb' ? (it.reviews ? el('span.chip', `★ ${it.rating} · ${it.reviews}`) : null) : el('span.chip', it.condition || 'объявление'),
      it.perf && it.perf.score ? el('span.chip.accent', `индекс ${it.perf.score}`) : null,
      it.perf && it.perf.gaming ? el('span.chip.accent', `игры ${it.perf.gaming}`) : null),
    el('div.pcard-name', it.source === 'kufar' ? adLink(it, it.name, () => node.classList.add('viewed')) : el('a', { href: it.url, target: '_blank', rel: 'noopener' }, it.name)),
    isOnliner
      ? el('div.part-specs', specChips(it.category, it).slice(0, 4))
      : it.source === 'wb' ? el('div.pcard-desc', 'Маркетплейс Wildberries, доставка в Беларусь')
      : el('div', el('div.pcard-desc', it.location || ''), el('div.row.wrap.ad-chips', adChips(it))),
    isOnliner && it.description ? el('div.pcard-desc', it.description) : null,
    el('div.pcard-foot',
      el('div',
        el('div.price', it.price ? p.main : 'нет в наличии'),
        p.sub && it.price ? el('div.price-sub', p.sub) : null,
        isOnliner && it.offers ? el('div.price-sub', `${it.offers} ${plural(it.offers, 'магазин', 'магазина', 'магазинов')}${it.usedCount ? ` · б/у: ${it.usedCount}` : ''}`) : null),
      el('div.pcard-actions',
        it.source === 'kufar' ? hideButton(it, render) : null,
        isOnliner && it.offers ? el('button.icon-btn', { title: 'Цены в магазинах', onclick: () => showShops(it) }, icon('store')) : null,
        isOnliner && it.price ? el('button.icon-btn', {
          title: isWatched(it) ? 'Перестать следить за ценой' : 'Следить за ценой',
          style: isWatched(it) ? { color: 'var(--accent)' } : null,
          onclick: async (e) => { await toggleWatch(it, e.currentTarget); render(); },
        }, icon('bell')) : null,
        !isOnliner && hasActiveBuild() && S.cat && (CAT_TO_SLOT[S.cat] || Catalog.setupById[S.cat]) ? el('button.btn.btn-sm', {
          title: CAT_TO_SLOT[S.cat] ? 'Взять объявление в сборку и закрепить' : 'Добавить объявление в сетап',
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            const ok = CAT_TO_SLOT[S.cat] ? await takeKufarToBuild(CAT_TO_SLOT[S.cat], it) : await takeKufarToBuild(S.cat, it, true);
            if (ok) document.dispatchEvent(new CustomEvent('goto-page', { detail: 'build' }));
          },
        }, CAT_TO_SLOT[S.cat] ? 'В сборку' : 'В сетап') : null,
        el('button.icon-btn', { title: inCompare ? 'Убрать из сравнения' : 'Добавить к сравнению', style: inCompare ? { color: 'var(--accent)' } : null, onclick: () => toggleCompare(it) }, icon('scale')),
        setupSlot && it.price && hasActiveBuild() ? el('button.btn.btn-sm', {
          title: 'Добавить в сетап текущей сборки',
          onclick: () => {
            if (replaceFromSearch(it, setupSlot, true)) document.dispatchEvent(new CustomEvent('goto-page', { detail: 'build' }));
          },
        }, 'В сетап') : null,
        slot && it.price && hasActiveBuild() ? el('button.btn.btn-sm', {
          title: 'Заменить в текущей сборке', onclick: () => {
            if (replaceFromSearch(it, S.replaceSlot && CAT_TO_SLOT[it.category] === S.replaceSlot ? S.replaceSlot : slot)) {
              S.replaceSlot = null;
              document.dispatchEvent(new CustomEvent('goto-page', { detail: 'build' }));
            }
          },
        }, 'В сборку') : null)));
  return node;
}

async function showShops(it) {
  const body = el('div', el('div.row', el('div.spinner', { style: { width: '20px', height: '20px', borderWidth: '2px' } }), el('span.muted', 'Загружаем…')));
  modal(it.name, body);
  try {
    const { offers } = await api('/api/offers?key=' + encodeURIComponent(it.id));
    const hist = el('div', { style: { marginTop: '14px' } });
    body.replaceChildren(
      offers.length ? offersTable(offers, 40) : el('p.muted', 'Сейчас нет предложений.'),
      hist,
      el('div.ext-links', el('a', { href: it.pricesUrl || it.url, target: '_blank', rel: 'noopener' }, 'Открыть на Onliner ↗')));
    historyBlock(it).then((node) => hist.append(node));
  } catch (e) {
    body.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message)));
  }
}

// ------------------------------------------------------------------ сравнение

function toggleCompare(it) {
  const i = state.compare.findIndex((c) => c.id === it.id && c.source === it.source);
  if (i >= 0) state.compare.splice(i, 1);
  else {
    if (state.compare.length >= 4) return toast('Сравнивать можно до 4 товаров', 'err');
    state.compare.push(it);
  }
  const box = document.getElementById('searchResults');
  if (box) box.replaceChildren(...[].concat(renderResults()));
  renderTray();
}

export function renderTray() {
  const tray = document.getElementById('compareTray');
  const n = state.compare.length;
  if (!n || state.page !== 'search') {
    tray.hidden = true;
    return;
  }
  tray.hidden = false;
  tray.replaceChildren(
    icon('scale'),
    el('b', `К сравнению: ${n}`),
    el('button.btn.btn-primary.btn-sm', { onclick: showCompare, disabled: n < 2 }, 'Сравнить'),
    el('button.btn.btn-ghost.btn-sm', { onclick: () => { state.compare = []; renderTray(); rerenderSearch(); } }, 'Очистить'));
  for (const n2 of tray.querySelectorAll('[data-icon]')) n2.style.width = n2.style.height = '18px';
}

function showCompare() {
  const items = state.compare;
  const prices = items.map((i) => i.price || Infinity);
  const minPrice = Math.min(...prices);
  const perfOf = (i) => (i.perf ? i.perf.score || i.perf.gaming : null);
  const perfs = items.map(perfOf).filter((v) => v != null);
  const maxPerf = perfs.length ? Math.max(...perfs) : null;
  const row = (label, fn) => el('tr', el('td', el('b', label)), items.map((i) => el('td', fn(i))));
  const table = el('table.tbl.compare-table',
    el('tbody',
      row('', (i) => thumb(i.image, CAT_ICON[i.category] || 'cpu')),
      row('Товар', (i) => el('a', { href: i.url, target: '_blank', rel: 'noopener' }, i.name)),
      row('Цена', (i) => el('b', { style: i.price === minPrice ? { color: 'var(--ok)' } : null }, i.price ? money.fmt(i.price) : '—')),
      row('Источник', (i) => (i.source === 'onliner' ? `Onliner, ${i.offers || 0} предл.` : `Kufar, ${i.condition || ''}`)),
      row('Производительность', (i) => {
        const p = perfOf(i);
        if (p == null) return '—';
        return el('span', { style: p === maxPerf ? { color: 'var(--ok)', fontWeight: 700 } : null }, String(p), i.perf.multi ? ` (многопоток ${i.perf.multi})` : '');
      }),
      row('Цена за 1 пункт', (i) => {
        const p = perfOf(i);
        return p && i.price ? money.fmt(i.price / p) : '—';
      }),
      row('Характеристики', (i) => el('div.small.muted', i.description || i.location || '—'))));
  modal('Сравнение товаров', el('div', { style: { overflowX: 'auto' } }, table));
}
