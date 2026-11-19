// Страница «Слежение»: цены товаров, сохранённые поиски Kufar, уведомления и работа в фоне.
import { el, icon, api, money, toast, thumb, plural } from './util.js';
import { state, saveSettings } from './state.js';
import { adChips, adLink, ago } from './kufarui.js';

let root = null;
let W = null; // ответ /api/watch
let appInfo = { desktop: false };
let lastUnread = null;
const keys = new Set(); // ключи товаров Onliner, за которыми следим

export async function initWatch(node) {
  root = node;
  try {
    appInfo = await api('/api/app');
  } catch {}
  await refreshWatch();
  setInterval(() => refreshWatch().catch(() => {}), 60 * 1000);
}

export async function refreshWatch() {
  W = await api('/api/watch');
  keys.clear();
  for (const it of W.items) keys.add(it.key);
  updateBadge();
  if (state.page === 'watch') render();
}

export const isWatched = (it) => !!it && keys.has(it.id);

function updateBadge() {
  const n = W ? W.unread : 0;
  const b = document.getElementById('watchCount');
  if (b) b.textContent = n ? String(n) : '';
  // В браузере системных уведомлений от программы нет — показываем всплывающее сообщение
  if (lastUnread !== null && n > lastUnread && W.events[0]) {
    const e = W.events[0];
    toast(`${e.title}. ${e.body || ''}`);
    if (!appInfo.desktop && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(e.title, { body: e.body || '' });
      } catch {}
    }
  }
  lastUnread = n;
}

