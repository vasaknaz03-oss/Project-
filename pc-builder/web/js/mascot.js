// Персонаж-подсказчик «Байт»: маленький робот в короне (в стиле логотипа Iron Prince).
// Выезжает из угла экрана, когда что-то идёт не так или есть полезный совет, и уходит сам.
// Другие модули зовут его событием: document.dispatchEvent(new CustomEvent('mascot', { detail: { id, text, … } })).
import { el, icon } from './util.js';
import { state, saveSettings } from './state.js';

const SVG = `
<svg viewBox="0 0 120 150" class="byte-svg" aria-hidden="true">
  <defs>
    <linearGradient id="byteBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent-2, #f1c27b)"/><stop offset="1" stop-color="var(--accent, #d9a24b)"/></linearGradient>
    <linearGradient id="byteCrown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#e0a83a"/></linearGradient>
  </defs>
  <ellipse cx="60" cy="144" rx="30" ry="5" fill="rgba(0,0,0,.25)" class="byte-shadow"/>
  <g class="byte-all">
    <g class="byte-arm byte-arm-l"><rect x="10" y="84" width="16" height="34" rx="8" fill="url(#byteBody)"/></g>
    <g class="byte-arm byte-arm-r"><rect x="94" y="84" width="16" height="34" rx="8" fill="url(#byteBody)"/></g>
    <rect x="26" y="78" width="68" height="56" rx="22" fill="url(#byteBody)"/>
    <rect x="44" y="96" width="32" height="18" rx="6" fill="rgba(0,0,0,.18)"/>
    <text x="60" y="110" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="Inter, system-ui, sans-serif">IP</text>
    <rect x="18" y="26" width="84" height="56" rx="26" fill="#f6efe6" stroke="rgba(0,0,0,.12)" stroke-width="2"/>
    <rect x="28" y="38" width="64" height="32" rx="16" fill="#1b1714"/>
    <g class="byte-eyes">
      <ellipse cx="47" cy="54" rx="7" ry="8" fill="var(--accent-2, #f1c27b)"/>
      <ellipse cx="73" cy="54" rx="7" ry="8" fill="var(--accent-2, #f1c27b)"/>
      <circle cx="49" cy="51" r="2.2" fill="#fff"/><circle cx="75" cy="51" r="2.2" fill="#fff"/>
    </g>
    <circle cx="30" cy="74" r="4" fill="#ff9aa2" opacity=".55"/><circle cx="90" cy="74" r="4" fill="#ff9aa2" opacity=".55"/>
    <path class="byte-crown" d="M38 28 L42 8 L52 20 L60 4 L68 20 L78 8 L82 28 Z" fill="url(#byteCrown)" stroke="#c88a22" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="60" cy="9" r="2.5" fill="#fff6d6"/>
  </g>
</svg>`;

const queue = [];
const seenSession = new Set();
let current = null;
let node = null;
let hideTimer = null;
let lastShown = 0;

function enabled() {
  return state.settings.mascot !== false;
}

function build() {
  node = el('div.byte', { 'aria-live': 'polite' });
  node.innerHTML = SVG;
  const bubble = el('div.byte-bubble');
  node.prepend(bubble);
  node.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  node.addEventListener('mouseleave', () => scheduleHide(6000));
  document.body.append(node);
}

function scheduleHide(ms) {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hide, ms);
}

function hide() {
  if (!node || !current) return;
  node.classList.remove('show');
  current = null;
  setTimeout(next, 700);
}

function show(h) {
  if (!node) build();
  current = h;
  lastShown = Date.now();
  seenSession.add(h.id);
  if (h.once === 'forever') saveSettings({ mascotSeen: [...new Set([...(state.settings.mascotSeen || []), h.id])] }).catch(() => {});
  const bubble = node.querySelector('.byte-bubble');
  bubble.className = 'byte-bubble ' + (h.level || 'info');
  bubble.replaceChildren(
    el('button.byte-x', { type: 'button', title: 'Закрыть', onclick: hide }, icon('x')),
    h.title ? el('b.byte-title', h.title) : null,
    el('div.byte-text', h.text),
    el('div.byte-actions',
      h.action ? el('button.btn.btn-sm.btn-primary', { type: 'button', onclick: () => { hide(); h.action.fn(); } }, h.action.label) : null,
      el('button.btn.btn-sm', { type: 'button', onclick: hide }, 'Понятно'),
      el('button.link-btn.byte-off', { type: 'button', onclick: () => { saveSettings({ mascot: false }).catch(() => {}); hide(); } }, 'Не подсказывать')));
  node.dataset.corner = h.corner || 'br';
  node.dataset.level = h.level || 'info';
  // перезапуск анимации появления
  node.classList.remove('show');
  void node.offsetWidth;
  node.classList.add('show');
  scheduleHide(h.duration || 16000);
}

