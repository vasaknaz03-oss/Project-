'use strict';
// Отзывы покупателей Onliner → понятная сводка для новичка: что хвалят, на что жалуются, общий вывод.
// Анализ простой и прозрачный: темы ищутся по корням слов в «Достоинствах» (плюс) и «Недостатках» (минус),
// в свободном тексте учитываются только явные оценки. Отрицания («писка нет», «без шума») переворачивают смысл.

const onliner = require('./providers/onliner');

// root — о чём речь; pos/neg — как это звучит в свободном тексте похвалой или жалобой
const TOPICS = [
  { id: 'quiet', good: 'тихая работа', bad: 'шум', root: /тих|бесшум|шум|гул|громк|не слышн|слышн/, pos: /тих|бесшум|не слышн/, neg: /шумн|гуд|громк|воет|завыва|жужж/ },
  { id: 'temp', good: 'низкие температуры', bad: 'нагрев', root: /холод|темпер|грее|горяч|перегре|троттл|охлажд/, pos: /холодн|не грее|охлажд\S* (отличн|хорош|эффектив)/, neg: /сильно грее|горяч|перегре|троттл/ },
  { id: 'coil', good: 'нет писка дросселей', bad: 'писк/треск дросселей', root: /писк|пищ|треск|свист|дроссел/, pos: null, neg: /писк|пищ|треск дроссел|свист/ },
  { id: 'perf', good: 'производительность', bad: 'слабая производительность', root: /производител|мощн|тянет|фпс|fps|быстродейств|слаб|тормоз/, pos: /производительн|мощн|тянет все|быстр/, neg: /слаб|тормоз|не тянет|лаг/ },
  { id: 'price', good: 'цена / соотношение цена-качество', bad: 'высокая цена', root: /цен|стоимост|дорог|дешев|недорог|деньг|переплат/, pos: /недорог|адекватн\S* цен|цена[- ]качеств|соотношени|за свои деньги|своих денег/, neg: /дорог|переплат|завышен/ },
  { id: 'quality', good: 'качество и надёжность', bad: 'брак / поломки', root: /качеств|надёжн|надежн|сборк|брак|сломал|умер|сгорел|отвал|гаранти|сервис|исполнени/, pos: /качествен|надёжн|надежн|отличн\S* сборк/, neg: /брак|сломал|умер|сгорел|отвал|в сервис|по гаранти/ },
  { id: 'size', good: 'компактность', bad: 'большие размеры', root: /компакт|размер|габарит|огромн|громоздк|длинн|не влез|влез/, pos: /компакт|небольш/, neg: /огромн|громоздк|не влез|не помест/ },
  { id: 'looks', good: 'внешний вид / подсветка', bad: 'нет подсветки / внешний вид', root: /подсветк|rgb|красив|внешн|дизайн|выгляд/, pos: /красив|стильн|приятн\S* внешн/, neg: /нет подсветк|без подсветк|отсутствие rgb|отсутствие подсвет/ },
  { id: 'software', good: 'драйверы и ПО', bad: 'проблемы с драйверами / ПО', root: /драйвер|софт|прошивк|bios|биос|синий экран|bsod|вылет|глюч|артефакт/, pos: /драйвер\S* (без проблем|стабильн)/, neg: /синий экран|bsod|вылет|глюч|артефакт|кривой (bios|биос|софт)/ },
  { id: 'oc', good: 'хорошо разгоняется', bad: 'плохо разгоняется', root: /разгон|гонит/, pos: /хорошо гонит|отлично гонит|разгоняется/, neg: /не гонит|плохо гонит/ },
  { id: 'power', good: 'экономичность', bad: 'высокое энергопотребление', root: /энерго|потребл|прожорлив|экономичн|ватт/, pos: /экономичн|мало потребл|энергоэффектив/, neg: /прожорлив|много потребл/ },
  { id: 'vram', good: 'объём видеопамяти', bad: 'мало видеопамяти', root: /\b\d{1,2}\s*(gb|гб)(?![a-zа-яё])|видеопамят|памят/, pos: /16\s*(gb|гб)|памяти хватает|хватает памяти/, neg: /мало памяти|памяти мало|не хватает памяти|8\s*(gb|гб)(?![a-zа-яё])|12\s*(gb|гб)(?![a-zа-яё])/ },
  { id: 'speed', good: 'скорость', bad: 'низкая скорость', root: /скорост|быстр|медлен|кэш|кеш/, pos: /быстр|высок\S* скорост/, neg: /медлен|скорость пада|кэш\S* (мал|конча)/ },
  { id: 'install', good: 'удобная установка', bad: 'неудобный монтаж', root: /установ|монтаж|крепл|крепеж|кабел|провод/, pos: /легко (став|установ)|удобн\S* (монтаж|креплен|установ)|модульн/, neg: /неудобн\S* (монтаж|креплен|установ)|коротк\S* кабел|жестк\S* кабел/ },
];

