'use strict';
// ИИ-выжимка без Anthropic: программа сама собирает материалы из открытых источников и отдаёт их
// локальной модели (Ollama, LM Studio…) на пересказ.
//
// Источники (только открытые API и RSS, страницы — обычными запросами, без обхода защиты сайтов):
//  - отзывы покупателей Onliner (если запрос похож на товар);
//  - статьи и обсуждения: поиск Хабра, форум Overclock.net и 20 новостных лент (3DNews, iXBT, Overclockers.ru,
//    Onliner, Tom's Hardware, TechPowerUp…) — с текстом самих статей;
//  - комментарии зрителей к видео-обзорам (если есть ключ YouTube).
// Модель видит пронумерованные материалы и ставит ссылки [n] — так видно, откуда каждое утверждение.

const llm = require('./llm');
const { getText } = require('./http');

// Страницы каких сайтов программа читает сама (остальные — только заголовок и анонс из ленты)
const READABLE = /^https:\/\/(?:www\.)?(habr\.com|3dnews\.ru|overclockers\.ru|tech\.onliner\.by|overclock\.net|tomshardware\.com|ixbt\.com|ferra\.ru|hi-tech\.mail\.ru|techpowerup\.com|wccftech\.com|pcgamer\.com|kitguru\.net|tweaktown\.com|hothardware\.com)\//i;

const STOP = new Set(['видеокарта', 'видеокарты', 'процессор', 'процессора', 'материнская', 'плата', 'память', 'оперативная',
  'блок', 'питания', 'корпус', 'кулер', 'ssd', 'hdd', 'накопитель', 'gb', 'гб', 'tb', 'тб', 'oc', 'edition', 'обзор', 'отзывы',
  'отзыв', 'разгон', 'разгона', 'форум', 'и', 'в', 'на', 'для', 'с', 'по', 'как', 'что', 'the', 'and', 'for', 'with', 'new', 'box', 'oem']);

