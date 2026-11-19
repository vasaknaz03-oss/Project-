// Темы оформления: палитры и переключение.
import { el } from './util.js';

export const THEMES = [
  { id: 'iron', name: 'Iron Prince', text: 'Тёмная: золото и бронза', sw: 'linear-gradient(135deg, #1c1814 0 50%, #d9a24b 50% 75%, #a65a2c 75%)' },
  { id: 'iron-light', name: 'Iron Prince светлая', text: 'Бежевая, как визитка', sw: 'linear-gradient(135deg, #ece6de 0 50%, #a8722b 50% 75%, #24211d 75%)' },
  { id: 'neon', name: 'Неон', text: 'Маджента и бирюза', sw: 'linear-gradient(135deg, #120d2c 0 50%, #ff4fd8 50% 75%, #3ee8ff 75%)' },
  { id: 'emerald', name: 'Изумруд', text: 'Мята и лайм', sw: 'linear-gradient(135deg, #0f1d18 0 50%, #2ee59d 50% 75%, #a6f07a 75%)' },
  { id: 'ocean', name: 'Океан', text: 'Лазурь и аква', sw: 'linear-gradient(135deg, #0c1c2a 0 50%, #3aa8ff 50% 75%, #5ef0d6 75%)' },
  { id: 'dark', name: 'Классика', text: 'Фиолетовая тёмная', sw: 'linear-gradient(135deg, #141923 0 50%, #7c5cff 50% 75%, #22d3ee 75%)' },
  { id: 'light', name: 'Светлая', text: 'Белая', sw: 'linear-gradient(135deg, #ffffff 0 50%, #6a46ff 50% 75%, #0ea5c6 75%)' },
];

export function themeOf(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function applyTheme(id) {
  const t = themeOf(id);
  document.documentElement.dataset.theme = t.id;
  for (const b of document.querySelectorAll('[data-theme-id]')) b.classList.toggle('on', b.dataset.themeId === t.id);
}

/** Кружки выбора темы (боковая панель). */
export function themeDots(current, onPick) {
  return THEMES.map((t) => el('button.theme-dot', {
    type: 'button', title: `${t.name} — ${t.text}`, 'data-theme-id': t.id, class: t.id === current ? 'on' : '',
    style: { background: t.sw }, onclick: () => onPick(t.id),
  }));
}

/** Карточки выбора темы (страница «Настройки»). */
export function themeCards(current, onPick) {
  return el('div.theme-cards', THEMES.map((t) => el('button.theme-card', {
    type: 'button', 'data-theme-id': t.id, class: t.id === current ? 'on' : '', onclick: () => onPick(t.id),
  }, el('div.sw', { style: { background: t.sw } }), el('b', t.name), el('span.dim.small', t.text))));
}
