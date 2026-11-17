// Фильтры как на Onliner: интерфейс строится автоматически по описанию фильтров категории.
// Значение фильтров: { param: [ids] } — список, { param: {from, to} } — диапазон, { param: 1|0 } — да/нет.
import { el, icon, api, modal, closeModal, debounce, plural, money } from './util.js';

const cache = new Map();

export async function loadFacets(cat) {
  if (!cache.has(cat)) {
    cache.set(cat, api('/api/facets?cat=' + encodeURIComponent(cat)).catch((e) => {
      cache.delete(cat);
      throw e;
    }));
  }
  return cache.get(cat);
}

const kcache = new Map();

/** Фильтры Kufar для раздела; type — «параметр:значение» выбранного типа (у Kufar свои фильтры для каждого типа). */
export async function loadKufarFacets(cat, type) {
  const key = cat + '|' + (type || '');
  if (!kcache.has(key)) {
    const qs = new URLSearchParams({ cat });
    if (type) qs.set('type', type);
    kcache.set(key, api('/api/kufar/facets?' + qs).catch((e) => {
      kcache.delete(key);
      throw e;
    }));
  }
  return kcache.get(key);
}

export function countActive(v) {
  return Object.keys(v || {}).length;
}

function itemsOf(meta) {
  return meta ? meta.groups.flatMap((g) => g.items) : [];
}

const fmtNum = (n) => (Math.round(n * 1000) / 1000).toLocaleString('ru-RU');

/** Человекочитаемое описание фильтров: ["Производитель: ASUS, MSI", "Видеопамять: от 12 ГБ"]. */
export function summarize(meta, value) {
  const out = [];
  const byId = Object.fromEntries(itemsOf(meta).map((i) => [i.id, i]));
  for (const [k, v] of Object.entries(value || {})) {
    const it = byId[k];
    const name = it ? it.name : k;
    if (Array.isArray(v)) {
      const names = v.map((id) => (it && it.values ? (it.values.find((x) => x.id === id) || {}).name || id : id));
      out.push(`${name}: ${names.slice(0, 4).join(', ')}${names.length > 4 ? ` и ещё ${names.length - 4}` : ''}`);
    } else if (v && typeof v === 'object') {
      const label = (x) => {
        if (it && it.type === 'dictionary_range') return (it.values.find((y) => y.id === String(x)) || {}).name || x;
        const ratio = (it && it.ratio) || 1;
        const unit = it && it.unit ? ' ' + it.unit : k === 'price' ? ' р.' : '';
        return fmtNum(Number(x) / ratio) + unit;
      };
      const parts = [];
      if (v.from !== undefined) parts.push('от ' + label(v.from));
      if (v.to !== undefined) parts.push('до ' + label(v.to));
      out.push(`${name}: ${parts.join(' ')}`);
    } else {
      out.push(`${name}: ${v ? 'да' : 'нет'}`);
    }
  }
  return out;
}

/**
 * Панель фильтров. onChange(value) вызывается при каждом изменении.
 * opts.hide — параметры, которые не показывать; opts.compact — для боковой колонки.
 */
