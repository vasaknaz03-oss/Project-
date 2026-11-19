'use strict';
// Новости о компьютерах из RSS-лент сайтов: заголовок, анонс, картинка и ссылка на оригинал.

const { getText } = require('./http');

const FEEDS = [
  { id: 'onliner', name: 'Onliner Технологии', url: 'https://tech.onliner.by/feed' },
  { id: '3dnews', name: '3DNews', url: 'https://3dnews.ru/hardware-news/rss/' },
  { id: 'overclockers', name: 'Overclockers.ru', url: 'https://overclockers.ru/rss/all.rss' },
  { id: 'habr', name: 'Хабр: железо', url: 'https://habr.com/ru/rss/hubs/hardware/articles/all/?fl=ru' },
  { id: 'toms', name: "Tom's Hardware (англ.)", url: 'https://www.tomshardware.com/feeds.xml', en: true },
];

const TOPICS = [
  { id: 'gpu', name: 'Видеокарты', re: /видеокарт|geforce|radeon|\brtx\s?\d|\brx\s?\d{4}|\bgpu\b|nvidia|intel arc/i },
  { id: 'cpu', name: 'Процессоры', re: /процессор|ryzen|core\s?(i\d|ultra)|\bcpu\b|\bzen\s?\d|lake\b|threadripper|snapdragon x/i },
  { id: 'mem', name: 'Память и SSD', re: /\bddr\d|оперативн|памят[ьи]\b|\bssd\b|nvme|накопител|\bram\b|\bdram\b/i },
  { id: 'oc', name: 'Разгон', re: /разгон|overclock|андервольт|undervolt|тайминг|curve optimizer|\bpbo\b|\bxmp\b|\bexpo\b|рекорд частот/i },
  { id: 'laptop', name: 'Ноутбуки', re: /ноутбук|laptop|notebook|макбук|macbook/i },
  { id: 'games', name: 'Игры', re: /\bигр[аыуе]?\b|игров|steam|playstation|xbox|nintendo|\bgame/i },
  { id: 'prices', name: 'Цены', re: /подешев|подорож|снижен[иы]е цен|рост цен|дефицит|\bцен[аы]\b/i },
];

const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#039;|&#39;|&apos;/g, "'")
  .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const strip = (html) => decode(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
}

function attr(block, name, a) {
  const m = block.match(new RegExp(`<${name}\\s[^>]*${a}="([^"]+)"`, 'i'));
  return m ? decode(m[1]) : '';
}

/** Разбор RSS 2.0 и Atom. */
function parse(xml, feed) {
  const out = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks.slice(0, 40)) {
    const title = strip(tag(b, 'title'));
    let link = strip(tag(b, 'link')) || attr(b, 'link', 'href');
    if (!link) {
      const g = strip(tag(b, 'guid'));
      if (/^https?:\/\//.test(g)) link = g;
    }
    if (!title || !/^https?:\/\//.test(link)) continue;
    const dateRaw = strip(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'updated') || tag(b, 'published'));
    const date = dateRaw ? new Date(dateRaw) : null;
    const descHtml = tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'dc:content') || tag(b, 'content');
    let image = attr(b, 'media:thumbnail', 'url') || attr(b, 'media:content', 'url') || '';
    const enc = b.match(/<enclosure\s[^>]*>/i);
    if (!image && enc && /image/i.test(enc[0])) image = (enc[0].match(/url="([^"]+)"/) || [])[1] || '';
    if (!image) image = (decode(descHtml).match(/<img[^>]+src="([^"]+)"/i) || [])[1] || '';
    // У одной ленты адрес картинки бывает склеен дважды: берём последний https://
    if (image.lastIndexOf('https://') > 0) image = image.slice(image.lastIndexOf('https://'));
    const summary = strip(descHtml).slice(0, 280);
    const text = `${title} ${summary}`;
    out.push({
      id: link, source: feed.id, sourceName: feed.name, en: !!feed.en, title, link, summary,
      image: /^https?:\/\//.test(image) ? image : null,
      date: date && !isNaN(date) ? date.toISOString() : null,
      topics: TOPICS.filter((t) => t.re.test(text)).map((t) => t.id),
    });
  }
  return out;
}

async function loadFeed(feed) {
  const xml = await getText(feed.url, { ttl: 20 * 60 * 1000, timeout: 15000 });
  return parse(xml, feed);
}

/** Лента новостей: src — id источника, topic — тема, q — поиск по словам. */
async function list({ src = '', topic = '', q = '' } = {}) {
  const feeds = src ? FEEDS.filter((f) => f.id === src) : FEEDS;
  const results = await Promise.all(feeds.map((f) => loadFeed(f).then((items) => ({ f, items })).catch((e) => ({ f, items: [], error: e.message }))));
  let items = [];
  const sources = [];
  const seen = new Set();
  for (const { f, items: list, error } of results) {
    sources.push({ id: f.id, name: f.name, count: list.length, error: error || null });
    for (const it of list) {
      if (seen.has(it.link)) continue;
      seen.add(it.link);
      items.push(it);
    }
  }
  if (topic) items = items.filter((it) => it.topics.includes(topic));
  const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) items = items.filter((it) => words.every((w) => `${it.title} ${it.summary}`.toLowerCase().includes(w)));
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return { items: items.slice(0, 150), sources: src ? sources : sources, feeds: FEEDS.map(({ id, name }) => ({ id, name })), topics: TOPICS.map(({ id, name }) => ({ id, name })) };
}

module.exports = { list, parse, FEEDS, TOPICS };
