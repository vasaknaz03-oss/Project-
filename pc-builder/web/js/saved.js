// Страница «Мои сборки».
import { el, icon, api, money, copyText, toast, promptText } from './util.js';
import { downloadBuildTable } from './buildExport.js';
import { state, SLOTS, changeBuilds, buildText, slim, totalOf } from './state.js';
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
    b.edited ? el('div.dim.small', `Изменено ${new Date(b.edited).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}`) : null,
    b.refreshed ? el('div.dim.small', `Цены обновлены ${new Date(b.refreshed).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}`) : null,
    el('div.saved-parts', parts.map(([s, it]) => el('div', { title: it.missing ? 'Сейчас нет в наличии' : '' },
      el('span.dim', s.label + ': '), it.missing ? el('span', { style: { color: 'var(--err)' } }, '[нет в наличии] ') : null, it.name))),
    el('div.row.wrap',
      el('button.btn.btn-sm', { onclick: () => { if (openSaved(b)) document.dispatchEvent(new CustomEvent('goto-page', { detail: 'build' })); } }, icon('open'), 'Открыть'),
      el('button.btn.btn-sm', { onclick: (e) => refresh(b, e.currentTarget) }, icon('refresh'), 'Обновить цены'),
      el('button.btn.btn-sm', { onclick: () => copyText(buildText(b.name, b.parts, b.total, '', b.setup)) }, icon('copy'), 'Копировать'),
      el('button.btn.btn-sm', { onclick: () => downloadBuildTable(b.name, b.parts, b.total, b.setup) }, icon('download'), 'Скачать таблицу'),
      el('button.btn.btn-sm.btn-ghost', {
        onclick: async () => {
          const name = await promptText('Переименовать', 'Название', b.name);
          if (!name) return;
          try {
            await changeBuilds((builds) => builds.map((build) => build.id === b.id ? { ...build, name } : build));
            render();
          } catch (e) {
            toast('Не удалось переименовать: ' + e.message, 'err');
          }
        },
      }, 'Переименовать'),
      el('button.btn.btn-sm.btn-ghost', {
        title: 'Удалить',
        onclick: async () => {
          if (!confirm(`Удалить сборку «${b.name}»?`)) return;
          try {
            await changeBuilds((builds) => builds.filter((x) => x.id !== b.id));
            render();
            toast('Сборка удалена');
          } catch (e) {
            toast('Не удалось удалить: ' + e.message, 'err');
          }
        },
      }, icon('trash'))));
}

async function refresh(b, btn) {
  btn.disabled = true;
  try {
    const all = SLOTS.map((s) => b.parts[s.key]).concat(Object.values(b.setup || {}));
    const items = all.filter((it) => it && it.source === 'onliner').map((it) => ({ id: it.id, category: it.category }));
    const r = await api('/api/refresh', { method: 'POST', body: { items } });
    let before = b.total;
    let missing = 0;
    const freshened = (bag) => Object.fromEntries(Object.entries(bag || {}).map(([key, old]) => {
      const fresh = old?.source === 'onliner' ? r.items[old.id] : null;
      if (fresh && !fresh.error) {
        if (fresh.price) return [key, { ...slim(fresh), perf: fresh.perf || old.perf, noname: old.noname }];
        missing++;
        return [key, { ...old, missing: true }];
      }
      return [key, old];
    }));
    const list = await changeBuilds((builds) => builds.map((build) => {
      if (build.id !== b.id) return build;
      before = build.total;
      const parts = freshened(build.parts);
      const setup = freshened(build.setup);
      return { ...build, parts, setup, total: totalOf(parts) + totalOf(setup), refreshed: new Date().toISOString() };
    }));
    const refreshed = list.find((build) => build.id === b.id);
    render();
    if (!refreshed) return;
    const d = refreshed.total - before;
    toast(`Было ${money.fmt(before)}, стало ${money.fmt(refreshed.total)}${Math.abs(d) >= 0.01 ? ` (${d > 0 ? '+' : '−'}${money.fmt(Math.abs(d))})` : ''}${missing ? `. Нет в наличии: ${missing}` : ''}`);
  } catch (e) {
    toast('Не удалось обновить цены: ' + e.message, 'err');
    btn.disabled = false;
  }
}