export function facetPanel(meta, value, onChange, opts = {}) {
  const val = JSON.parse(JSON.stringify(value || {}));
  const hide = new Set(opts.hide || []);
  const only = opts.only || {}; // { параметр: [разрешённые значения] } — для подбора
  const emit = () => onChange(JSON.parse(JSON.stringify(val)));
  const blocks = [];

  const setVal = (k, v) => {
    const empty = v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
    if (empty) delete val[k];
    else val[k] = v;
    // Зависимые списки (город зависит от региона): сбрасываем и перерисовываем
    for (const b of blocks) {
      if (b.dependsOn === k) {
        delete val[b.id];
        b.redraw();
      }
    }
    for (const b of blocks) b.refreshHead();
    emit();
  };

  const search = el('input.input.facet-search', {
    type: 'search', placeholder: 'Найти фильтр: например, «подсветка» или «Wi-Fi»',
    oninput: () => {
      const q = search.value.trim().toLowerCase();
      for (const b of blocks) b.node.hidden = !!q && !b.text.includes(q);
      for (const g of groupNodes) g.node.hidden = !!q && !g.blocks.some((b) => !b.node.hidden);
      if (q) for (const g of groupNodes) g.open(true);
    },
  });

  const groupNodes = [];
  for (const g of meta.groups) {
    const items = g.items.filter((it) => !hide.has(it.id)).map((it) => {
      if (!only[it.id] || !it.values) return it;
      // В подборе оставляем только значения, которые подходят для сборки ПК
      return { ...it, values: it.values.filter((v) => only[it.id].includes(v.id)), popular: (it.popular || []).filter((id) => only[it.id].includes(id)) };
    }).filter((it) => !it.values || it.values.length || it.dependsOn);
    if (!items.length) continue;
    const gBlocks = items.map((it) => facetBlock(it, val, setVal, opts));
    blocks.push(...gBlocks);
    const body = el('div.facet-group-body', gBlocks.map((b) => b.node));
    const hasActive = items.some((it) => val[it.id] !== undefined);
    // «Основные» и характеристики Kufar раскрыты сразу, остальное — по клику
    let isOpen = g.id === 'general' || g.id === 'specs' || hasActive || !!opts.allOpen;
    const toggle = el('button.facet-group-head', {
      type: 'button',
      onclick: () => open(!isOpen),
    }, el('span', g.title), el('span.dim.small', `${items.length} ${plural(items.length, 'фильтр', 'фильтра', 'фильтров')}`), icon('down'));
    const node = el('div.facet-group', toggle, body);
    function open(on) {
      isOpen = on;
      body.hidden = !on;
      node.classList.toggle('open', on);
    }
    open(isOpen);
    groupNodes.push({ node, blocks: gBlocks, open });
  }

  return el('div.facet-panel', { class: opts.compact ? 'compact' : '' }, search, groupNodes.map((g) => g.node));
}

