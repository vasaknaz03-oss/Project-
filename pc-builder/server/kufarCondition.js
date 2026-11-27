'use strict';

// Предложения с разными утверждениями проверяются отдельно, чтобы «работает, но …» не прятало дефект.
const CLAUSE = /[.!?;:\n]+|(?<!\p{L})(?:но|зато|однако|при этом)(?!\p{L})/u;
const NEGATED_BEFORE = /(?:^|[^\p{L}])(?:без|нет|никаких|не было|не замечал[аи]?|не видел[аи]?|не наблюдал(?:ось|ись|[аи])?|отсутствуют|проверк[аиу]\s+на|провер(?:ить|яйте|ено)\s+на|тест(?:ировал[аи]?|ы)?\s+на)\s+(?:(?!(?:есть|заметил|ловит|появля|выда[её]|вылез|пошли|быва)\p{L}*)[\p{L}-]+[,\s]+){0,5}$/u;
const NEGATED_AFTER = /^(?:(?:\s*[,/]\s*|\s+(?:и|или)\s+)(?:арт[еи]фак\p{L}*|дефект\p{L}*|глюк\p{L}*|перегрев\p{L}*|ошиб\p{L}*|сбо\p{L}*|треск\p{L}*)){0,4}\s*(?:[—–-]\s*)?(?:нет|не был[ои]|не было|не замечен[оы]?|не наблюда(?:ется|ются|лось|лись)|не появля(?:ется|ются|лось|лись)|отсутству(?:ет|ют))(?!\p{L})/u;
const UNCERTAIN = /(?:^|[^\p{L}])(?:возможно|вероятно|подозреваю|вроде|может быть|есть подозрение|если|не знаю|не уверен[а]?|не факт)(?!\p{L})/u;
const SECONDARY = /(?<![\p{L}\p{N}])(?:подсветк\p{L}*|hdmi|displayport|rgb|argb)(?![\p{L}\p{N}])/u;

// В предложении обмена допустимый дефект чужой детали не относится к продаваемой детали.
const BUYER_DEFECT = String.raw`(?:не\s*(?:исправн|рабоч)\p{L}*|с\s+(?:дефект|поврежден|арт[еи]факт)\p{L}*|на\s+запчасти|под\s+ремонт)`;
const BUYER_CONDITIONS = String.raw`(?:(?:можно|даже|подойдут|в\s+том\s+числе)\s+)?${BUYER_DEFECT}(?:(?:\s*,\s*|\s+(?:или|и)\s+)${BUYER_DEFECT})*`;
const BUYER_EXCHANGE = new RegExp(
  String.raw`(?<!\p{L})обмен(?:яю|яюсь)?\s+на\s+ваш(?:и|у|е)?\s+(?:(?:любые|даже)\s+)?(?:${BUYER_DEFECT}\s+)?` +
  String.raw`(?:комплектующ\p{L}*|детал\p{L}*|железо|видеокарт\p{L}*|(?:материнск\p{L}*\s+)?плат\p{L}*)(?!\p{L})` +
  String.raw`(?:\s*\(\s*${BUYER_CONDITIONS}\s*\)|(?:\s*,\s*|\s+)${BUYER_CONDITIONS}(?!\p{L}))?`, 'gu');

