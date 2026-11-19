'use strict';
// Wildberries (wildberries.by): поиск товаров с ценами в BYN.
// Wildberries может отклонять автоматические запросы (особенно из дата-центров) — тогда
// возвращаем blocked: true, и интерфейс показывает ссылку на поиск на сайте.

const { getJSON } = require('../http');

const VERSIONS = ['v13', 'v9', 'v5', 'v4'];
let workingVersion = null;

function searchUrl(query) {
  return 'https://www.wildberries.by/catalog/0/search.aspx?search=' + encodeURIComponent(query);
}

/** Разбор ответа поиска: формат менялся между версиями API, поддерживаем несколько. */
function parse(data) {
  const list = (data && ((data.data && data.data.products) || data.products)) || [];
  return list.map((p) => {
    const size = Array.isArray(p.sizes) && p.sizes.find((x) => x && x.price);
    const kop = (size && size.price && (size.price.product || size.price.total)) || p.salePriceU || p.priceU || 0;
    const price = Math.round(kop) / 100;
    return {
      source: 'wb',
      id: String(p.id),
      name: [p.brand, p.name].filter(Boolean).join(' ').trim(),
      brand: p.brand || '',
      price,
      rating: p.reviewRating || p.rating || 0,
      reviews: p.feedbacks || 0,
      url: `https://www.wildberries.by/catalog/${p.id}/detail.aspx`,
      image: null,
    };
  }).filter((x) => x.price > 0 && x.name);
}

async function search(query, { page = 1 } = {}) {
  const versions = workingVersion ? [workingVersion] : VERSIONS;
  let lastErr;
  for (const v of versions) {
    const url = `https://search.wb.ru/exactmatch/ru/common/${v}/search?appType=1&curr=byn&dest=-59208&lang=ru&page=${page}&query=${encodeURIComponent(query)}&resultset=catalog&sort=popular&spp=30`;
    try {
      const data = await getJSON(url, { ttl: 10 * 60 * 1000, timeout: 10000, retries: 0 });
      const items = parse(data);
      workingVersion = v;
      return { items, blocked: false, url: searchUrl(query) };
    } catch (e) {
      lastErr = e;
      if (e.status === 403 || e.status === 498 || e.status === 429) break; // защита от ботов — дальше пробовать бессмысленно
    }
  }
  return { items: [], blocked: true, url: searchUrl(query), error: lastErr ? lastErr.message : '' };
}

module.exports = { search, parse, searchUrl };