function facetBlock(it, val, setVal, opts) {
  const resetBtn = el('button.link-btn', { type: 'button', onclick: () => { setVal(it.id, null); redraw(); } }, 'сбросить');
  const title = el('div.facet-title', el('span', it.name, it.unit ? el('span.dim', `, ${it.unit}`) : it.id === 'price' ? el('span.dim', ', р.') : null),
    it.description ? el('span.facet-info', { title: it.description }, icon('info')) : null);
  const head = el('div.facet-head', title, resetBtn);
  const body = el('div.facet-body');
  const node = el('div.facet', head, body);

  function refreshHead() {
    const on = val[it.id] !== undefined;
    resetBtn.hidden = !on;
    node.classList.toggle('active', on);
  }

  function redraw() {
    body.replaceChildren(render());
    refreshHead();
  }

  function render() {
    if (it.type === 'dictionary') return dictionary();
    if (it.type === 'dictionary_range') return dictRange();
    if (it.type === 'number_range') return numRange();
    if (it.type === 'boolean') return boolean();
    return el('span');
  }

  // --- список значений с галочками
  let expanded = false;
  let filterText = '';
  function dictionary() {
    const selected = new Set(val[it.id] || []);
    const popular = it.popular || [];
    let values = it.values;
    if (it.dependsOn) {
      const parent = (val[it.dependsOn] || [])[0];
      values = parent && it.valuesBy ? it.valuesBy[parent] || [] : [];
      if (!values.length) return el('div.dim.small', parent ? 'Нет вариантов' : 'Сначала выберите регион');
    }
    const order = [
      ...values.filter((v) => selected.has(v.id)),
      ...popular.map((id) => values.find((v) => v.id === id)).filter((v) => v && !selected.has(v.id)),
      ...values.filter((v) => !selected.has(v.id) && !popular.includes(v.id)),
    ];
    const LIMIT = 8;
    let list = order;
    if (!expanded) list = order.slice(0, Math.max(LIMIT, selected.size));
    if (expanded && filterText) list = order.filter((v) => v.name.toLowerCase().includes(filterText));
    const box = el('div.facet-values', { class: expanded && order.length > 14 ? 'scroll' : '' }, list.map((v) => el('label.check', el('input', {
      type: 'checkbox', checked: selected.has(v.id),
      onchange: (e) => {
        if (it.single) {
          // Один вариант из списка (регион, состояние, тип)
          setVal(it.id, e.target.checked ? [v.id] : []);
          redraw();
          return;
        }
        const cur = new Set(val[it.id] || []);
        if (e.target.checked) cur.add(v.id);
        else cur.delete(v.id);
        setVal(it.id, [...cur]);
      },
    }), v.name)));
    const parts = [];
    if (expanded && order.length > 14) {
      const fi = el('input.input.facet-inner-search', {
        type: 'search', placeholder: 'Поиск по списку', value: filterText,
        oninput: (e) => {
          filterText = e.target.value.trim().toLowerCase();
          const pos = e.target.selectionStart;
          redraw();
          const again = body.querySelector('.facet-inner-search');
          if (again) {
            again.focus();
            again.setSelectionRange(pos, pos);
          }
        },
      });
      parts.push(fi);
    }
    parts.push(box);
    if (order.length > LIMIT) {
      parts.push(el('button.link-btn', {
        type: 'button', onclick: () => { expanded = !expanded; filterText = ''; redraw(); },
      }, expanded ? 'Свернуть' : `Показать все (${order.length})`));
    }
    return el('div', parts);
  }

  // --- диапазон по списку (например, объём памяти «от 16 ГБ до 64 ГБ»)
  function dictRange() {
    const cur = val[it.id] || {};
    const sel = (side, ph) => {
      const s = el('select.select', {
        onchange: (e) => {
          const next = { ...(val[it.id] || {}) };
          if (e.target.value) next[side] = e.target.value;
          else delete next[side];
          setVal(it.id, next);
        },
      }, el('option', { value: '' }, ph), it.values.map((v) => el('option', { value: v.id }, v.name)));
      s.value = cur[side] || '';
      return s;
    };
    return el('div.facet-range', sel('from', 'от'), el('span.dim', '—'), sel('to', 'до'));
  }

  // --- числовой диапазон
  function numRange() {
    const cur = val[it.id] || {};
    const ratio = it.ratio || 1;
    const ph = it.placeholder || {};
    const input = (side) => el('input.input', {
      type: 'number', step: 'any', min: '0',
      placeholder: (side === 'from' ? 'от' : 'до') + (ph[side] !== undefined ? ' ' + fmtNum(ph[side] / ratio) : ''),
      value: cur[side] !== undefined ? String(Number(cur[side]) / ratio) : '',
      onchange: (e) => {
        const next = { ...(val[it.id] || {}) };
        const n = parseFloat(String(e.target.value).replace(',', '.'));
        if (isNaN(n)) delete next[side];
        else next[side] = Math.round(n * ratio * 1000) / 1000;
        setVal(it.id, next);
      },
    });
    const parts = [el('div.facet-range', input('from'), el('span.dim', '—'), input('to'))];
    if (it.ranges && it.ranges.length) {
      parts.push(el('div.facet-presets', it.ranges.map((r) => el('button.chip', {
        type: 'button',
        onclick: () => {
          const next = {};
          if (r.from !== '') next.from = Number(r.from);
          if (r.to !== '') next.to = Number(r.to);
          setVal(it.id, next);
          redraw();
        },
      }, r.name))));
    }
    if (it.id === 'price' && money.currency !== 'BYN') parts.push(el('div.dim.small', 'Цена в белорусских рублях'));
    return el('div', parts);
  }

  // --- да / нет
  function boolean() {
    const cur = val[it.id];
    if (it.boolType === 'yesno') {
      const seg = el('div.seg.seg-sm', [[undefined, 'Неважно'], [1, 'Да'], [0, 'Нет']].map(([v, label]) => el('button', {
        type: 'button', class: cur === v ? 'on' : '',
        onclick: () => { setVal(it.id, v); redraw(); },
      }, label)));
      return seg;
    }
    return el('label.check', el('input', { type: 'checkbox', checked: cur === 1, onchange: (e) => setVal(it.id, e.target.checked ? 1 : null) }), 'Да');
  }

  body.append(render());
  refreshHead();
  return { node, refreshHead, redraw, id: it.id, dependsOn: it.dependsOn, text: (it.name + ' ' + (it.description || '')).toLowerCase() };
}

