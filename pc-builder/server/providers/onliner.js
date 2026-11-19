'use strict';
// Каталог Onliner: публичный JSON API каталога и предложений магазинов.

const { getJSON, qs } = require('../http');
const { parseSpecs } = require('../parsers');
const perf = require('../perfdb');

const API = 'https://catalog.onliner.by/sdapi/catalog.api';
const SHOP_API = 'https://shop.api.onliner.by';

// Категории каталога Onliner, которые относятся к сборке ПК.
const CATEGORIES = {
  cpu: 'Процессоры',
  videocard: 'Видеокарты',
  motherboard: 'Материнские платы',
  dram: 'Оперативная память',
  ssd: 'SSD',
  hdd: 'Жёсткие диски',
  powersupply: 'Блоки питания',
  chassis: 'Корпуса',
  fan: 'Охлаждение',
};

function money(p) {
  return p && p.amount != null ? parseFloat(p.amount) : null;
}

function normalize(p) {
  const schema = (p.schema && p.schema.key) || '';
  const prices = p.prices || {};
  const item = {
    source: 'onliner',
    id: p.key,
    category: schema,
    categoryName: (p.schema && p.schema.name) || CATEGORIES[schema] || '',
    name: p.full_name || p.name,
    brand: (p.manufacturer && p.manufacturer.name) || '',
    description: p.description || '',
    image: (p.images && p.images.header) || null,
    url: p.html_url,
    pricesUrl: prices.html_url || (p.html_url ? p.html_url + '/prices' : null),
    usedUrl: p.second && p.second.offers_count ? p.second.html_url : null,
    usedCount: (p.second && p.second.offers_count) || 0,
    usedMin: p.second && p.second.min_price ? money(p.second.min_price) : null,
    price: money(prices.price_min),
    priceMax: money(prices.price_max),
    offers: (prices.offers && prices.offers.count) || 0,
    rating: p.reviews ? p.reviews.rating / 10 : 0,
    reviews: p.reviews ? p.reviews.count : 0,
    onSale: !!(p.sale && p.sale.is_on_sale),
    discount: (p.sale && p.sale.discount) || 0,
  };
  item.specs = parseSpecs(schema, item.description, item.name);
  enrich(item);
  return item;
}

/** Добавляет оценки производительности для процессоров и видеокарт. */
function enrich(item) {
  if (item.category === 'cpu') {
    const pf = perf.cpuPerf(item.name, item.specs);
    if (pf) item.perf = pf;
  } else if (item.category === 'videocard') {
    const key = perf.gpuKey(item.name);
    const pf = key ? perf.gpuPerf(key, item.specs.vramGb) : null;
    if (pf) item.perf = { key, ...pf };
  }
  return item;
}

/**
 * Одна страница категории. params — фильтры Onliner (price, socket_cpu, ...).
 * order: price:asc (только в наличии), rating:desc, price:desc.
 */
async function categoryPage(schema, params = {}, page = 1) {
  const url = `${API}/search/${schema}?${qs({ ...params, page })}`;
  const data = await getJSON(url);
  return {
    items: (data.products || []).map(normalize),
    total: data.total || 0,
    pages: (data.page && data.page.last) || 1,
  };
}

/** Несколько страниц категории параллельно. */
async function category(schema, params = {}, maxPages = 3) {
  const first = await categoryPage(schema, params, 1);
  const last = Math.min(first.pages, maxPages);
  const rest = [];
  for (let p = 2; p <= last; p++) rest.push(categoryPage(schema, params, p).catch(() => ({ items: [] })));
  const pages = await Promise.all(rest);
  const items = first.items.concat(...pages.map((x) => x.items));
  return { items, total: first.total };
}

/** Текстовый поиск по всему каталогу. */
async function search(query, page = 1, limit) {
  const url = `${API}/search/products?${qs({ query, page, limit })}`;
  const data = await getJSON(url, { ttl: 5 * 60 * 1000 });
  return {
    items: (data.products || []).map(normalize),
    total: data.total || 0,
    pages: (data.page && data.page.last) || 1,
  };
}

/** Актуальные данные одного товара (для обновления цен в сохранённых сборках). */
async function product(key, category) {
  const data = await getJSON(`https://catalog.api.onliner.by/products/${encodeURIComponent(key)}`, { ttl: 5 * 60 * 1000 });
  return normalize({ ...data, schema: data.schema || { key: category, name: CATEGORIES[category] || '' } });
}

/** Доставка из предложения магазина: курьер и самовывоз (стоимость и срок в днях). */
function deliveryOf(d) {
  if (!d) return null;
  const part = (x) => (x ? { text: x.price_text ? String(x.price_text).replace(/ƃ/g, 'р.') : null, days: Number.isFinite(x.time) ? x.time : null } : null);
  const out = { courier: part(d.courier), pickup: part(d.pickup_point) };
  return out.courier || out.pickup ? out : null;
}

/** История цены товара: period '' (месяц по дням), '6m' или '12m' (по месяцам). */
async function priceHistory(key, period = '6m') {
  const q = period ? `?period=${encodeURIComponent(period)}` : '';
  const data = await getJSON(`${API}/products/${encodeURIComponent(key)}/prices-history${q}`, { ttl: 60 * 60 * 1000 });
  const num = (m) => (m && m.amount ? parseFloat(m.amount) : null);
  const pr = data.prices || {};
  return {
    current: num(pr.current), min: num(pr.min), max: num(pr.max),
    median: num(data.sale && data.sale.min_prices_median),
    items: ((data.chart_data && data.chart_data.items) || []).map((x) => ({ date: x.date, price: x.price ? parseFloat(x.price) : null })),
  };
}

/** Предложения всех магазинов для товара (сравнение цен). */
async function offers(productKey) {
  const url = `${SHOP_API}/products/${encodeURIComponent(productKey)}/positions`;
  const data = await getJSON(url, { ttl: 10 * 60 * 1000 });
  const shops = data.shops || {};
  const list = ((data.positions && data.positions.primary) || []).map((pos) => {
    const shop = shops[pos.shop_id] || {};
    const town = shop.addresses && shop.addresses[0] && shop.addresses[0].town;
    return {
      shopId: pos.shop_id,
      shop: shop.title || `Магазин ${pos.shop_id}`,
      shopUrl: shop.html_url || null,
      logo: shop.logo || null,
      rating: shop.reviews ? shop.reviews.rating : null,
      reviews: shop.reviews ? shop.reviews.count : 0,
      town: town ? town.title : null,
      price: money(pos.position_price),
      warranty: pos.warranty || null,
      comment: pos.comment || '',
      updated: pos.date_update || null,
      delivery: deliveryOf(pos.delivery),
      // «от 115,94 р./мес частями» — рассрочка или кредит магазина
      installment: pos.payment_plans && pos.payment_plans.summary ? String(pos.payment_plans.summary).replace(/ƃ/g, 'р.') : null,
    };
  });
  list.sort((a, b) => a.price - b.price);
  return list;
}

module.exports = { CATEGORIES, category, categoryPage, search, offers, product, priceHistory, normalize, enrich };
