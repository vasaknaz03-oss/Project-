// Анимации переключений: плавный переход между страницами (View Transitions), бегущий индикатор
// в боковом меню, пульс выбранной вкладки. Уважают системную настройку «уменьшить движение»
// и переключатель «Анимации» в настройках.
import { state } from './state.js';

const reduced = () => (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || (state.settings && state.settings.animations === false);

let lastIndex = 0;

/** Смена страницы с анимацией: вперёд по меню — сдвиг влево, назад — вправо. */
export function transition(update, index) {
  const dir = index >= lastIndex ? 'fwd' : 'back';
  lastIndex = index;
  if (reduced() || !document.startViewTransition) {
    update();
    return;
  }
  document.documentElement.dataset.vt = dir;
  const t = document.startViewTransition(() => update());
  t.finished.finally(() => delete document.documentElement.dataset.vt).catch(() => {});
}

/** Индикатор активного пункта меню, который «переезжает» к выбранной странице. */
export function navIndicator() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  let ind = nav.querySelector('.nav-ind');
  if (!ind) {
    ind = document.createElement('span');
    ind.className = 'nav-ind';
    nav.prepend(ind);
  }
  const act = nav.querySelector('.nav-item.active');
  if (!act) return;
  ind.style.transform = `translateY(${act.offsetTop}px)`;
  ind.style.height = act.offsetHeight + 'px';
  ind.style.opacity = '1';
  ind.style.setProperty('--nav-ind', getComputedStyle(act).getPropertyValue('--nav') || 'var(--accent)');
}

export function initMotion() {
  document.documentElement.classList.toggle('no-motion', reduced());
  window.addEventListener('resize', () => navIndicator());
}