/** Следить за ценой товара Onliner (кнопка в сборке и поиске). */
export async function toggleWatch(it, btn) {
  if (!it || it.source !== 'onliner') return;
  if (btn) btn.disabled = true;
  try {
    if (keys.has(it.id)) {
      await api('/api/watch/item?id=' + encodeURIComponent(it.id), { method: 'DELETE' });
      toast('Больше не следим за ценой');
    } else {
      const { id, category, name, url, image, price } = it;
      await api('/api/watch/item', { method: 'POST', body: { item: { id, category, name, url, image, price } } });
      toast(`Следим за ценой: «${name}». Сообщим, когда подешевеет.`);
    }
    await refreshWatch();
  } catch (e) {
    toast(e.message, 'err');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** Кнопка «Следить» для товара. */
export function watchButton(it, onChange) {
  if (!it || it.source !== 'onliner' || !it.price) return null;
  const on = isWatched(it);
  return el('button.btn.btn-sm.btn-ghost', {
    class: on ? 'on' : '',
    title: on ? 'Перестать следить за ценой' : 'Следить за ценой: уведомим, когда подешевеет',
    onclick: async (e) => { await toggleWatch(it, e.currentTarget); if (onChange) onChange(); },
  }, icon('bell'), on ? 'Следим' : 'Следить');
}

/** Сохранить поиск Kufar и получать уведомления о новых объявлениях. */
export async function saveKufarSearch(params) {
  const r = await api('/api/watch/search', { method: 'POST', body: params });
  await refreshWatch();
  toast(`Поиск «${r.search.name}» сохранён: сообщим о новых объявлениях.`);
  return r.search;
}

export function rerenderWatch() {
  if (root && W) render();
}

// ------------------------------------------------------------------ отрисовка

function render() {
  const st = W.settings;
  root.replaceChildren(
    el('div.page-head',
      el('div',
        el('h1', 'Слежение'),
        el('p', `Цены товаров проверяются каждые ${st.priceHours} ч, новые объявления Kufar — каждые ${st.adMinutes} мин.`
          + (appInfo.desktop ? ' Проверка идёт и в фоне, когда окно закрыто.' : ' В браузере — пока открыта программа.'))),
      el('div.row',
        W.lastRun ? el('span.dim.small', `Последняя проверка: ${new Date(W.lastRun.t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`) : null,
        el('button.btn.btn-primary', { onclick: checkNow }, icon('refresh'), 'Проверить сейчас'))),
    renderEvents(),
    el('div.layout-2',
      el('div', renderItems(), renderSearches()),
      el('div.side', renderSettings())));
}

async function checkNow(e) {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.lastChild.textContent = 'Проверяем…';
  try {
    const r = await api('/api/watch/check', { method: 'POST' });
    toast(r.errors && r.errors.length ? `Проверено: ${r.checked}. Ошибки: ${r.errors.slice(0, 2).join('; ')}` : `Проверено: ${r.checked}`);
  } catch (err) {
    toast(err.message, 'err');
  }
  await refreshWatch();
  render();
}

const EV_ICON = { price: 'trendUp', target: 'tag', ads: 'recycle', stock: 'store' };

function renderEvents() {
  const card = el('div.card.watch-events', el('div.card-head',
    el('h3', icon('bell'), ' Уведомления', W.unread ? el('span.count-pill', String(W.unread)) : null),
    W.events.length ? el('div.row',
      W.unread ? el('button.btn.btn-sm.btn-ghost', { onclick: async () => { await api('/api/watch/read', { method: 'POST', body: {} }); await refreshWatch(); render(); } }, icon('check'), 'Прочитано') : null,
      el('button.btn.btn-sm.btn-ghost', { onclick: async () => { await api('/api/watch/events', { method: 'DELETE' }); await refreshWatch(); render(); } }, icon('trash'), 'Очистить')) : null));
  if (!W.events.length) {
    card.append(el('p.muted', 'Пока пусто. Нажмите «Следить» у товара в сборке или в поиске, а в поиске по Kufar — «Следить за новыми объявлениями».'));
    return card;
  }
  card.append(el('div.event-list', W.events.slice(0, 30).map((e) => el('div.event', { class: e.read ? '' : 'unread' },
    el('div.event-ico', { class: 'ev-' + e.type }, icon(EV_ICON[e.type] || 'bell')),
    el('div.event-main',
      el('div.event-title', e.url ? el('a', { href: e.url, target: '_blank', rel: 'noopener' }, e.title) : e.title),
      e.body ? el('div.event-body', e.body) : null,
      e.ads && e.ads.length ? el('div.alt-list.compact', e.ads.slice(0, 5).map(adRow)) : null),
    el('div.event-time', ago(e.t) === 'сегодня' ? new Date(e.t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ago(e.t))))));
  return card;
}

function adRow(a) {
  return el('div.alt',
    thumb(a.image, 'recycle'),
    el('div', el('div.alt-name', adLink(a)), el('div.row.wrap.ad-chips', adChips(a))),
    el('div.alt-price', el('b', money.fmt(a.price))));
}

function sparkline(history) {
  const pts = (history || []).map((h) => h.p);
  if (pts.length < 2) return null;
  const w = 120;
  const h = 32;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * w},${h - 3 - ((p - min) / span) * (h - 6)}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('class', 'spark');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

function renderItems() {
  const card = el('div.card', el('h3', icon('trendUp'), ' Цены товаров', W.items.length ? el('span.dim', ` · ${W.items.length}`) : null));
  if (!W.items.length) {
    card.append(el('p.muted', 'Нажмите «Следить» у детали в сборке или у товара в поиске — программа будет проверять цену на Onliner и сообщит, когда она снизится или дойдёт до вашей цели.'));
    return card;
  }
  card.append(el('div.watch-list', W.items.map((it) => {
    const diff = it.lastPrice && it.priceAdded ? Math.round((it.lastPrice / it.priceAdded - 1) * 100) : 0;
    const target = el('input.input.target-input', {
      type: 'number', min: '0', step: '1', placeholder: 'цель, р.', value: it.target || '',
      title: 'Сообщить, когда цена станет не выше этой',
      onchange: async (e) => {
        try {
          await api('/api/watch/target', { method: 'POST', body: { id: it.id, target: e.target.value } });
          await refreshWatch();
          toast(e.target.value ? 'Цель сохранена' : 'Цель убрана');
        } catch (err) {
          toast(err.message, 'err');
        }
      },
    });
    return el('div.watch-row',
      thumb(it.image, 'cpu'),
      el('div.watch-name',
        el('a', { href: it.url, target: '_blank', rel: 'noopener' }, it.name),
        el('div.dim.small', `с ${new Date(it.addedAt).toLocaleDateString('ru-RU')} · было ${it.priceAdded ? money.fmt(it.priceAdded) : '—'} · минимум ${it.minPrice ? money.fmt(it.minPrice) : '—'}`)),
      sparkline(it.history),
      el('div.watch-price',
        el('b', it.outOfStock ? 'нет в наличии' : it.lastPrice ? money.fmt(it.lastPrice) : '—'),
        diff ? el('span.diff', { class: diff < 0 ? 'down' : 'up' }, `${diff > 0 ? '+' : ''}${diff}%`) : null),
      target,
      el('button.icon-btn', { title: 'Перестать следить', onclick: async () => { await api('/api/watch/item?id=' + encodeURIComponent(it.id), { method: 'DELETE' }); await refreshWatch(); render(); } }, icon('trash')));
  })));
  return card;
}

function renderSearches() {
  const card = el('div.card', el('h3', icon('recycle'), ' Поиски Kufar', W.searches.length ? el('span.dim', ` · ${W.searches.length}`) : null));
  if (!W.searches.length) {
    card.append(el('p.muted', 'Откройте «Поиск» → «Объявления · Kufar», задайте раздел, запрос и фильтры и нажмите «Следить за новыми объявлениями». Программа будет проверять Kufar и сообщать о новых объявлениях, отдельно отмечая выгодные.'));
    return card;
  }
  for (const s of W.searches) {
    const sec = s.cat ? window.Catalog.byId[s.cat] : null;
    const crit = [sec ? sec.name : 'все разделы', s.q ? `«${s.q}»` : null, s.priceMax ? `до ${money.fmt(s.priceMax)}` : null,
      s.cond === 'used' ? 'б/у' : s.cond === 'new' ? 'новое' : null, Object.keys(s.filters || {}).length ? `фильтров: ${Object.keys(s.filters).length}` : null].filter(Boolean).join(' · ');
    const open = { v: false };
    const list = el('div.alt-list.compact', { hidden: true }, (s.latest || []).map(adRow));
    card.append(el('div.search-row',
      el('div.row', { style: { justifyContent: 'space-between' } },
        el('div',
          el('b', s.name), s.newCount ? el('span.count-pill', `+${s.newCount}`) : null,
          el('div.dim.small', `${crit} · найдено ${(s.total || 0).toLocaleString('ru-RU')} · проверено ${ago(s.lastCheck)}`)),
        el('div.row',
          (s.latest || []).length ? el('button.btn.btn-sm', { onclick: (e) => { open.v = !open.v; list.hidden = !open.v; e.currentTarget.lastChild.textContent = open.v ? 'Скрыть' : 'Последние'; } }, icon('down'), 'Последние') : null,
          el('button.icon-btn', { title: 'Удалить поиск', onclick: async () => { await api('/api/watch/search?id=' + encodeURIComponent(s.id), { method: 'DELETE' }); await refreshWatch(); render(); } }, icon('trash')))),
      list));
  }
  return card;
}

function renderSettings() {
  const st = W.settings;
  const sel = (value, options, onchange) => el('select.select', { onchange: (e) => onchange(e.target.value) },
    options.map(([v, l]) => el('option', { value: String(v), selected: String(v) === String(value) }, l)));
  const set = async (patch) => {
    await saveSettings(patch);
    await refreshWatch();
    render();
  };
  const notifyOn = state.settings.notify !== false;
  const card = el('div.card',
    el('h3', icon('gear'), ' Настройки слежения'),
    el('div.field', el('label', 'Проверять цены товаров'),
      sel(st.priceHours, [[1, 'каждый час'], [3, 'каждые 3 часа'], [6, 'каждые 6 часов'], [12, 'два раза в день'], [24, 'раз в день']], (v) => set({ watchPriceHours: +v }))),
    el('div.field', el('label', 'Проверять новые объявления Kufar'),
      sel(st.adMinutes, [[15, 'каждые 15 минут'], [30, 'каждые 30 минут'], [60, 'каждый час'], [180, 'каждые 3 часа']], (v) => set({ watchAdMinutes: +v }))),
    el('label.check', el('input', { type: 'checkbox', checked: notifyOn, onchange: (e) => set({ notify: e.target.checked }) }), 'Показывать уведомления'));
  if (appInfo.desktop) {
    card.append(
      el('label.check', el('input', { type: 'checkbox', checked: state.settings.background !== false, onchange: (e) => set({ background: e.target.checked }) }),
        'Работать в фоне после закрытия окна', el('div.dim.small', 'Значок программы остаётся в трее (на Mac — в строке меню), слежение продолжается')),
      el('label.check', el('input', {
        type: 'checkbox', checked: !!appInfo.autostart,
        onchange: async (e) => { appInfo = await api('/api/app', { method: 'POST', body: { autostart: e.target.checked } }); toast(appInfo.autostart ? 'Программа будет запускаться вместе с системой (в фоне)' : 'Автозапуск выключен'); },
      }), 'Запускать вместе с системой', el('div.dim.small', 'Сразу в фоне, без окна')),
      el('button.btn.btn-sm', { onclick: () => api('/api/app', { method: 'POST', body: { testNotification: true } }) }, icon('bell'), 'Проверить уведомление'));
  } else {
    card.append(el('p.dim.small', 'Работа в фоне, автозапуск и системные уведомления доступны в программе для Windows и macOS. В браузере проверка идёт, пока открыта программа.'));
    if ('Notification' in window && Notification.permission === 'default') {
      card.append(el('button.btn.btn-sm', { onclick: () => Notification.requestPermission().then(() => render()) }, icon('bell'), 'Разрешить уведомления браузера'));
    }
  }
  return card;
}