/** Живой счётчик подходящих товаров в наличии (Onliner) или объявлений (Kufar). */
export function liveCount(cat, source = 'onliner', extra = {}) {
  const box = el('div.facet-count', el('span.dim', 'Считаем…'));
  let seq = 0;
  const update = debounce(async (value) => {
    const my = ++seq;
    box.replaceChildren(el('span.dim', 'Считаем…'));
    try {
      const qs = new URLSearchParams({ cat, f: JSON.stringify(value || {}), ...extra });
      const r = await api((source === 'kufar' ? '/api/kufar/count?' : '/api/count?') + qs);
      if (my !== seq) return;
      if (source === 'kufar') {
        box.replaceChildren(el('b', { class: r.total ? '' : 'err-text' }, r.total ? `${r.total.toLocaleString('ru-RU')} ${plural(r.total, 'объявление', 'объявления', 'объявлений')}` : 'Объявлений нет'));
        return;
      }
      box.replaceChildren(
        el('b', { class: r.total ? '' : 'err-text' }, r.total ? `${r.total.toLocaleString('ru-RU')} ${plural(r.total, 'товар', 'товара', 'товаров')} в наличии` : 'Ничего нет в наличии'),
        r.total && r.min ? el('span.dim', ` · от ${money.fmt(r.min)}`) : null);
    } catch {
      if (my === seq) box.replaceChildren(el('span.dim', 'Не удалось посчитать'));
    }
  }, 400);
  return { node: box, update };
}

/** Окно фильтров для одной категории. Возвращает Promise<новое значение | null при отмене>. */
export async function openFacetModal(cat, title, value, opts = {}) {
  const loading = el('div.row', el('div.spinner', { style: { width: '20px', height: '20px', borderWidth: '2px' } }), el('span.muted', 'Загружаем фильтры Onliner…'));
  modal(`Фильтры: ${title}`, loading);
  let meta;
  try {
    meta = await loadFacets(cat);
  } catch (e) {
    loading.replaceWith(el('div.notice.err', icon('error'), el('div', e.message)));
    return null;
  }
  return new Promise((resolve) => {
    let current = JSON.parse(JSON.stringify(value || {}));
    const counter = liveCount(cat);
    counter.update(current);
    const host = el('div');
    const draw = () => host.replaceChildren(facetPanel(meta, current, (v) => { current = v; counter.update(v); }, opts));
    draw();
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      closeModal();
      resolve(v);
    };
    const total = meta.groups.reduce((n, g) => n + g.items.filter((it) => !(opts.hide || []).includes(it.id)).length, 0);
    const body = el('div.facet-modal',
      el('p.muted.small', { style: { margin: '0 0 12px' } },
        `У Onliner для категории «${title}» свой набор фильтров: ${total} ${plural(total, 'фильтр', 'фильтра', 'фильтров')}. `,
        opts.intro || 'Подбор будет выбирать только из товаров, подходящих под эти фильтры.',
        opts.only ? ' Варианты, которые не годятся для сборки ПК (ноутбучная память, серверные сокеты и т. п.), здесь скрыты — они есть в «Поиске».' : ''),
      host,
      el('div.facet-modal-foot',
        counter.node,
        el('div.row',
          el('button.btn.btn-ghost', { type: 'button', onclick: () => { current = {}; counter.update(current); draw(); } }, 'Сбросить всё'),
          el('button.btn', { type: 'button', onclick: () => finish(null) }, 'Отмена'),
          el('button.btn.btn-primary', { type: 'button', onclick: () => finish(current) }, 'Применить'))));
    modal(`Фильтры: ${title}`, body);
    // Закрытие крестиком или Esc — как «Отмена»
    const back = document.getElementById('modalBack');
    const obs = new MutationObserver(() => {
      if (back.hidden) {
        obs.disconnect();
        finish(null);
      }
    });
    obs.observe(back, { attributes: true, attributeFilter: ['hidden'] });
  });
}
