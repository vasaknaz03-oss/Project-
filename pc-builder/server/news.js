'use strict';
// Новости о компьютерах из RSS-лент 20 сайтов (русских и английских): заголовок, анонс, картинка и ссылка на оригинал.

const { getText } = require('./http');

// lang: ru — на русском, en — на английском. Только открытые RSS-ленты; сайты, которые закрыты защитой от ботов
// (Guru3D, VideoCardz), не подключены — обходить защиту программа не будет.
const FEEDS = [
  { id: 'onliner', name: 'Onliner Технологии', url: 'https://tech.onliner.by/feed', lang: 'ru' },
  { id: '3dnews', name: '3DNews', url: 'https://3dnews.ru/hardware-news/rss/', lang: 'ru' },
  { id: 'ixbt', name: 'iXBT.com', url: 'https://www.ixbt.com/export/news.rss', lang: 'ru' },
  { id: 'overclockers', name: 'Overclockers.ru', url: 'https://overclockers.ru/rss/all.rss', lang: 'ru' },
  { id: 'habr', name: 'Хабр: железо', url: 'https://habr.com/ru/rss/hubs/hardware/articles/all/?fl=ru', lang: 'ru' },
  { id: 'ferra', name: 'Ferra.ru', url: 'https://www.ferra.ru/exports/rss.xml', lang: 'ru' },
  { id: 'hitech', name: 'Hi-Tech Mail', url: 'https://hi-tech.mail.ru/rss/all/', lang: 'ru', general: true },
  { id: '4pda', name: '4PDA', url: 'https://4pda.to/feed/', lang: 'ru' },
  { id: 'stopgame', name: 'StopGame', url: 'https://rss.stopgame.ru/rss_news.xml', lang: 'ru' },
  { id: 'playground', name: 'PlayGround.ru', url: 'https://www.playground.ru/rss/news.xml', lang: 'ru' },
  { id: 'igromania', name: 'Игромания', url: 'https://www.igromania.ru/rss/news.rss', lang: 'ru' },
  { id: 'toms', name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds.xml', lang: 'en' },
  { id: 'techpowerup', name: 'TechPowerUp', url: 'https://www.techpowerup.com/rss/news', lang: 'en' },
  { id: 'wccftech', name: 'Wccftech', url: 'https://wccftech.com/feed/', lang: 'en' },
  { id: 'pcgamer', name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/', lang: 'en' },
  { id: 'hothardware', name: 'HotHardware', url: 'https://hothardware.com/rss/news.aspx', lang: 'en' },
  { id: 'kitguru', name: 'KitGuru', url: 'https://www.kitguru.net/feed/', lang: 'en' },
  { id: 'tweaktown', name: 'TweakTown', url: 'https://www.tweaktown.com/news-feed/', lang: 'en' },
  { id: 'notebookcheck', name: 'Notebookcheck', url: 'https://www.notebookcheck.net/News.152.100.html?type=rss', lang: 'en' },
  { id: 'ars', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/gadgets', lang: 'en' },
];

const TOPICS = [
  { id: 'gpu', name: 'Видеокарты', re: /видеокарт|geforce|radeon|\brtx\s?\d|\brx\s?\d{4}|\bgpu\b|nvidia|intel arc/i },
  { id: 'cpu', name: 'Процессоры', re: /процессор|ryzen|core\s?(i\d|ultra)|\bcpu\b|\bzen\s?\d|lake\b|threadripper|snapdragon x/i },
  { id: 'mem', name: 'Память и SSD', re: /\bddr\d|оперативн|памят[ьи]\b|\bssd\b|nvme|накопител|\bram\b|\bdram\b/i },
  { id: 'oc', name: 'Разгон', re: /разгон|overclock|андервольт|undervolt|тайминг|curve optimizer|\bpbo\b|\bxmp\b|\bexpo\b|рекорд частот/i },
  { id: 'laptop', name: 'Ноутбуки', re: /ноутбук|laptop|notebook|макбук|macbook/i },
  { id: 'games', name: 'Игры', re: /(?<![а-яё])игр[аыуе]?(?![а-яё])|игров|steam|playstation|xbox|nintendo|\bgame/i },
  { id: 'prices', name: 'Цены', re: /подешев|подорож|снижен[иы]е цен|рост цен|дефицит|(?<![а-яё])цен[аы](?![а-яё])/i },
];

// У общих лент (Hi-Tech Mail пишет и про космос, и про медицину) оставляем только технику и игры
const TECH = /компьютер|(?<![а-яё])пк(?![а-яё])|ноутбук|процессор|видеокарт|памят|накопител|ssd|монитор|клавиатур|мыш[ьи]|наушник|игр|консол|приставк|windows|linux|macos|android|ios(?![a-z])|смартфон|планшет|гаджет|(?<![а-яё])чип|микросхем|nvidia|amd|intel|apple|iphone|samsung|xiaomi|huawei|google|microsoft|steam|playstation|xbox|nintendo|роутер|wi-?fi|bluetooth|зарядк|аккумулятор|телевизор|умн(ые|ых) час|нейросет|(?<![а-яё])ии(?![а-яё])|chatgpt|openai|gta(?![a-z])|ведьмак|cyberpunk/i;

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
    if (feed.general && !TECH.test(title)) continue;
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
      id: link, source: feed.id, sourceName: feed.name, en: feed.lang === 'en' || !!feed.en, title, link, summary,
      image: /^https?:\/\//.test(image) ? image : null,
      date: date && !isNaN(date) ? date.toISOString() : null,
      topics: TOPICS.filter((t) => t.re.test(text)).map((t) => t.id),
    });
  }
  return out;
}