/** Короткие поисковые запросы из длинного названия: «… GeForce RTX 4060 Eagle OC 8GB» → «rtx 4060», «4060». */
function shortQueries(q) {
  const words = String(q).toLowerCase().replace(/[(),/«»"]/g, ' ').split(/\s+/).filter(Boolean);
  const out = [];
  const add = (s) => {
    s = s.trim();
    if (s && !out.includes(s)) out.push(s);
  };
  const meaningful = words.filter((w) => !STOP.has(w) && !/^\d+(gb|гб|tb|тб|w|вт|mhz|мгц)$/.test(w));
  if (meaningful.length <= 3) add(meaningful.join(' '));
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (STOP.has(w) || !/\d/.test(w) || /^\d+(gb|гб|tb|тб|w|вт|mhz|мгц|mm|мм)$/.test(w) || w.length < 3) continue;
    const prev = words[i - 1];
    if (prev && !STOP.has(prev) && !/\d/.test(prev)) add(`${prev} ${w}`);
    if (w.length >= 4) add(w);
  }
  if (!out.length) add(meaningful.slice(0, 3).join(' '));
  return out.slice(0, 4);
}

const decode = (s) => String(s || '')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Основной текст статьи: абзацы из <article> (или всей страницы), без меню, скриптов и подписей. */
function readable(html) {
  let h = String(html || '').replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|figure)[\s\S]*?<\/\1>/gi, ' ');
  const art = h.match(/<article[\s\S]*<\/article>/i);
  if (art) h = art[0];
  const paras = [...h.matchAll(/<(p|li|h2|h3|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 40 && !/cookie|подпис(ать|ывай)ся|реклама|©/i.test(t));
  const text = paras.length >= 3 ? paras.join('\n') : decode(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return text.slice(0, 20000);
}

function host(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Слова, которые не помогают понять, про что статья
const SCORE_STOP = new Set(['и', 'в', 'на', 'для', 'с', 'по', 'как', 'что', 'the', 'and', 'for', 'with', 'gb', 'гб', 'oc', 'edition']);

/** Номера моделей из запроса: «RTX 4060 Eagle» → ['4060'], «7800X3D» → ['7800x3d']. */
function modelTokens(query) {
  return [...new Set(String(query).toLowerCase().split(/[\s(),/«»"]+/)
    .filter((w) => /\d/.test(w) && /^[a-z0-9-]+$/.test(w) && w.replace(/\D/g, '').length >= 3 && !/^\d+(gb|tb|w|mhz|mm)$/.test(w)))];
}

/**
 * Насколько статья про запрос: номер модели в заголовке — главное; чужой номер модели без нашего — минус
 * (обзор RTX 5060 Ti не про RTX 4060); слова запроса в заголовке и свежесть — плюс.
 */
function relevance(it, toks, words) {
  const t = String(it.title || '').toLowerCase();
  const s = String(it.summary || '').toLowerCase();
  let sc = 0;
  for (const tok of toks) {
    if (t.includes(tok)) sc += 5;
    else if (s.includes(tok)) sc += 3;
  }
  if (toks.length && sc === 0 && /\b\d{3,5}[a-z]*\b/.test(t)) sc -= 3;
  for (const w of words) if (t.includes(w)) sc += 1;
  if (it.date && Date.now() - Date.parse(it.date) < 3 * 365 * 86400e3) sc += 1;
  return sc;
}

async function articles(query, max, mode) {
  const news = require('./news');
  const seen = new Set();
  const found = [];
  for (const q of [query, ...shortQueries(query)]) {
    if (found.length >= max * 4) break;
    const r = await news.searchArticles(q).catch(() => ({ items: [] }));
    for (const it of r.items) {
      if (seen.has(it.link)) continue;
      seen.add(it.link);
      found.push(it);
    }
  }
  const toks = modelTokens(query);
  const words = String(query).toLowerCase().split(/[\s(),/«»"]+/).filter((w) => w.length > 2 && !/\d/.test(w) && !SCORE_STOP.has(w));
  // Про конкретный товар — только статьи, где он упомянут; для разгона и сборок — хоть что-то по теме
  const need = mode === 'part' && toks.length ? 3 : 1;
  const pick = found.map((it) => ({ it, sc: relevance(it, toks, words) }))
    .filter((x) => x.sc >= need)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, max)
    .map((x) => x.it);
  return Promise.all(pick.map(async (it) => {
    let text = '';
    if (READABLE.test(it.link)) text = await getText(it.link, { ttl: 24 * 60 * 60 * 1000, timeout: 15000 }).then(readable).catch(() => '');
    return { kind: 'article', url: it.link.replace(/[?&]utm_[^#]*$/, ''), title: `${it.title} (${it.sourceName || host(it.link)})`, text: text || it.summary || '' };
  })).then((list) => list.filter((s) => s.text.length > 80));
}

async function buyerReviews(query, max) {
  const onliner = require('./providers/onliner');
  const reviews = require('./reviews');
  const qs = shortQueries(query);
  const r = await onliner.search(query, 1, 5).catch(() => null);
  let items = (r && r.items) || [];
  if (!items.some((x) => x.reviews) && qs[0]) items = ((await onliner.search(qs[0], 1, 5).catch(() => null)) || { items: [] }).items;
  const key = modelTokens(query)[0];
  const p = items.find((x) => x.reviews > 0 && (!key || x.name.toLowerCase().includes(key)));
  if (!p) return { sources: [], links: [] };
  const [rv, forum] = await Promise.all([
    reviews.forProduct(p.id, p.category).catch(() => null),
    forumLink(p.id),
  ]);
  const links = forum ? [forum] : [];
  if (!rv || !rv.items.length) return { sources: [], links };
  const text = rv.items.slice(0, max).map((x) => {
    const parts = [`★${x.rating || '?'}`];
    if (x.summary) parts.push(x.summary);
    if (x.pros) parts.push('Плюсы: ' + x.pros);
    if (x.cons) parts.push('Минусы: ' + x.cons);
    if (x.text) parts.push(x.text.slice(0, 300));
    return '- ' + parts.join('. ');
  }).join('\n');
  return { sources: [{ kind: 'reviews', url: p.url, title: `Отзывы покупателей Onliner: ${p.name} (${rv.total} шт., средняя ${rv.rating ? rv.rating.toFixed(1) : '?'}★)`, text }], links };
}

/** Тема товара на форуме Onliner (ссылка для чтения — сам форум программа не скачивает). */
async function forumLink(key) {
  try {
    const { getJSON } = require('./http');
    const d = await getJSON(`https://catalog.onliner.by/sdapi/catalog.api/products/${encodeURIComponent(key)}`, { ttl: 6 * 60 * 60 * 1000 });
    const f = d && d.forum;
    if (f && f.topic_url && f.replies_count > 0) return { url: f.topic_url, title: `Обсуждение на форуме Onliner (${f.replies_count} ${f.replies_count % 10 === 1 && f.replies_count % 100 !== 11 ? 'ответ' : 'ответов'})` };
  } catch {
    // нет темы — не страшно
  }
  return null;
}

async function videoComments(query) {
  const youtube = require('./youtube');
  if (!youtube.available()) return [];
  const r = await youtube.search(query, { comments: true }).catch(() => ({ videos: [] }));
  return r.videos.filter((v) => v.comments.length).slice(0, 3).map((v) => ({
    kind: 'video', url: v.url, title: `Комментарии к видео «${v.title}» (${v.channel}, YouTube)`,
    text: v.comments.map((c) => `- ${c.text}${c.likes ? ` (👍 ${c.likes})` : ''}`).join('\n'),
  }));
}

/** Уложить материалы в бюджет символов: короткие целиком, длинные — поровну обрезаем. */
function fit(sources, budget) {
  const out = sources.map((s) => ({ ...s }));
  let left = budget;
  let rest = out.slice().sort((a, b) => a.text.length - b.text.length);
  while (rest.length) {
    const share = Math.floor(left / rest.length);
    const s = rest[0];
    if (s.text.length <= share) {
      left -= s.text.length;
      rest = rest.slice(1);
      continue;
    }
    for (const x of rest) x.text = x.text.slice(0, share).replace(/\s+\S*$/, '') + ' …';
    break;
  }
  return out;
}

const SYSTEM = `Ты — помощник в программе «ПодборПК» для людей из Беларуси, которые собирают или улучшают компьютер.
Многие из них не разбираются в железе. Тебе дают материалы, найденные программой: отзывы покупателей,
статьи, обсуждения на форумах, комментарии к видео. Они пронумерованы: [1], [2]…

Как отвечать:
- Пиши по-русски, коротко и понятно новичку; термины поясняй в скобках.
- Опирайся ТОЛЬКО на данные материалы. После каждого утверждения ставь номер материала в квадратных скобках, например [2].
- Если материалов мало, они не про этот товар или мнения расходятся — так и скажи. Не выдумывай факты, цифры и ссылки.
- Цифры (напряжения, частоты, тайминги, температуры) приводи только из материалов и с оговоркой о безопасности.
- Структура: «## Коротко» (2–4 предложения с выводом), затем разделы по смыслу (например «## Что хвалят»,
  «## На что жалуются», «## Разгон и настройка», «## Совет»). Списки — через «- ».`;

const TASKS = {
  part: (q) => `Что пишут люди и обзорщики про: ${q}. Что хвалят, какие частые проблемы (брак, шум, нагрев, писк, драйверы),
кому подходит, на что смотреть при покупке б/у. В конце — совет новичку.`,
  build: (q) => `Сборки и советы на тему: ${q}. Какие комплектующие берут, какие ошибки совершают, на чём не стоит экономить.`,
  free: (q) => q,
};

/**
 * Выжимка локальной моделью. Возвращает то же, что и ai.research: { text, sources, more, searches, model, engine }.
 */
async function research(query, { mode = 'part', depth = 'quick' } = {}) {
  const deep = depth === 'deep';
  const c = llm.config();
  const ollama = !c || c.kind !== 'openai';
  // Сколько текста влезет в контекст модели: у Ollama задаём контекст сами, у остальных он часто 4096 токенов
  const budget = ollama ? (deep ? 16000 : 9000) : (deep ? 6000 : 5000);
  const [rv, arts, vids] = await Promise.all([
    mode === 'part' || mode === 'free' ? buyerReviews(query, deep ? 30 : 12) : { sources: [], links: [] },
    articles(query, deep ? 6 : 3, mode),
    videoComments(query + (mode === 'part' ? ' обзор' : '')),
  ]);
  const all = [...rv.sources, ...arts, ...vids];
  if (!all.length) {
    throw Object.assign(new Error('Не нашлось материалов по этому запросу. Попробуйте короче — например, только модель («RTX 4060», «Ryzen 5 7600»).'), { llm: true });
  }
  const mats = fit(all, budget).map((s, i) => ({ ...s, n: i + 1 }));
  const user = `${(TASKS[mode] || TASKS.free)(query)}\n\nМатериалы:\n\n${mats.map((s) => `[${s.n}] ${s.title}\n${s.text}`).join('\n\n')}`;
  const r = await llm.chat({ system: SYSTEM, user, maxTokens: ollama ? (deep ? 2200 : 1400) : 1200, ctx: deep ? 12288 : 8192 }, c);
  const used = new Set([...r.text.matchAll(/\[(\d{1,2})\]/g)].map((m) => +m[1]).filter((n) => n >= 1 && n <= mats.length));
  // Номера оставляем как есть — в тексте они должны совпадать со списком источников
  const sources = mats.map((s) => ({ n: s.n, url: s.url, title: s.title }));
  return {
    text: r.text || 'Модель ничего не ответила. Повторите или выберите модель побольше.',
    sources: used.size ? sources.filter((s) => used.has(s.n)) : sources,
    more: [...(used.size ? sources.filter((s) => !used.has(s.n)).map(({ url, title }) => ({ url, title })) : []), ...rv.links],
    searches: mats.length,
    engine: 'local',
    cloud: !!c?.cloud,
    model: r.model,
    usage: { input: r.usage.input, output: r.usage.output, webSearches: 0 },
  };
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string' },
    pros: { type: 'array', items: { type: 'string' } },
    cons: { type: 'array', items: { type: 'string' } },
    who: { type: 'string' },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'pros', 'cons', 'who', 'warnings'],
  additionalProperties: false,
};

/** Разбор отзывов по смыслу локальной моделью — тот же формат, что у ai.reviewSummary. */
async function reviewSummary(name, items) {
  const c = llm.config();
  const budget = !c || c.kind !== 'openai' ? 9000 : 5000;
  const rows = (items || []).slice(0, 30).map((r, i) => ({
    n: i + 1, url: '', title: '',
    text: `Отзыв ${i + 1} (${r.rating || '?'}★): ${r.summary || ''}. Плюсы: ${r.pros || '—'}. Минусы: ${r.cons || '—'}. ${r.text || ''}`,
  }));
  if (!rows.length) throw new Error('Нет отзывов для разбора');
  const list = fit(rows, budget).map((r) => r.text).join('\n\n');
  const r = await llm.chat({
    system: 'Ты разбираешь отзывы покупателей о компьютерной комплектующей для новичка. Пиши по-русски, просто. Учитывай смысл: «писка нет» — это плюс, пересказ чужих опасений — не жалоба. Не выдумывай того, чего нет в отзывах.',
    user: `Товар: ${name}\n\n${list}\n\nОтветь только JSON-объектом без пояснений: {"verdict": "вывод для новичка в 1–3 предложениях", "pros": ["что хвалят, по убыванию частоты"], "cons": ["на что жалуются и насколько часто"], "who": "кому подходит и кому лучше другое", "warnings": ["брак, поломки, подделки — если есть, иначе пустой список"]}`,
    json: REVIEW_SCHEMA,
    maxTokens: 1200,
  }, c);
  const o = llm.parseJSON(r.text);
  const arr = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 8) : v ? [String(v)] : []);
  const out = { verdict: String(o.verdict || ''), pros: arr(o.pros), cons: arr(o.cons), who: String(o.who || ''), warnings: arr(o.warnings), engine: 'local', cloud: !!c?.cloud, model: r.model };
  Object.defineProperty(out, 'usage', { value: r.usage, enumerable: false });
  return out;
}

module.exports = { research, reviewSummary, shortQueries, modelTokens, relevance, readable, fit, READABLE };
