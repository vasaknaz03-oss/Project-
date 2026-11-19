// Магазины: таблица предложений (доставка, рассрочка), история цены и «где купить всё сразу».
import { el, icon, api, money, modal, plural } from './util.js';

function deliveryText(d) {
  if (!d) return '—';
  const part = (x, what) => (x ? `${what} ${x.text || ''}${Number.isFinite(x.days) ? `, ${x.days === 0 ? 'сегодня' : `${x.days} дн.`}` : ''}` : null);
  return [part(d.courier, 'курьер'), part(d.pickup, 'самовывоз')].filter(Boolean).join('; ') || '—';
}

/** Таблица предложений магазинов Onliner. */
export function offersTable(offers, limit = 15) {
  const min = offers.length ? offers[0].price : null;
  return el('div.tbl-wrap', el('table.tbl',
    el('thead', el('tr', el('th', 'Магазин'), el('th', 'Город'), el('th', 'Рейтинг'), el('th', 'Гарантия'), el('th', 'Доставка'), el('th', 'Рассрочка'), el('th.num', 'Цена'))),
    el('tbody', offers.slice(0, limit).map((o) => el('tr', { class: o.price === min ? 'best' : '' },
      el('td', o.shopUrl ? el('a', { href: o.shopUrl, target: '_blank', rel: 'noopener' }, o.shop) : o.shop),
      el('td', o.town || '—'),
      el('td', o.rating ? `★ ${o.rating} (${o.reviews})` : '—'),
      el('td', o.warranty ? `${o.warranty} мес.` : '—'),
      el('td.small', deliveryText(o.delivery)),
      el('td.small', o.installment || '—'),
      el('td.num', el('b', money.fmt(o.price))))))));
}

