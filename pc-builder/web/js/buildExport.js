import { SLOTS } from './state.js';
import { download, money } from './util.js';

const ENCODE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ENCODE[char]);

function webLink(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function itemLink(item) {
  const url = webLink(item.url);
  const kufar = item.source === 'kufar' || item.fromKufar || /(^|\.)kufar\.by$/i.test(url?.hostname || '');
  if (kufar) {
    const id = String(item.id ?? '').match(/^(?:kufar-)?(\d{1,16})$/)?.[1]
      || (/^(?:www\.)?kufar\.by$/i.test(url?.hostname || '') ? url.pathname.match(/^\/item\/(\d{1,16})(?:\/|$)/)?.[1] : null);
    return id ? { href: `https://www.kufar.by/item/${id}`, label: 'Открыть объявление', source: 'Kufar' } : { source: 'Kufar' };
  }
  const link = url || webLink(item.shopUrl) || webLink(item.pricesUrl);
  const source = ({ onliner: 'Onliner', wb: 'Wildberries', owned: 'Уже есть', custom: 'Своя деталь' })[item.source] || link?.hostname || '—';
  return { href: link?.href, label: 'Открыть товар', source };
}

function priceOf(amount) {
  const { main, sub } = money.both(amount);
  return esc(main) + (sub ? ` <small>(${esc(sub)})</small>` : '');
}

function rows(slots, items, idKey) {
  return slots.map((slot) => {
    const item = items?.[slot[idKey]];
    if (!item) return '';
    const { href, source, label } = itemLink(item);
    return `<tr><th scope="row">${esc(slot.label)}</th><td>${esc(item.name)}</td>` +
      `<td class="price">${item.price > 0 ? priceOf(item.price) : '—'}</td><td>${esc(source)}</td>` +
      `<td>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : '—'}</td></tr>`;
  }).join('\n');
}

export function buildTable(title, parts, total, setup, setupSlots = window.Catalog.SETUP) {
  const name = esc(title || 'Сборка ПК');
  const accessories = rows(setupSlots, setup, 'id');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>${name} · ПодборПК</title>
<style>
body { font: 16px/1.5 system-ui, sans-serif; margin: 0; color: #202839; background: #f7f8fa; }
main { max-width: 72rem; margin: 2rem auto; padding: 0 1rem; }
h1 { margin: 0 0 .25rem; line-height: 1.2; overflow-wrap: anywhere; }
p { margin: 0 0 1.25rem; color: #46536d; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; background: #fff; }
th, td { padding: .75rem; border-bottom: 1px solid #d9e1ee; text-align: left; }
thead th, tfoot th, tfoot td, .section { background: #edf2f9; }
.price, a { white-space: nowrap; }
a { color: #174da6; }
tfoot { font-weight: bold; }
@media print { body, table { background: #fff; } main { margin: 0; } }
</style>
</head>
<body><main>
<h1>${name}</h1>
<p>ПодборПК · ${esc(new Date().toLocaleDateString('ru-RU'))}</p>
<div class="table-wrap"><table>
<thead><tr><th scope="col">Деталь</th><th scope="col">Модель</th><th scope="col">Цена</th><th scope="col">Источник</th><th scope="col">Ссылка</th></tr></thead>
<tbody>${rows(SLOTS, parts, 'key')}</tbody>
${accessories ? `<tbody><tr><th scope="rowgroup" colspan="5" class="section">Сетап</th></tr>${accessories}</tbody>` : ''}
<tfoot><tr><th scope="row" colspan="2">Итого</th><td class="price" colspan="3">${priceOf(total)}</td></tr></tfoot>
</table></div>
</main></body>
</html>`;
}

export function downloadBuildTable(title, parts, total, setup) {
  const filename = String(title || 'Сборка ПК').replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').trim().slice(0, 90);
  download(`ПодборПК — ${filename || 'Сборка'}.html`, buildTable(title, parts, total, setup), 'text/html;charset=utf-8');
}
