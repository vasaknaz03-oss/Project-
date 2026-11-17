// Страница «Мои сборки».
import { el, icon, money, copyText, download, toast, promptText } from './util.js';
import { state, SLOTS, saveBuilds, buildText } from './state.js';
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
  const parts = SLOTS.map((s) => [s, b.parts[s.key]]).filter(([, it]) => it);
  return el('div.card.saved',
    el('div.saved-head',
      el('div', el('div.saved-name', b.name), el('div.dim.small', `${b.purposeLabel || ''} · ${new Date(b.date).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}`)),
      el('div.price', money.fmt(b.total))),
    el('div.saved-parts', parts.map(([s, it]) => el('div', el('span.dim', s.label + ': '), it.name))),
    el('div.row.wrap',
      el('button.btn.btn-sm', { onclick: () => { openSaved(b); document.dispatchEvent(new CustomEvent('goto-page', { detail: 'build' })); } }, icon('open'), 'Открыть'),
      el('button.btn.btn-sm', { onclick: () => copyText(buildText(b.name, b.parts, b.total)) }, icon('copy'), 'Копировать'),
      el('button.btn.btn-sm', { onclick: () => download(`${b.name}.txt`, buildText(b.name, b.parts, b.total)) }, icon('download'), '.txt'),
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