// Какие темы имеют смысл для раздела (о писке дросселей у SSD не говорят — совпадения там случайные)
const ONLY = {
  coil: ['videocard', 'psu', 'motherboard', 'notebook'],
  vram: ['videocard', 'notebook'],
  oc: ['cpu', 'videocard', 'dram', 'motherboard'],
  speed: ['ssd', 'hdd', 'dram', 'notebook', 'router', 'flash'],
  quiet: ['videocard', 'fan', 'psu', 'chassis', 'notebook', 'hdd', 'keyboards', 'mouse', 'headphones', 'acoustics', 'cpu'],
  looks: ['videocard', 'fan', 'chassis', 'keyboards', 'mouse', 'headphones', 'motherboard', 'dram', 'notebook', 'display'],
  install: ['fan', 'chassis', 'psu', 'motherboard', 'ssd', 'cpu'],
  size: ['videocard', 'fan', 'chassis', 'psu', 'notebook', 'display'],
};
const topicsFor = (cat) => (cat ? TOPICS.filter((t) => !ONLY[t.id] || ONLY[t.id].includes(cat)) : TOPICS);

// «Писка нет», «без шума», «нету подсветки», «не греется» — отрицание перед или сразу после корня
const NEG_BEFORE = /(нет|нету|без|никак(ого|ой)?|отсутств\S*|не)\s+(\S+\s+)?$/;
const NEG_AFTER = /^\S*(\s+\S+){0,2}\s+(нет|нету|отсутству\S*|не (встреча|замеча|слыш|обнаруж|был|наблюда|выявл|замечен))/;
// Строка «минусов» без минусов
const NO_CONS = /^(нет|нету|не (нашёл|нашел|нашла|выявил\S*|выявлен\S*|обнаружил\S*|обнаружен\S*|заметил\S*|замечено)|пока нет|пока не (нашёл|нашел|обнаружил\S*|заметил\S*)|не замечено|отсутствуют|для меня нет\S*|-+|—+|\.+)\.?$/i;

function fragments(text) {
  return String(text || '').toLowerCase().replace(/ё/g, 'е').split(/[,;\n.!]+|\s[-–—]\s|\sи\s/).map((s) => s.trim()).filter((s) => s.length > 1);
}

function negated(frag, idx, len) {
  return NEG_BEFORE.test(frag.slice(0, idx)) || NEG_AFTER.test(frag.slice(idx, idx + len + 24));
}

/** Темы одного отзыва: Map(id → +1 / −1). */
function topicsOf(r, cat) {
  const list = topicsFor(cat);
  const out = new Map();
  const mark = (id, v) => {
    if (!out.has(id)) out.set(id, v);
  };
  for (const [field, sign] of [['pros', 1], ['cons', -1]]) {
    const raw = String(r[field] || '').trim();
    if (!raw || (sign < 0 && NO_CONS.test(raw))) continue;
    for (const f of fragments(raw)) {
      for (const t of list) {
        const m = f.match(t.root);
        if (!m) continue;
        // В «недостатках» «писка нет» — это плюс; в «достоинствах» «нет писка» — тоже плюс
        let v = sign;
        if (t.id === 'coil') v = negated(f, m.index, m[0].length) ? 1 : -1;
        else if (sign < 0 && negated(f, m.index, m[0].length) && !(t.neg && t.neg.test(f))) continue;
        mark(t.id, v);
      }
    }
  }
  // Свободный текст: только явные похвалы и жалобы, согласные с оценкой автора. В пятизвёздочном отзыве
  // «друзья говорили — писк дросселей» — пересказ чужих страхов, а не жалоба; в «двойке» — наоборот.
  const rating = r.rating || 0;
  for (const f of fragments(`${r.summary || ''}. ${r.text || ''}`)) {
    for (const t of list) {
      if (out.has(t.id)) continue;
      const n = t.neg && f.match(t.neg);
      if (n) {
        const v = negated(f, n.index, n[0].length) ? 1 : -1;
        if ((v < 0 && rating && rating <= 3) || (v > 0 && rating >= 4)) mark(t.id, v);
        continue;
      }
      if (t.pos && t.pos.test(f) && !/^(не|нет)\s/.test(f) && rating >= 4) mark(t.id, 1);
    }
  }
  return out;
}