// Слова и короткие фразы, встречающиеся в объявлениях. Оценка качественная, без процентов.
const RULES = [
  { level: 'blocked', reason: 'Продавец указывает, что деталь не работает или не запускается.',
    pattern: /(?<!\p{L})(?:не\s*рабоч(?:ая|ий|ее|ие|ую|его|ей|ем|их)|не\s*исправн(?:ая|ый|ое|ые|ую|ого|ой)|не\s*(?:работает|работают|вкл[юу]ч[ао]ется|стартует|запускается|определяется)|перестал[ао]?\s+работать)(?!\p{L})/gu },
  { level: 'blocked', reason: 'Продавец сообщает о проблеме с каналом или слотами памяти.',
    pattern: /(?<!\p{L})(?:не\s+(?:запуска|старто|работа)л(?:а|о|и|ась|ось|ись)?\s+(?:в|на|с|при)\s+[^,]{0,45}(?:канал\p{L}*|слот\p{L}*\s+(?:памяти|озу))|видит\s+только\s+один\s+канал\s+памяти)(?!\p{L})/gu },
  { level: 'blocked', reason: 'В описании указаны погнутые или сломанные контакты.',
    pattern: /(?<!\p{L})(?:(?:погнут\p{L}*|загнут\p{L}*|сломан\p{L}*|согнут\p{L}*|обломан\p{L}*)\s+(?:ножк\p{L}*|контакт\p{L}*|пин\p{L}*)|(?:ножк\p{L}*|контакт\p{L}*|пин\p{L}*)\s+(?:погнут\p{L}*|загнут\p{L}*|сломан\p{L}*|согнут\p{L}*|обломан\p{L}*))(?!\p{L})/gu },
  { level: 'blocked', reason: 'Продавец сообщает, что ремонт не устранил проблему.',
    pattern: /(?<!\p{L})(?:ремонт\p{L}*|перепа\p{L}*|замен\p{L}*\s+сокет\p{L}*)[^.!?;:\n]{0,75}(?:не\s+помог\p{L}*|не\s+устранил\p{L}*|не\s+изменил\p{L}*|проблема\s+(?:остал\p{L}*|сохранил\p{L}*))(?!\p{L})/gu },
  { level: 'blocked', reason: 'Продавец указывает, что деталь предназначена для ремонта или на запчасти.',
    pattern: /(?<!\p{L})(?:под\s+(?:ремонт|восстановл\p{L}*)|на\s+(?:зап\s*част\p{L}*|разбор\p{L}*|детали|донорство)|как\s+донор)(?!\p{L})/gu },
  { level: 'blocked', reason: 'Продавец упоминает отсутствие изображения.',
    pattern: /(?<!\p{L})(?:(?:без|нет)\s+(?:из[оа]бражени\p{L}*|картинки|сигнала)|не\s*(?:дает|выдает|выводит|показывает)\s+(?:из[оа]бражени\p{L}*|картинк\p{L}*|сигнал\p{L}*)|черн(?:ый|ого)\s+экран\p{L}*)(?!\p{L})/gu },
  { level: 'blocked', reason: 'Продавец упоминает артефакты или отвал чипа.',
    pattern: /(?<!\p{L})(?:арт[еи]ф+ак(?:т|кт)+\p{L}*|артефакы|отвал\p{L}*\s+(?:чип\p{L}*|gpu)|(?:чип|gpu)\s+отвалил\p{L}*)(?!\p{L})/gu },
  { level: 'caution', reason: 'Продавец упоминает сбои или повреждения.',
    pattern: /(?<!\p{L})(?:глюч\p{L}*|глюк\p{L}*|деф+ект\p{L}*|неисправност\p{L}*|сбо[йияе]\p{L}*|сломан\p{L}*|заблокирован\p{L}*|бит(?:ый|ая|ое|ые)|поврежден\p{L}*|б[еэ]д[ -]*блок\p{L}*|bad[ -]*(?:block|sector)\p{L}*)(?!\p{L})/gu },
  { level: 'caution', reason: 'Продавец упоминает майнинг. Это повод проверить деталь под нагрузкой.',
    pattern: /(?<!\p{L})(?:после\s+ма[йи]нинг\p{L}*|ма[йи]нил[аио]?|(?:была|был[ои]?)\s+в\s+майнинге|работал[аои]?\s+(?:в\s+майнинг\p{L}*|на\s+ферме)|использовал[аи]?\s+(?:для|в)\s+майнинг\p{L}*)(?!\p{L})/gu },
  { level: 'caution', reason: 'Продавец сообщает о ремонте детали.',
    pattern: /(?<!\p{L})(?:после\s+ремонта|ремонтировал\p{L}*|восстановлен\p{L}*|ребол\p{L}*|прогревал\p{L}*|перепая\p{L}*|перепайк\p{L}*)(?!\p{L})/gu },
  { level: 'caution', reason: 'Работоспособность по описанию не подтверждена.',
    pattern: /(?<!\p{L})(?:не\s+проверял\p{L}*|не\s+тестировал\p{L}*|проверить\s+нечем|работоспособность\s+неизвестна|работает\s+ли\s+не\s+знаю|не\s+могу\s+проверить|не\s+гарантирую\s+работоспособность)(?!\p{L})/gu },
];

function plain(value) {
  return typeof value === 'string' ? value.slice(0, 30000)
    .replace(/<br\s*\/?>|<\/[pl]i?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|quot|apos|lt|gt);/gi, (_, key) => ({ nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[key.toLowerCase()])
    .replace(/&#(x[\da-f]+|\d+);/gi, (original, raw) => {
      const number = raw[0].toLowerCase() === 'x' ? parseInt(raw.slice(1), 16) : Number(raw);
      return number <= 0x10FFFF ? String.fromCodePoint(number) : original;
    })
    .trim() : '';
}

function assess(title, description, full = false) {
  const text = [plain(title), plain(description)].join('\n').toLowerCase().replace(/ё/g, 'е');
  const matches = new Map();
  for (const part of text.split(CLAUSE)) {
    const clause = part.replace(BUYER_EXCHANGE, ' ');
    for (const rule of RULES) {
      for (const hit of clause.matchAll(rule.pattern)) {
        const before = clause.slice(0, hit.index).slice(-90);
        const after = clause.slice(hit.index + hit[0].length, hit.index + hit[0].length + 80);
        const directNegative = /^не/u.test(hit[0]);
        if ((!directNegative && (NEGATED_BEFORE.test(before) || NEGATED_AFTER.test(after))) || /(?:^|[^\p{L}])не\s*$/u.test(before)) continue;
        // «Не работает с DDR4» описывает совместимость, а не состояние.
        if (/^не\s*работа/u.test(hit[0]) && /^\s+с\s+(?:ddr|windows|linux|bios|плат|процессор|материн)/iu.test(after)) continue;
        const partial = /^не\s*работает/u.test(hit[0]) && SECONDARY.test(before.slice(-35) + ' ' + after.slice(0, 35));
        const level = rule.level === 'blocked' && (UNCERTAIN.test(before) || partial) ? 'caution' : rule.level;
        if (!matches.has(rule.reason) || level === 'blocked') matches.set(rule.reason, level);
      }
    }
  }
  const blocked = [...matches.values()].includes('blocked');
  const level = blocked ? 'blocked' : matches.size ? 'caution' : full && !!plain(description) ? 'clear' : 'unknown';
  const reasons = [...matches.keys()].sort((a, b) => Number(matches.get(b) === 'blocked') - Number(matches.get(a) === 'blocked'));
  return { level, full, confidence: blocked ? 'high' : matches.size ? 'medium' : 'low',
    reasons: reasons.length ? reasons : level === 'unknown' ? ['Полное описание пока недоступно для проверки.'] : [] };
}

function order(risk) {
  return { clear: 0, unknown: 1, caution: 2, blocked: 3 }[risk.level] ?? 1;
}

function forModel(text) {
  return plain(text).replace(/https?:\/\/\S+|(?:www\.)\S+|\S+@\S+\.\S+|@[a-z\d_]{3,}|\+?\d(?:[\s()-]*\d){8,14}/gi, '[контакты скрыты]');
}

module.exports = { assess, order, plain, forModel };
