// Страница «Поиск комплектующих»: Onliner (новые, цены магазинов) и Kufar (объявления).
import { el, icon, api, money, toast, modal, thumb, plural } from './util.js';
import { adChips, adLink, hideButton, isHidden, isViewed, hiddenToggle } from './kufarui.js';
import { isWatched, toggleWatch, saveKufarSearch } from './watch.js';
import { offersTable, historyBlock } from './shops.js';
import { state, CAT_TO_SLOT, CAT_ICON, specChips, shopLinks, linkFor } from './state.js';
import { replaceFromSearch, hasActiveBuild, takeKufarToBuild } from './build.js';
import { facetPanel, loadFacets, loadKufarFacets, countActive } from './facets.js';
import { reviewChip, loadReviews, openReviews } from './reviews.js';

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
    oninput: (e) => { S.q = e.target.value; S.noSmart = false; },
    onkeydown: (e) => e.key === 'Enter' && newSearch(),
  });
  const cat = el('select.select', { onchange: (e) => { S.cat = e.target.value; S.autoCat = false; S.smart = null; S.replaceSlot = null; run(true); } },
    el('option', { value: '' }, 'Все разделы'),
    Catalog.GROUPS.map((g) => el('optgroup', { label: g.name },
      Catalog.SECTIONS.filter((x) => x.group === g.id).map((x) => el('option', { value: x.id }, x.name)))));
  cat.value = S.cat;

  const sec = section();
  const src = el('div.seg', [['onliner', 'Новые · Onliner'], ['kufar', 'Объявления · Kufar'], ['wb', 'Wildberries']].map(([v, l]) => el('button', {
    type: 'button', class: S.src === v ? 'on' : '',
    disabled: v === 'onliner' && sec && !sec.onliner,
    title: v === 'onliner' && sec && !sec.onliner ? 'На Onliner нет такого раздела' : '',
    onclick: () => {
      S.src = v;
      // На Kufar по умолчанию — выгодные объявления, а не просто свежие или самые дешёвые
      if (v === 'kufar' && (S.sort === '' || S.sort === 'rating')) S.sort = 'value';
      if (v !== 'kufar' && S.sort === 'value') S.sort = 'rating';
      run(true);
    },
  }, l)));

  const cond = el('select.select', { onchange: (e) => { S.cond = e.target.value; run(true); } },
    [['', 'Любое состояние'], ['used', 'Только б/у'], ['new', 'Только новое']].map(([v, l]) => el('option', { value: v }, l)));
  cond.value = S.cond;

  // У Kufar нет сортировки «популярные» — сбрасываем на «новые»
  if (S.src === 'kufar' && S.sort === 'rating') S.sort = 'value';
  if (S.src !== 'kufar' && S.sort === 'value') S.sort = 'rating';
  const sort = el('select.select', { onchange: (e) => { S.sort = e.target.value; run(true); } },
    (S.src === 'kufar'
      ? [['value', 'Сначала выгодные'], ['', 'Сначала новые объявления'], ['price_asc', 'Сначала дешёвые'], ['price_desc', 'Сначала дорогие']]
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
      el('button.btn.btn-primary', { onclick: () => newSearch() }, 'Найти')),
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

/** Новый поиск по кнопке «Найти» / Enter: раздел, выбранный умным поиском прошлый раз, не мешает новому запросу. */
function newSearch() {
  if (S.autoCat && S.smart) {
    const key = fkey();
    for (const k of Object.keys(S.smart.filters || {})) if (S.filters[key]) delete S.filters[key][k];
    S.cat = '';
    S.autoCat = false;
    S.layoutKey = '';
  }
  S.smart = null;
  run(true);
}

/** «Искать как есть»: без разбора запроса на раздел и фильтры. */
function searchAsIs() {
  S.noSmart = true;
  newSearch();
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
  if (S.src === 'kufar' && !reset && S.next && S.sort !== 'value') params.set('cursor', S.next);
  if (S.noSmart) params.set('smart', '0');
  // Ответ на устаревший запрос (пользователь уже поменял раздел, источник или текст) не показываем
  const seq = (S.seq = (S.seq || 0) + 1);
  try {
    const r = await api('/api/search?' + params);
    if (seq !== S.seq) return;
    // Умный поиск понял раздел и характеристики — показываем их как обычные фильтры раздела
    if (r.smart && reset) {
      const wasCat = S.cat;
      S.cat = r.smart.section;
      S.autoCat = S.autoCat || wasCat !== r.smart.section;
      const key = fkey();
      S.filters[key] = { ...(r.smart.filters || {}), ...(S.filters[key] || {}) };
      S.smart = r.smart;
      S.layoutKey = '';
      S.needFull = true;
    }
    S.items = reset ? r.items : S.items.concat(r.items);
    S.total = r.total;
    S.pages = r.pages;
    S.next = r.next || null;
    S.blocked = r.blocked ? r.url : null;
    S.index = r.index || null;
    // Kufar «выгодные»: пока программа просматривает все объявления, обновляем первую страницу
    clearTimeout(S.indexTimer);
    if (S.index && !S.index.ready && S.page === 1) S.indexTimer = setTimeout(() => { if (seq === S.seq && S.page === 1) run(true); }, 2500);
  } catch (e) {
    if (seq !== S.seq) return;
    S.error = e.message;
  } finally {
    if (seq === S.seq) S.loading = false;
  }
  if (seq === S.seq) {
    // Раздел выбран умным поиском — перерисовываем и строку поиска, и колонку фильтров
    if (S.needFull) {
      S.needFull = false;
      render();
      return;
    }
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
          onclick: () => { S.cat = x.id; S.sort = x.onliner ? 'rating' : 'value'; run(true); },
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
  if (S.smart && S.smart.chips) {
    out.push(el('div.smart-line',
      icon('sparkles'),
      el('span', 'Понял запрос:'),
      S.smart.chips.map((c) => el('span.chip.accent', c)),
      S.smart.rest ? el('span.dim', `+ ищу «${S.smart.rest}» в названии`) : null,
      el('button.link-btn', { onclick: searchAsIs, title: 'Искать по всем разделам без разбора запроса' }, 'Искать как есть')));
  }
  if (S.items.length) {
    out.push(el('div.dim.small', { style: { marginTop: '14px' } },
      S.src === 'kufar' && S.index ? indexLine(S.index)
        : S.src === 'kufar' ? `Найдено объявлений: ${S.total.toLocaleString('ru-RU')} · показано ${S.items.length}${S.next ? ' — ниже кнопка «Показать ещё»' : ''}` : S.cat ? `Товаров в разделе: ${S.total.toLocaleString('ru-RU')}` : 'Результаты каталога Onliner: компьютеры, периферия, мониторы и всё для сетапа'));
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
    const tip = S.src === 'onliner' ? noviceTip(shown) : null;
    if (tip) out.push(tip);
    out.push(el('div.grid', shown.map(card)));
  } else if (!S.loading && !S.error) {
    out.push(el('div.card.empty-state', { style: { marginTop: '16px' } }, el('h3', 'Ничего не нашлось'), el('p.muted', 'Попробуйте короче: например, «4060» вместо полного названия.')));
  }
  if (S.loading) {
    out.push(el('div.grid', Array.from({ length: S.items.length ? 4 : 8 }, () => el('div.pcard', el('div.skeleton', { style: { height: '140px' } }), el('div.skeleton', { style: { height: '14px' } }), el('div.skeleton', { style: { height: '14px', width: '60%' } })))));
  } else if ((S.src === 'onliner' || (S.src === 'kufar' && S.index)) && S.page < S.pages && S.items.length) {
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
      isOnliner ? el('span.chip', it.categoryName) : null,
      isOnliner ? reviewChip(it) : it.source === 'wb' ? (it.reviews ? el('span.chip', `★ ${it.rating} · ${it.reviews}`) : null) : el('span.chip', it.condition || 'объявление'),
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

/** Строка о полном просмотре Kufar: прогресс или «выгодные по всем N объявлениям». */
function indexLine(ix) {
  if (!ix.ready) {
    const pct = ix.total ? Math.min(100, Math.round((ix.progress / ix.total) * 100)) : 0;
    return el('div.index-line',
      el('span', `Просматриваем все объявления, чтобы найти самые выгодные: ${ix.progress.toLocaleString('ru-RU')} из ${(ix.total || 0).toLocaleString('ru-RU')}…`),
      el('div.index-bar', el('i', { style: { width: pct + '%' } })),
      el('span.dim', 'Первый раз это занимает до минуты, дальше — мгновенно: программа дочитывает только новые объявления.'));
  }
  const t = ix.updatedAt ? new Date(ix.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
  return el('span', `Сначала выгодные — по всем ${ix.scanned.toLocaleString('ru-RU')} объявлениям${t ? ` (обновлено в ${t})` : ''}. `,
    el('span.dim', 'Устаревшее, «куплю», бронь, нерабочее и подозрительно дешёвое — в конце списка.'));
}

// ------------------------------------------------------------------ подсказка новичку

const perfOfItem = (i) => (i.perf ? i.perf.score || i.perf.gaming : null);

/**
 * «Что выбрать на этой странице»: лучшее соотношение цена/производительность, лучшие отзывы
 * и самый доступный вариант без жалоб. Считается по уже загруженным товарам, без лишних запросов.
 */
function noviceTip(items) {
  const avail = items.filter((i) => i.source === 'onliner' && i.price > 0);
  if (avail.length < 4) return null;
  const rows = [];
  const used = new Set();
  const add = (label, it, why) => {
    if (!it) return;
    rows.push(el('div.tip-row', el('b', label), el('a', { href: it.url, target: '_blank', rel: 'noopener' }, it.name),
      el('span.dim', `— ${money.fmt(it.price)}${why ? ', ' + why : ''}`), reviewChip(it)));
    used.add(it.id);
  };
  const withPerf = avail.filter((i) => perfOfItem(i));
  if (withPerf.length >= 3) {
    const best = withPerf.slice().sort((a, b) => perfOfItem(b) / b.price - perfOfItem(a) / a.price)
      .find((i) => !(i.reviews >= 3 && i.rating < 4));
    add('Больше всего мощности за деньги:', best, best && `${money.fmt(best.price / perfOfItem(best))} за 1 пункт производительности`);
  }
  // Оценка с поправкой на число отзывов: 5.0 по одному отзыву не лучше 4.8 по сорока
  const trust = (i) => (i.rating * i.reviews + 4 * 5) / (i.reviews + 5);
  const rated = avail.filter((i) => i.reviews >= 5 && i.rating >= 4.5).sort((a, b) => trust(b) - trust(a));
  add('Покупатели довольны больше всего:', rated.find((i) => !used.has(i.id)), null);
  // «Недорого» — но не устаревшее: по цене за производительность не хуже 75% от лучшего на странице
  const bestValue = withPerf.length ? Math.max(...withPerf.map((i) => perfOfItem(i) / i.price)) : 0;
  const decent = (i) => !bestValue || !perfOfItem(i) || perfOfItem(i) / i.price >= bestValue * 0.75;
  const cheapGood = avail.filter((i) => i.reviews >= 3 && i.rating >= 4.3 && !used.has(i.id) && decent(i)).sort((a, b) => a.price - b.price)[0];
  add('Недорого и с хорошими отзывами:', cheapGood, null);
  if (!rows.length) return null;
  return el('div.card.novice-tip',
    el('div.row', icon('sparkles'), el('b', 'Подсказка: на что обратить внимание на этой странице')),
    rows,
    el('div.dim.small', 'Нажмите на звёзды у товара — откроются отзывы покупателей с выводом: что хвалят и на что жалуются.'));
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

/** Короткое имя для вывода: без кода модели производителя в конце («GV-N507TGAMING OC-16GD»). */
function shortItemName(i) {
  const words = String(i.name || '').split(/\s+/);
  while (words.length > 3) {
    const w = words[words.length - 1];
    if ((/\d/.test(w) && /-/.test(w)) || /^[A-Z0-9]{7,}$/.test(w) || /^\(.*\)$/.test(w)) words.pop();
    else break;
  }
  const n = words.join(' ');
  return n.length > 52 ? n.slice(0, 50) + '…' : n;
}

/** Простой вывод по сравнению: какой товар в чём лучше — и честно, когда разницы нет. */
function compareVerdict(items, revs) {
  const out = [];
  const name = shortItemName;
  const priced = items.filter((i) => i.price);
  const cheap = priced.length >= 2 ? priced.reduce((a, b) => (a.price <= b.price ? a : b)) : null;
  const dear = priced.length >= 2 ? priced.reduce((a, b) => (a.price >= b.price ? a : b)) : null;
  if (cheap && dear && dear.price > cheap.price) out.push(`Дешевле всех — ${name(cheap)} (на ${money.fmt(dear.price - cheap.price)} дешевле самого дорогого).`);
  const pf = priced.filter((i) => perfOfItem(i));
  let pick = null;
  let pickWhy = '';
  if (pf.length >= 2) {
    const fast = pf.reduce((a, b) => (perfOfItem(a) >= perfOfItem(b) ? a : b));
    const slow = pf.reduce((a, b) => (perfOfItem(a) <= perfOfItem(b) ? a : b));
    const gain = Math.round((perfOfItem(fast) / perfOfItem(slow) - 1) * 100);
    if (gain < 3) {
      out.push('Производительность практически одинаковая — это один и тот же чип, разница только в охлаждении, размерах, шуме и цене.');
    } else {
      const extra = Math.round((fast.price / slow.price - 1) * 100);
      out.push(`Самый быстрый — ${name(fast)}: на ${gain}% быстрее, чем ${name(slow)}, при цене ${extra >= 0 ? `+${extra}%` : `${extra}%`}.`);
      const value = pf.reduce((a, b) => (perfOfItem(a) / a.price >= perfOfItem(b) / b.price ? a : b));
      if (value !== fast) out.push(`Больше всего производительности за рубль — ${name(value)}.`);
      pick = value;
      pickWhy = 'лучшее соотношение цены и производительности';
    }
  }
  const rv = items.map((i, k) => ({ i, r: revs[k] })).filter((x) => x.r && x.r.total >= 3);
  let common = [];
  // Проблемные жалобы (брак, шум, писк, нагрев) важнее, чем «дорого»
  const SERIOUS = ['quality', 'coil', 'temp', 'quiet', 'software'];
  const serious = (x) => (x.r.summary.cons || []).filter((c) => SERIOUS.includes(c.id) && (c.count >= 2 || x.r.total <= 6));
  if (rv.length >= 2) {
    const ratings = rv.map((x) => x.r.rating);
    if (Math.max(...ratings) - Math.min(...ratings) < 0.2) out.push(`Отзывы у всех ${Math.min(...ratings) >= 4.5 ? 'отличные' : 'похожие'} (${Math.min(...ratings).toFixed(1)}–${Math.max(...ratings).toFixed(1)} из 5).`);
    else {
      const best = rv.reduce((a, b) => (a.r.rating >= b.r.rating ? a : b));
      out.push(`Лучшие отзывы — у ${name(best.i)} (${best.r.rating.toFixed(1)} из 5).`);
    }
    const ids = rv.map((x) => new Set((x.r.summary.cons || []).filter((c) => c.count >= 2 || x.r.total <= 6).map((c) => c.id)));
    common = [...ids[0]].filter((id) => ids.every((set) => set.has(id)));
    const texts = Object.fromEntries(rv.flatMap((x) => (x.r.summary.cons || []).map((c) => [c.id, c.text])));
    if (common.length) out.push(`Общая жалоба у всех: ${common.map((id) => texts[id]).join(', ')} — на выбор между ними не влияет.`);
    for (const x of rv) {
      const own = serious(x).filter((c) => !common.includes(c.id));
      if (own.length) out.push(`У ${name(x.i)} покупатели жалуются: ${own.slice(0, 2).map((c) => c.text).join(', ')}.`);
    }
  }
  // Совет: если по скорости разницы нет — самый дешёвый без серьёзных жалоб
  // (жалобы, общие для всех, на выбор не влияют)
  if (!pick && cheap) {
    const own = (i) => {
      const x = rv.find((y) => y.i === i);
      return x ? serious(x).filter((c) => !common.includes(c.id)) : [];
    };
    const okRating = (i) => {
      const x = rv.find((y) => y.i === i);
      return !x || x.r.rating >= 4.3;
    };
    const clean = priced.filter((i) => !own(i).length && okRating(i)).sort((a, b) => a.price - b.price);
    if (clean.length) {
      pick = clean[0];
      const others = [...new Set(priced.filter((i) => i !== pick).flatMap((i) => own(i).map((c) => c.text)))];
      pickWhy = pick === cheap
        ? 'дешевле остальных' + (others.length ? `, и без жалоб на ${others.join(', ')}` : ', и серьёзных жалоб нет')
        : `на ${money.fmt(pick.price - cheap.price)} дороже самого дешёвого, зато без жалоб на ${others.join(', ') || 'качество'}`;
    } else {
      pick = cheap;
      pickWhy = 'при одинаковой скорости разумно взять самый дешёвый, но почитайте жалобы в отзывах';
    }
  }
  if (pick && items.length >= 2) out.push(`Совет: ${name(pick)} — ${pickWhy}.`);
  if (!out.length) out.push('Добавьте товары одного раздела — тогда будет понятнее, что в чём лучше.');
  return out;
}

function showCompare() {
  const items = state.compare;
  const prices = items.map((i) => i.price || Infinity);
  const minPrice = Math.min(...prices);
  const perfOf = perfOfItem;
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
      row('Оценка покупателей', (i) => el('div.small', { 'data-rev': 'score', 'data-id': i.id }, i.source === 'onliner' ? (i.reviews ? '…' : 'отзывов нет') : '—')),
      row('Хвалят', (i) => el('div.small', { 'data-rev': 'pros', 'data-id': i.id }, i.source === 'onliner' && i.reviews ? '…' : '—')),
      row('Жалуются', (i) => el('div.small', { 'data-rev': 'cons', 'data-id': i.id }, i.source === 'onliner' && i.reviews ? '…' : '—')),
      row('Характеристики', (i) => el('div.small.muted', i.description || i.location || '—'))));
  const verdictBox = el('div.verdict.compare-verdict', { class: 'v-good' }, icon('sparkles'), el('div', el('b', 'Коротко: '), compareVerdict(items, []).join(' '), items.some((i) => i.source === 'onliner' && i.reviews) ? el('span.dim', ' Загружаем отзывы…') : null));
  modal('Сравнение товаров', el('div', verdictBox, el('div', { style: { overflowX: 'auto', marginTop: '12px' } }, table)));
  // Отзывы подгружаем отдельно — таблица видна сразу
  Promise.all(items.map((i) => (i.source === 'onliner' && i.reviews ? loadReviews(i).catch(() => null) : Promise.resolve(null)))).then((revs) => {
    items.forEach((i, k) => {
      const r = revs[k];
      const cell = (kind) => table.querySelector(`[data-rev="${kind}"][data-id="${CSS.escape(String(i.id))}"]`);
      if (!r) return;
      const sc = cell('score');
      if (sc) sc.replaceChildren(el('button.chip.rev-chip', { onclick: () => openReviews(i) }, `★ ${(r.rating || 0).toFixed(1)} · ${r.total} ${plural(r.total, 'отзыв', 'отзыва', 'отзывов')}`),
        r.summary.positive != null ? el('div.dim', `${r.summary.positive}% рекомендуют`) : null);
      const pr = cell('pros');
      if (pr) pr.replaceChildren(...(r.summary.pros.length ? r.summary.pros.slice(0, 4).map((p) => el('div', '+ ' + p.text)) : [el('span.dim', '—')]));
      const cn = cell('cons');
      if (cn) cn.replaceChildren(...(r.summary.cons.length ? r.summary.cons.slice(0, 4).map((p) => el('div', { style: { color: 'var(--warn)' } }, '− ' + p.text + (p.count > 1 ? ` (${p.count})` : ''))) : [el('span.dim', 'нет')]));
    });
    verdictBox.lastChild.replaceChildren(el('b', 'Коротко: '), compareVerdict(items, revs).join(' '));
  });
}