const WAIT_MS = 5000;

// Последняя удачная загрузка каждой ленты: если сайт временно не ответил, показываем её, а не пустоту
const lastGood = new Map();

async function loadFeed(feed) {
  try {
    const xml = await getText(feed.url, { ttl: 20 * 60 * 1000, timeout: 10000 });
    const items = parse(xml, feed);
    if (items.length) lastGood.set(feed.id, items);
    return { items };
  } catch (e) {
    const old = lastGood.get(feed.id);
    if (old) return { items: old, stale: true };
    throw e;
  }
}

/** Заголовок без знаков и регистра — чтобы одна новость с разных сайтов не повторялась. */
const titleKey = (t) => String(t).toLowerCase().replace(/[^a-zа-яё0-9]+/g, ' ').trim();

/** Лента новостей: src — id источника, lang — ru | en, topic — тема, q — поиск по словам. */
async function list({ src = '', lang = '', topic = '', q = '' } = {}) {
  const feeds = src ? FEEDS.filter((f) => f.id === src) : lang ? FEEDS.filter((f) => f.lang === lang) : FEEDS;
  // Медленный сайт не держит всю страницу: через 5 секунд показываем то, что есть, а он догрузится в фоне
  // (результат попадёт в кэш, и при следующем открытии его новости уже будут)
  const results = await Promise.all(feeds.map((f) => Promise.race([
    loadFeed(f).then((r) => ({ f, ...r })).catch((e) => ({ f, items: [], error: e.message })),
    new Promise((res) => setTimeout(() => res({ f, items: lastGood.get(f.id) || [], slow: true }), WAIT_MS)),
  ])));
  let items = [];
  const sources = [];
  const seen = new Set();
  for (const { f, items: list, error, stale, slow } of results) {
    sources.push({ id: f.id, name: f.name, lang: f.lang, count: list.length, error: error || null, stale: !!stale, slow: !!slow });
    for (const it of list) {
      const tk = titleKey(it.title);
      if (seen.has(it.link) || seen.has(tk)) continue;
      seen.add(it.link);
      seen.add(tk);
      items.push(it);
    }
  }
  if (topic) items = items.filter((it) => it.topics.includes(topic));
  const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) items = items.filter((it) => words.every((w) => `${it.title} ${it.summary}`.toLowerCase().includes(w)));
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return {
    items: items.slice(0, 400), total: items.length, sources,
    feeds: FEEDS.map(({ id, name, lang: l }) => ({ id, name, lang: l })), topics: TOPICS.map(({ id, name }) => ({ id, name })),
  };
}

/**
 * Поиск статей и обсуждений о разгоне по открытым лентам: поиск Хабра, свежие темы форума Overclock.net,
 * новости Overclockers.ru, 3DNews и других (по словам запроса). Без ключей и без обхода защиты сайтов.
 */
async function searchArticles(q) {
  q = String(q || '').trim().slice(0, 120);
  if (!q) return { items: [] };
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const hit = (it) => words.every((w) => `${it.title} ${it.summary}`.toLowerCase().includes(w));
  const [habr, ocnet, feeds] = await Promise.all([
    getText(`https://habr.com/ru/rss/search/?q=${encodeURIComponent(q)}&target_type=posts&order=relevance`, { ttl: 6 * 60 * 60 * 1000, timeout: 15000 })
      .then((x) => parse(x, { id: 'habr', name: 'Хабр' })).catch(() => []),
    getText('https://www.overclock.net/forums/-/index.rss', { ttl: 30 * 60 * 1000, timeout: 15000 })
      .then((x) => parse(x, { id: 'ocnet', name: 'Overclock.net (форум, англ.)', en: true }).filter(hit)).catch(() => []),
    list({ q }).then((r) => r.items).catch(() => []),
  ]);
  const seen = new Set();
  const items = [...habr.slice(0, 15), ...ocnet, ...feeds].filter((it) => !seen.has(it.link) && seen.add(it.link));
  return { items: items.slice(0, 40) };
}

module.exports = { list, parse, searchArticles, FEEDS, TOPICS, TECH };