function summarize(items, avg, total, cat) {
  const score = {};
  for (const r of items) {
    for (const [id, v] of topicsOf(r, cat)) {
      score[id] = score[id] || { pos: 0, neg: 0 };
      if (v > 0) score[id].pos++;
      else score[id].neg++;
    }
  }
  const byId = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
  const pros = Object.entries(score).filter(([, s]) => s.pos > 0).sort((a, b) => b[1].pos - a[1].pos)
    .slice(0, 5).map(([id, s]) => ({ id, text: byId[id].good, count: s.pos }));
  const cons = Object.entries(score).filter(([, s]) => s.neg > 0).sort((a, b) => b[1].neg - a[1].neg)
    .slice(0, 5).map(([id, s]) => ({ id, text: byId[id].bad, count: s.neg }));
  const rated = items.filter((r) => r.rating);
  const positive = rated.length ? Math.round((rated.filter((r) => r.rating >= 4).length / rated.length) * 100) : null;
  return { pros, cons, positive, verdict: verdict(avg, total, positive, pros, cons) };
}

function verdict(avg, total, positive, pros, cons) {
  if (!total) return { level: 'none', text: 'Отзывов покупателей пока нет. Ориентируйтесь на обзоры и характеристики — ссылки ниже.' };
  const few = total < 3;
  let level;
  let text;
  if (avg >= 4.6 && (positive == null || positive >= 85)) {
    level = 'great';
    text = 'Покупатели очень довольны';
  } else if (avg >= 4.1) {
    level = 'good';
    text = 'В целом хорошие отзывы';
  } else if (avg >= 3.4) {
    level = 'mixed';
    text = 'Мнения разделились — почитайте минусы';
  } else {
    level = 'bad';
    text = 'Много недовольных — лучше присмотреться к альтернативам';
  }
  const parts = [`${text}: ${avg.toFixed(1)} из 5 по ${total} ${plural(total, 'отзыву', 'отзывам', 'отзывам')}.`];
  if (pros.length) parts.push(`Чаще всего хвалят: ${pros.slice(0, 3).map((p) => p.text).join(', ')}.`);
  // Единичная жалоба при множестве отзывов — не повод пугать новичка
  const realCons = cons.filter((c) => c.count >= 2 || total <= 6);
  if (realCons.length) parts.push(`Жалобы: ${realCons.slice(0, 3).map((c) => `${c.text}${c.count > 1 ? ` (${c.count})` : ''}`).join(', ')}.`);
  else if (pros.length) parts.push('Повторяющихся жалоб нет.');
  if (few) parts.push('Отзывов мало — загляните и в обзоры.');
  return { level, text: parts.join(' ') };
}

function plural(n, one, few, many) {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

/** Отзывы товара (до 30 последних) со сводкой. */
async function forProduct(key, cat) {
  const first = await onliner.reviews(key, 10, 1);
  let items = first.items;
  for (let page = 2; page <= Math.min(3, first.pages || 1); page++) {
    const next = await onliner.reviews(key, 10, page).catch(() => null);
    if (!next || !next.items.length) break;
    items = items.concat(next.items);
  }
  const avg = first.rating || (items.length ? items.reduce((s, r) => s + (r.rating || 0), 0) / items.length : 0);
  return { total: first.total, rating: first.rating, stars: first.stars, items, summary: summarize(items, avg, first.total, cat) };
}

module.exports = { forProduct, summarize, topicsOf, TOPICS };
