// Общие помощники интерфейса: DOM, иконки, API, форматирование, уведомления, модальное окно.

const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS = {
  wand: P('<path d="m15 4 5 5L9 20H4v-5z"/><path d="m13 6 5 5"/><path d="M5 3v4M3 5h4M19 15v4M17 17h4"/>'),
  search: P('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  bookmark: P('<path d="M6 3h12v18l-6-4-6 4z"/>'),
  gear: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  moon: P('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  x: P('<path d="M18 6 6 18M6 6l12 12"/>'),
  cpu: P('<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>'),
  gpu: P('<rect x="2" y="6" width="20" height="11" rx="2"/><circle cx="8.5" cy="11.5" r="2.5"/><circle cx="15.5" cy="11.5" r="2.5"/><path d="M5 17v3M9 17v2M13 17v2"/>'),
  board: P('<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="6" height="6" rx="1"/><path d="M16 7v10M7 17h5M16 3v2M3 16h2"/>'),
  ram: P('<path d="M3 7h18v9H3z"/><path d="M6 10v3M10 10v3M14 10v3M18 10v3M5 16v3M9 16v2M15 16v2M19 16v3"/>'),
  ssd: P('<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 12h6M17 11v2"/>'),
  hdd: P('<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="4"/><path d="m12 10 3.5 6"/><circle cx="8" cy="18" r=".5"/>'),
  psu: P('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="10" cy="12" r="4"/><path d="M10 8v8M6 12h8M17 9v6"/>'),
  case: P('<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="15" r="3"/><path d="M9 6h6M9 9h6"/>'),
  fan: P('<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 2 4l-4 4M14 12c4 0 7 1 7 4 0 2-2 3-4 2l-4-4M12 14c0 4-1 7-4 7-2 0-3-2-2-4l4-4M10 12c-4 0-7-1-7-4 0-2 2-3 4-2l4 4"/>'),
  gamepad: P('<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6L2 15a3 3 0 0 0 5.2 2.2L9 15h6l1.8 2.2A3 3 0 0 0 22 15l-.7-6.4a4 4 0 0 0-4-3.6z"/>'),
  layers: P('<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>'),
  film: P('<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 8h5M2 13h5M2 18h5M17 8h5M17 13h5M17 18h5"/>'),
  book: P('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'),
  external: P('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  store: P('<path d="M3 9 5 3h14l2 6M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>'),
  swap: P('<path d="M7 16V4M7 4 3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4"/>'),
  recycle: P('<path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7L7 9.5M11 19h8.2a1.8 1.8 0 0 0 1.6-2.7l-1.2-2.1M14 16l-3 3 3 3M8.3 13.6 7 9.5 2.9 10.7M9.3 5.7l1.1-1.9a1.8 1.8 0 0 1 3.2 0l3.9 6.8M13.4 10.6l3.9 1.2 1.1-4.1"/>'),
  check: P('<path d="M20 6 9 17l-5-5"/>'),
  alert: P('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'),
  info: P('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  error: P('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>'),
  copy: P('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  save: P('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
  download: P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  trash: P('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  refresh: P('<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/>'),
  scale: P('<path d="M12 3v18M5 21h14M3 8h18M7 8l-4 7a4 4 0 0 0 8 0zM17 8l-4 7a4 4 0 0 0 8 0z"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  down: P('<path d="m6 9 6 6 6-6"/>'),
  sparkles: P('<path d="M12 3 13.9 8.1 19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 3v4M17 5h4M5 17v4M3 19h4"/>'),
  open: P('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
};

/** Создание DOM-узла: el('div.card#id', {attrs}, ...children). Текст вставляется безопасно. */
export function el(sel, attrs, ...children) {
  const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const node = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) {
    for (const part of m[2].match(/[.#][\w-]+/g)) {
      if (part[0] === '.') node.classList.add(part.slice(1));
      else node.id = part.slice(1);
    }
  }
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    children.unshift(attrs);
    attrs = null;
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'class') node.className += (node.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'icon') node.append(icon(v));
    else if (k in node && k !== 'list' && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(node, c);
    else node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Иконка (SVG из встроенного набора — доверенный HTML). */
export function icon(name, cls) {
  const span = document.createElement('span');
  span.setAttribute('data-icon', name);
  if (cls) span.className = cls;
  span.innerHTML = ICONS[name] || '';
  return span;
}

export function hydrateIcons(root = document) {
  for (const n of root.querySelectorAll('[data-icon]')) if (!n.innerHTML) n.innerHTML = ICONS[n.dataset.icon] || '';
}

export async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: {} };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers['Content-Type'] = 'application/json';
  }
  let res;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error('Приложение не отвечает. Перезапустите его.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
  return data;
}

// ---------- деньги ----------
const SYMBOL = { BYN: 'р.', USD: '$', EUR: '€', RUB: '₽', PLN: 'zł', CNY: '¥', UAH: '₴', KZT: '₸', GBP: '£' };
const PREFIX = new Set(['USD', 'EUR', 'GBP']);

export const money = {
  rates: { BYN: 1 },
  currency: 'BYN',
  /** Перевод из BYN в валюту. */
  toCur(byn, cur = this.currency) {
    const r = this.rates[cur] || 1;
    return byn / r;
  },
  fromCur(v, cur = this.currency) {
    return v * (this.rates[cur] || 1);
  },
  /** Строка цены из суммы в BYN. */
  fmt(byn, cur = this.currency, opts = {}) {
    if (byn == null || isNaN(byn)) return '—';
    const v = this.toCur(byn, cur);
    const digits = opts.round || cur === 'RUB' || cur === 'KZT' || v >= 1000 ? 0 : 2;
    const s = v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    const sym = SYMBOL[cur] || cur;
    return PREFIX.has(cur) ? `${sym}${s}` : `${s} ${sym}`;
  },
  /** Основная валюта + BYN мелким шрифтом, если валюта не BYN. */
  both(byn) {
    if (this.currency === 'BYN') return { main: this.fmt(byn), sub: null };
    return { main: this.fmt(byn), sub: this.fmt(byn, 'BYN') };
  },
  symbol(cur = this.currency) {
    return SYMBOL[cur] || cur;
  },
};

// ---------- уведомления и окна ----------
export function toast(text, kind = '') {
  const t = el('div.toast', { class: kind }, text);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), kind === 'err' ? 6000 : 3200);
}

export function modal(title, body, { narrow = false } = {}) {
  const back = document.getElementById('modalBack');
  document.getElementById('modalTitle').textContent = title;
  const b = document.getElementById('modalBody');
  b.replaceChildren(body);
  back.querySelector('.modal').classList.toggle('narrow', narrow);
  back.hidden = false;
  return () => (back.hidden = true);
}

export function closeModal() {
  document.getElementById('modalBack').hidden = true;
}

/** Окно ввода строки. Возвращает Promise<string|null>. */
export function promptText(title, label, value = '') {
  return new Promise((resolve) => {
    const input = el('input.input', { value, style: { width: '100%' } });
    const done = (v) => {
      closeModal();
      resolve(v);
    };
    const form = el('form', { onsubmit: (e) => { e.preventDefault(); done(input.value.trim() || null); } },
      el('div.field', el('label', label), input),
      el('div.row', { style: { justifyContent: 'flex-end', marginTop: '16px' } },
        el('button.btn.btn-ghost', { type: 'button', onclick: () => done(null) }, 'Отмена'),
        el('button.btn.btn-primary', { type: 'submit' }, 'Сохранить')));
    modal(title, form, { narrow: true });
    setTimeout(() => input.select(), 30);
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = el('textarea', { style: { position: 'fixed', opacity: '0' } }, text);
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('Скопировано в буфер обмена');
}

export function download(name, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

export function thumb(src, fallbackIcon = 'cpu', cls = '') {
  if (!src) return el('div.thumb.ph', { class: cls }, icon(fallbackIcon));
  const img = el('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
  const box = el('div.thumb', { class: cls }, img);
  img.addEventListener('error', () => box.replaceWith(el('div.thumb.ph', { class: cls }, icon(fallbackIcon))));
  return box;
}

export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};