function next() {
  if (current || !queue.length) return;
  const wait = Math.max(0, 2500 - (Date.now() - lastShown));
  setTimeout(() => {
    if (current || !queue.length) return;
    show(queue.shift());
  }, wait);
}

/**
 * Подсказка. { id, title?, text, level: info|warn|error, action?: { label, fn }, once: 'session'|'forever', corner: br|bl }
 * Одна и та же подсказка не повторяется (в течение сеанса или навсегда).
 */
export function hint(h) {
  if (!h || !h.id || !h.text || !enabled()) return;
  if (seenSession.has(h.id) || queue.some((q) => q.id === h.id) || (current && current.id === h.id)) return;
  if (h.once === 'forever' && (state.settings.mascotSeen || []).includes(h.id)) return;
  if (h.level === 'error') queue.unshift(h);
  else queue.push(h);
  setTimeout(next, h.delay || 0);
}

const go = (page) => document.dispatchEvent(new CustomEvent('goto-page', { detail: page }));

/** Правила: на какие события персонаж реагирует. */
function rules() {
  document.addEventListener('mascot', (e) => hint(e.detail));

  document.addEventListener('page-shown', (e) => {
    const { page } = e.detail;
    if (page === 'oc') hint({ id: 'oc-first', once: 'forever', delay: 900, title: 'Разгон без риска', text: 'Начните с «Памятки для моей сборки»: я подставил вашу сборку и расписал шаги — где в BIOS что включать и какие значения безопасны.' });
    if (page === 'search') hint({ id: 'search-first', once: 'forever', delay: 900, text: 'Пишите как удобно: «ssd 512 gb», «бп 750w gold», «ddr5 32gb» — я сам пойму раздел и фильтры. На Kufar сначала показываю самые выгодные объявления.' });
    if (page === 'watch') hint({ id: 'watch-first', once: 'forever', delay: 900, text: 'Слежение сообщит о снижении цены и новых выгодных объявлениях. Подключите Telegram в «Настройках» — уведомления будут приходить на телефон.', action: { label: 'В настройки', fn: () => go('settings') } });
  });

  // Итоги подбора: проверка совместимости, одна планка памяти, слабый БП
  document.addEventListener('build-checked', (e) => {
    const { checks = [], parts = {}, custom } = e.detail || {};
    const err = checks.find((c) => c.level === 'error');
    if (err) {
      hint({ id: 'err:' + err.text.slice(0, 60), level: 'error', title: 'Так не заработает', text: err.text + ' Замените деталь кнопкой «Заменить» или в поиске.', corner: 'br' });
      return;
    }
    const ram = parts.ram && parts.ram.specs;
    if (ram && ram.modules === 1) hint({ id: 'ram-single', level: 'warn', text: 'Одна планка памяти — это одноканальный режим: до 10–20% FPS теряется. Лучше комплект из двух модулей.' });
    const psuWarn = checks.find((c) => c.level === 'warn' && /блок питания|БП/i.test(c.text));
    if (psuWarn) hint({ id: 'psu:' + psuWarn.text.slice(0, 40), level: 'warn', text: psuWarn.text });
    const coolWarn = checks.find((c) => c.level === 'warn' && /кулер|охлажд/i.test(c.text));
    if (coolWarn) hint({ id: 'cool:' + coolWarn.text.slice(0, 40), level: 'warn', text: coolWarn.text });
    if (custom) {
      const miss = ['cpu', 'motherboard', 'ram', 'ssd', 'psu', 'case'].filter((k) => !parts[k]);
      const names = { cpu: 'процессор', motherboard: 'материнская плата', ram: 'память', ssd: 'SSD', psu: 'блок питания', case: 'корпус' };
      if (miss.length && miss.length < 6) {
        hint({ id: 'custom-miss:' + miss.join(','), text: `Для работающего компьютера не хватает: ${miss.map((k) => names[k]).join(', ')}. Могу подобрать недостающее под бюджет.`, action: { label: 'Подобрать недостающее', fn: () => document.dispatchEvent(new CustomEvent('fill-missing')) } });
      }
    }
  });
}

export function initMascot() {
  rules();
  if (!state.settings.mascotWelcome) {
    saveSettings({ mascotWelcome: true }).catch(() => {});
    hint({ id: 'welcome', delay: 1500, title: 'Привет! Я Байт', text: 'Подскажу, если что-то пойдёт не так: несовместимые детали, слабый блок питания, подозрительные объявления. Начните с бюджета — и нажмите «Подобрать сборку».', duration: 14000 });
  }
}
