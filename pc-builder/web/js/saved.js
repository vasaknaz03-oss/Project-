// Страница «Мои сборки».
import { el, icon, api, money, copyText, toast, promptText } from './util.js';
import { downloadBuildTable } from './buildExport.js';
import { state, SLOTS, saveBuilds, buildText, slim } from './state.js';
import { openSaved } from './build.js';

let root;

export function initSaved(container) {
  root = container;
  render();
}

export function rerenderSaved() {
  if (root) render();
}

function render() {
  const head = el('div.page-head', el('div', el('h1', 'Мои сборки'), el('p', 'Сохранённые подборки. Хранятся на этом компьютере.')));
  if (!state.builds.length) {
    root.replaceChildren(head, el('div.card.empty-state', icon('bookmark', 'big-ico'), el('h3', 'Пока пусто'),
      el('p.muted', 'Подберите сборку и нажмите «Сохранить» — она появится здесь.')));
    return;
  }
  root.replaceChildren(head, el('div.saved-grid', state.builds.map(card)));
}

function card(b) {
  const parts = SLOTS.map((s) => [s, b.parts[s.key]]).filter(([, it]) => it)
    .concat(window.Catalog.SETUP.map((x) => [x, (b.setup || {})[x.id]]).filter(([, it]) => it));
  return el('div.card.saved',
    el('div.saved-head',
      el('div', el('div.saved-name', b.name), el('div.dim.small', `${b.purposeLabel || ''} · ${new Date(b.date).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}`)),
      el('div.price', money.fmt(b.total))),
    b.refreshed ? el('div.dim.small', `Цены обновлены ${new Date(b.refreshed).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}`) : null,
    el('div.saved-parts', parts.map(([s, it]) => el('div', { title: it.missing ? 'Сейчас нет в наличии' : '' },
      el('span.dim', s.label + ': '), it.missing ? el('span', { style: { color: 'var(--err)' } }, '[нет в наличии] ') : null, it.name))),
    el('div.row.wrap',
      el('button.btn.btn-sm', { onclick: () => { openSaved(b); document.dispatchEvent(new CustomEvent('goto-page', { detail: 'build' })); } }, icon('open'), 'Открыть'),
      el('button.btn.btn-sm', { onclick: (e) => refresh(b, e.currentTarget) }, icon('refresh'), 'Обновить цены'),
      el('button.btn.btn-sm', { onclick: () => copyText(buildText(b.name, b.parts, b.total, '', b.setup)) }, icon('copy'), 'Копировать'),
      el('button.btn.btn-sm', { onclick: () => downloadBuildTable(b.name, b.parts, b.total, b.setup) }, icon('download'), 'Скачать таблицу'),
      el('button.btn.btn-sm.btn-ghost', {
        onclick: async () => {
          const name = await promptText('Переименовать', 'Название', b.name);
          if (!name) return;
          b.name = name;
          await saveBuilds();
          render();
        },
      }, 'Переименовать'),
      el('button.btn.btn-sm.btn-ghost', {
        title: 'Удалить',
        onclick: async () => {
          if (!confirm(`Удалить сборку «${b.name}»?`)) return;
          state.builds = state.builds.filter((x) => x !== b);
          await saveBuilds();
          render();
          toast('Сборка удалена');
        },
      }, icon('trash'))));
}

async function refresh(b, btn) {
  btn.disabled = true;
  try {
    const all = SLOTS.map((s) => b.parts[s.key]).concat(Object.values(b.setup || {}));
    const items = all.filter((it) => it && it.source === 'onliner').map((it) => ({ id: it.id, category: it.category }));
    const r = await api('/api/refresh', { method: 'POST', body: { items } });
    const before = b.total;
    let missing = 0;
    const update = (bag, key) => {
      const old = bag[key];
      const fresh = old && r.items[old.id];
      if (!fresh || fresh.error) return;
      if (fresh.price) bag[key] = { ...slim(fresh), perf: fresh.perf || old.perf, noname: old.noname };
      else {
        bag[key] = { ...old, missing: true };
        missing++;
      }
    };
    for (const s of SLOTS) update(b.parts, s.key);
    for (const id of Object.keys(b.setup || {})) update(b.setup, id);
    const sum = (bag) => Object.values(bag || {}).reduce((t, it) => t + (it ? it.price || 0 : 0), 0);
    b.total = sum(b.parts) + sum(b.setup);
    b.refreshed = new Date().toISOString();
    await saveBuilds();
    render();
    const d = b.total - before;
    toast(`Было ${money.fmt(before)}, стало ${money.fmt(b.total)}${Math.abs(d) >= 0.01 ? ` (${d > 0 ? '+' : '−'}${money.fmt(Math.abs(d))})` : ''}${missing ? `. Нет в наличии: ${missing}` : ''}`);
  } catch (e) {
    toast('Не удалось обновить цены: ' + e.message, 'err');
    btn.disabled = false;
  }
}