/** График цены: SVG-линия по точкам. */
function chart(items) {
  const pts = items.filter((x) => x.price);
  if (pts.length < 2) return el('div.muted.small', 'Истории цены пока мало.');
  const W = 560;
  const H = 150;
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  const min = Math.min(...pts.map((x) => x.price));
  const max = Math.max(...pts.map((x) => x.price));
  const span = max - min || 1;
  const x = (i) => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
  const y = (p) => pad.t + (1 - (p - min) / span) * (H - pad.t - pad.b);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'price-chart');
  const mk = (tag, attrs) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    svg.append(n);
    return n;
  };
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(' ');
  mk('path', { d: `${line} L${x(pts.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`, class: 'area' });
  mk('path', { d: line, class: 'line' });
  pts.forEach((p, i) => {
    const c = mk('circle', { cx: x(i), cy: y(p.price), r: 3, class: 'dot' });
    const t = document.createElementNS(ns, 'title');
    t.textContent = `${p.date}: ${money.fmt(p.price)}`;
    c.append(t);
  });
  const step = Math.max(1, Math.ceil(pts.length / 7));
  pts.forEach((p, i) => {
    if (i % step && i !== pts.length - 1) return;
    const t = mk('text', { x: x(i), y: H - 6, class: 'lbl', 'text-anchor': i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle' });
    t.textContent = p.date.length > 7 ? p.date.slice(5).split('-').reverse().join('.') : p.date.split('-').reverse().join('.');
  });
  return svg;
}

/** Блок «История цены» с выводом: сейчас дешевле или дороже обычного. */
export async function historyBlock(it) {
  const box = el('div.history-block', el('div.row', el('div.spinner', { style: { width: '20px', height: '20px', borderWidth: '2px' } }), el('span.muted', 'Загружаем историю цены…')));
  try {
    const [half, month] = await Promise.all([
      api(`/api/history?key=${encodeURIComponent(it.id)}&period=6m`),
      api(`/api/history?key=${encodeURIComponent(it.id)}&period=`).catch(() => null),
    ]);
    const cur = half.current || it.price;
    let verdict = null;
    if (cur && half.median) {
      const d = Math.round((cur / half.median - 1) * 100);
      if (d <= -5) verdict = el('div.notice.ok', icon('check'), el('div', el('b', 'Хорошее время покупать: '), `цена на ${-d}% ниже обычной за полгода (${money.fmt(half.median)}).`));
      else if (d >= 8) verdict = el('div.notice', icon('alert'), el('div', el('b', 'Сейчас дороже обычного '), `на ${d}% (обычно ${money.fmt(half.median)}). Если не срочно — можно подождать или включить «Следить».`));
      else verdict = el('div.notice', icon('info'), el('div', `Цена обычная для последних месяцев (медиана ${money.fmt(half.median)}).`));
    }
    let mode = 'half';
    const area = el('div', chart(half.items));
    const seg = el('div.seg.small-seg',
      el('button', { class: 'on', onclick: (e) => { mode = 'half'; setOn(e); area.replaceChildren(chart(half.items)); } }, '6 месяцев'),
      month ? el('button', { onclick: (e) => { mode = 'month'; setOn(e); area.replaceChildren(chart(month.items)); } }, '30 дней') : null);
    function setOn(e) {
      for (const b of seg.children) b.classList.toggle('on', b === e.currentTarget);
    }
    box.replaceChildren(
      el('div.row', { style: { justifyContent: 'space-between', alignItems: 'center' } },
        el('div.panel-title', `История цены: минимум ${half.min ? money.fmt(half.min) : '—'}, максимум ${half.max ? money.fmt(half.max) : '—'}`), seg),
      area, verdict);
    void mode;
  } catch (e) {
    box.replaceChildren(el('div.muted.small', 'Историю цены получить не удалось: ' + e.message));
  }
  return box;
}

/** Окно «Где купить всё сразу»: один магазин, два магазина или по частям. */
export async function openBuyPlan(parts) {
  const items = parts.filter((p) => p && p.source === 'onliner').map(({ id, source, name, price }) => ({ id, source, name, price }));
  const others = parts.filter((p) => p && p.source !== 'onliner');
  const body = el('div', el('div.row', el('div.spinner', { style: { width: '20px', height: '20px', borderWidth: '2px' } }), el('span.muted', `Собираем цены ${items.length} деталей во всех магазинах Onliner…`)));
  modal('Где купить всё сразу', body);
  try {
    const plan = await api('/api/shops/plan', { method: 'POST', body: { items } });
    const shopLink = (s) => (s.url ? el('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.shop) : s.shop);
    const extra = (s) => [s.town, s.rating ? `★ ${s.rating} (${s.reviews})` : null, s.installment, s.delivery && s.delivery.courier ? `курьер ${s.delivery.courier.text || ''}` : s.delivery && s.delivery.pickup ? `самовывоз ${s.delivery.pickup.text || ''}` : null].filter(Boolean).join(' · ');
    const diff = (t) => {
      const d = Math.round(t - plan.piecewise.total);
      return d > 0 ? el('span.diff.up', `+${money.fmt(d)}`) : el('span.diff.down', 'не дороже');
    };
    body.replaceChildren(el('div',
      el('p.muted', `Дешевле всего по частям: ${money.fmt(plan.piecewise.total)} — но это ${plan.piecewise.shops} ${plural(plan.piecewise.shops, 'магазин', 'магазина', 'магазинов')} и столько же доставок или поездок. Ниже — сколько стоит купить всё в одном или двух магазинах.`),
      el('div.panel-title', 'Всё в одном магазине'),
      plan.single.length ? el('div.plan-list', plan.single.map((s, i) => el('div.plan-row', { class: i === 0 ? 'best' : '' },
        el('div', el('b', shopLink(s)), el('div.dim.small', extra(s))),
        el('div.plan-price', el('b', money.fmt(s.total)), diff(s.total)))))
        : el('p.muted.small', plan.pairs.length ? 'Ни в одном магазине нет всех деталей сразу — смотрите варианты с двумя магазинами.' : 'Ни в одном магазине нет всех деталей сразу.'),
      !plan.single.length && plan.coverage && plan.coverage.length ? el('div', { style: { marginTop: '10px' } },
        el('div.panel-title', 'Больше всего деталей в одном месте'),
        el('div.plan-list', plan.coverage.map((s) => el('div.plan-row',
          el('div', el('b', shopLink(s)), el('div.dim.small', `${s.has} из ${plan.count} деталей · ${extra(s)}`),
            s.missing.length ? el('div.dim.small', `Докупить отдельно: ${s.missing.join(', ')}`) : null),
          el('div.plan-price', el('b', money.fmt(s.total)), el('span.dim.small', `за ${s.has} ${plural(s.has, 'деталь', 'детали', 'деталей')}`)))))) : null,
      plan.pairs.length ? el('div.panel-title', { style: { marginTop: '14px' } }, 'В двух магазинах') : null,
      plan.pairs.length ? el('div.plan-list', plan.pairs.map((p) => el('div.plan-row',
        el('div', el('b', shopLink(p.shops[0]), ' + ', shopLink(p.shops[1])), el('div.dim.small', p.shops.map((s) => s.town).filter(Boolean).join(' / '))),
        el('div.plan-price', el('b', money.fmt(p.total)), diff(p.total))))) : null,
      plan.missing.length ? el('p.dim.small', `Сейчас нет в продаже: ${plan.missing.join(', ')}.`) : null,
      others.length ? el('p.dim.small', `Не учтены (не из каталога Onliner): ${others.map((o) => o.name).join(', ')}.`) : null));
  } catch (e) {
    body.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message)));
  }
}
