// ИИ-помощник (Claude + веб-поиск или локальная модель) и YouTube в интерфейсе: выжимка с форумов и обзоров
// со ссылками, разбор отзывов по смыслу, видео-обзоры с комментариями зрителей.
import { el, icon, api, money, modal } from './util.js';
import { SLOTS } from './state.js';

let status = null;
export async function aiStatus(force = false) {
  if (!status || force) {
    try {
      status = await api('/api/ai/status');
    } catch {
      status = { ai: false, youtube: false };
    }
  }
  return status;
}
document.addEventListener('secrets-changed', () => { status = null; });

const toSettings = () => document.dispatchEvent(new CustomEvent('goto-page', { detail: 'settings' }));

function needKey(what) {
  return el('div.notice', icon('info'), el('div',
    `${what} Настраивается один раз в «Настройках». `,
    el('button.link-btn', { onclick: toSettings }, 'Открыть настройки')));
}

export function openBuildAdvice({ purpose, parts, setup, have, alternatives, budget, apply }) {
  const panel = el('div', el('p.muted', 'Проверяем, подключён ли ИИ…'));
  const close = modal('ИИ-помощник для сборки', panel);
  aiStatus(true).then((st) => {
    if (!st.buildAdvice) {
      const message = st.via?.ai === 'server'
        ? 'На сервере ПодборПК пока недоступна оценка сборок. Подключите личного провайдера в настройках или обновите общий сервер.'
        : 'Чтобы оценить сборку, откройте «Настройки» → «ИИ-помощник и YouTube» и подключите провайдера.';
      panel.replaceChildren(el('p', message), el('button.btn.btn-primary', {
        onclick: () => { close(); toSettings(); },
      }, 'Открыть настройки'));
      return;
    }
    const cur = money.currency;
    const inCurrency = money.toCur(budget, cur);
    const limit = el('input.input#ai-build-budget', { type: 'number', min: '0.01', step: '0.01', required: true, value: inCurrency > 0 ? inCurrency.toFixed(2) : '' });
    const out = el('div.ai-out', { role: 'status' });
    const run = el('button.btn.btn-primary', { type: 'submit' }, icon('sparkles'), 'Оценить сборку');
    panel.replaceChildren(
      el('p', el('b', st.providerLabel || 'Подключённый провайдер'), ' получит список деталей, их характеристики, цены и бюджет. ПодборПК проверит совместимость и стоимость рекомендованных замен.'),
      el('form', { onsubmit: async (e) => {
        e.preventDefault();
        const budgetByn = Math.round(money.fromCur(Number(limit.value), cur) * 100) / 100;
        run.disabled = true;
        limit.disabled = true;
        out.replaceChildren(el('div.row', el('div.spinner.inline'), el('span.muted', 'Проверяем цены и ждём оценку ИИ…')));
        try {
          const result = await api('/api/ai/build-advice', { method: 'POST', body: { provider: st.provider, purpose, parts, setup, have, alternatives, budget: budgetByn } });
          out.replaceChildren(renderBuildAdvice(result, (choice) => { if (apply(choice, result.budget)) close(); }));
        } catch (err) {
          out.replaceChildren(el('div.notice.err', icon('error'), err.message));
        } finally {
          run.disabled = false;
          limit.disabled = false;
        }
      } },
      el('div.field', el('label', { for: limit.id }, `Общий бюджет, ${cur}`), limit),
      el('div.row', { style: { marginTop: '10px' } }, run)),
      out);
  });
}

function renderBuildAdvice(result, apply) {
  const issue = { error: 'error', warn: 'alert', info: 'info' };
  return el('div.ai-answer',
    result.model ? el('p.dim.small', `Оценка модели ${result.model}`) : null,
    el('p.dim.small', `${result.missingPrice ? 'По указанным ценам' : 'Текущий итог'} ${money.fmt(result.total)} · бюджет ${money.fmt(result.budget)}`),
    el('h3', 'Что проверить в сборке'),
    result.findings.length ? el('div.checks', result.findings.map((f) => el('div.ck', { class: f.level },
      icon(issue[f.level]), el('div', f.text)))) : el('p.muted', 'По имеющимся данным явных проблем не найдено.'),
    el('h3', 'Предложения в рамках бюджета'),
    result.suggestions.length ? el('p.dim.small', 'Каждая замена рассчитана отдельно по текущему списку деталей.') : el('p.muted', 'Подходящих замен для этого бюджета ИИ не выбрал.'),
    el('div.alt-list', result.suggestions.map((a) => el('article.ai-block',
      el('b', `${SLOTS.find((s) => s.key === a.slot).label} · ${a.item.name}`),
      el('div.dim.small', `Цена детали ${money.fmt(a.item.price)} · сборка после замены ${money.fmt(a.cost)}`),
      el('ul', a.reasons.map((reason) => el('li', reason))),
      a.warnings.length ? el('details.ai-more', el('summary', 'Что ещё проверить'), el('ul', a.warnings.map((w) => el('li', w)))) : null,
      el('div.row.wrap',
        el('button.btn.btn-sm', { onclick: () => apply(a) }, 'Заменить деталь'),
        /^https:\/\/catalog\.onliner\.by\//i.test(a.item.url || '') ? el('a.link-btn', { href: a.item.url, target: '_blank', rel: 'noopener' }, 'На Onliner ↗') : null)))));
}

// ------------------------------------------------------------------ простой Markdown → DOM (без innerHTML)

function inline(text, sources) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|\[(\d{1,2})\]|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(el('b', m[1]));
    else if (m[2]) {
      const s = sources && sources.find((x) => x.n === +m[2]);
      out.push(s ? el('a.cite', { href: s.url, target: '_blank', rel: 'noopener', title: s.title }, m[2]) : `[${m[2]}]`);
    } else if (m[3]) out.push(el('a', { href: m[4], target: '_blank', rel: 'noopener' }, m[3]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function markdown(text, sources) {
  const root = el('div.md');
  let list = null;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      list = null;
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    const li = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (h) {
      list = null;
      root.append(el(h[1].length <= 2 ? 'h4' : 'h5', inline(h[2].replace(/\*\*/g, ''), sources)));
    } else if (li) {
      if (!list) {
        list = el('ul');
        root.append(list);
      }
      list.append(el('li', inline(li[1], sources)));
    } else {
      list = null;
      root.append(el('p', inline(line, sources)));
    }
  }
  return root;
}

function answer(r) {
  return el('div.ai-answer',
    markdown(r.text, r.sources),
    r.sources && r.sources.length ? el('div.ai-sources', el('div.panel-title', 'Источники'),
      el('ol', r.sources.map((s) => el('li', el('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title || s.url), el('span.dim', ' — ' + host(s.url)))))) : null,
    r.more && r.more.length ? el('details.ai-more', el('summary', `Ещё найдено (${r.more.length})`),
      el('ul', r.more.map((s) => el('li', el('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title || s.url), el('span.dim', ' — ' + host(s.url)))))) : null,
    el('div.dim.small', { style: { marginTop: '8px' } },
      r.engine === 'local'
        ? `Пересказ ${r.cloud ? 'облачной' : 'локальной'} модели ${r.model || ''} по ${r.searches || 0} ${plural(r.searches || 0, 'материалу', 'материалам', 'материалам')}, найденным программой`
        : `Собрано ИИ по ${r.searches || 0} ${r.searches === 1 ? 'поиску' : 'поискам'} в интернете`,
      r.cached ? (r.engine === 'local' ? ' · из сохранённого (сегодня уже спрашивали)' : ' · из сохранённого (сегодня уже искали — повторно не оплачивалось)') : '',
      r.t ? ` · ${new Date(r.t).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '',
      '. ИИ может ошибаться — важное проверяйте по источникам.'));
}

function plural(n, one, few, many) {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

function host(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Блок «Что пишут на форумах и в обзорах»: кнопки «Быстро» / «Подробно» и результат.
 * mode: part | oc | build | free.
 */
export function researchBlock(query, { mode = 'part', title = 'Что пишут на форумах, в обзорах и статьях', autoCached = true } = {}) {
  const out = el('div.ai-out');
  const box = el('div.ai-block', el('div.ai-head', icon('sparkles'), el('b', title)), out);
  const run = async (depth, fresh = false, cachedOnly = false) => {
    const local = status && status.via && status.via.ai === 'local';
    const cloud = status && status.via && status.via.ai === 'cloud';
    if (!cachedOnly) out.replaceChildren(el('div.row', el('div.spinner.inline'),
      el('span.muted', local
        ? 'Программа собирает отзывы, статьи и обсуждения, а модель на вашем компьютере их читает — на видеокарте до минуты, на процессоре 1–5 минут…'
        : cloud ? `Программа собирает материалы и отправляет их в ${status.providerLabel}…`
        : depth === 'deep' ? 'ИИ ищет и читает форумы, обзоры и статьи — подробно, это займёт 1–3 минуты…' : 'ИИ ищет на форумах и в обзорах — обычно до минуты…')));
    try {
      const r = await api('/api/ai/research', { method: 'POST', body: { query, mode, depth, fresh, cachedOnly } });
      if (cachedOnly && !r.cached) return;
      out.replaceChildren(answer(r),
        el('div.row', { style: { gap: '8px', marginTop: '8px' } },
          depth !== 'deep' ? el('button.btn.btn-sm', { onclick: () => run('deep') }, icon('sparkles'), 'Подробнее (больше источников)') : null,
          el('button.btn.btn-sm.btn-ghost', { onclick: () => run(depth, true) }, icon('refresh'), 'Искать заново')));
    } catch (e) {
      if (!cachedOnly) out.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message)));
    }
  };
  aiStatus().then((st) => {
    if (!st.ai) {
      out.replaceChildren(needKey('ИИ-помощник перескажет, что пишут люди в отзывах, статьях и на форумах, со ссылками на источники. Бесплатно — с моделью на вашем компьютере (Ollama), настраивается за пару минут.'),
        el('div.ext-links', el('span.dim', 'Без ключа можно открыть поиск самому:'),
          el('a', { href: 'https://www.google.com/search?q=' + encodeURIComponent(query + (mode === 'oc' ? ' разгон' : ' отзывы форум')), target: '_blank', rel: 'noopener' }, 'Google ↗'),
          el('a', { href: 'https://www.reddit.com/search/?q=' + encodeURIComponent(query), target: '_blank', rel: 'noopener' }, 'Reddit ↗'),
          el('a', { href: 'https://www.google.com/search?q=' + encodeURIComponent(query + ' site:forums.overclockers.ru'), target: '_blank', rel: 'noopener' }, 'Overclockers.ru ↗')));
      return;
    }
    const lim = st.via && st.via.ai === 'server' && st.limits ? st.limits : null;
    const left = (k) => (lim && lim.limits[k] != null ? Math.max(0, lim.limits[k] - (lim.used[k] || 0)) : null);
    out.replaceChildren(el('p.dim.small', st.via && st.via.ai === 'local'
      ? `Программа найдёт отзывы покупателей, статьи и обсуждения, а модель ${st.model || ''} на вашем компьютере прочитает их и коротко расскажет главное — со ссылками. «Подробно» — больше материалов, дольше.`
      : st.via?.ai === 'cloud' ? `ПодборПК найдёт источники, а ${st.providerLabel} (${st.model}) подготовит выжимку по ним.`
      : 'ИИ найдёт обсуждения и обзоры, прочитает их и коротко расскажет главное — со ссылками. «Быстро» — несколько источников, «Подробно» — больше источников и глубже.',
      lim ? ` Через сервер ПодборПК сегодня осталось: быстро — ${left('research_quick')}, подробно — ${left('research_deep')}. Вопросы, которые уже кто-то задавал, лимит не тратят.` : ''),
      el('div.row', { style: { gap: '8px' } },
        el('button.btn.btn-primary.btn-sm', { onclick: () => run('quick') }, icon('sparkles'), 'Быстро'),
        el('button.btn.btn-sm', { onclick: () => run('deep') }, 'Подробно')));
    // Если сегодня уже искали — покажем сразу, бесплатно
    if (autoCached) {
      api('/api/ai/history').then((h) => {
        const hit = h.items.find((x) => x.mode === mode && x.query.toLowerCase() === String(query).toLowerCase().trim() && Date.now() - x.t < 24 * 3600 * 1000);
        if (hit) run(hit.depth, false, true);
      }).catch(() => {});
    }
  });
  return box;
}

/** ИИ-разбор отзывов покупателей (по смыслу). */
export function aiReviewsButton(it) {
  const out = el('div');
  const btn = el('button.btn.btn-sm', {
    onclick: async () => {
      btn.disabled = true;
      out.replaceChildren(el('div.row', el('div.spinner.inline'), el('span.muted', status && status.via && status.via.ai === 'local' ? 'Модель на вашем компьютере читает отзывы — на процессоре это до пары минут…' : 'ИИ читает отзывы…')));
      try {
        const r = await api('/api/ai/reviews', { method: 'POST', body: { key: it.id, cat: it.category || '', name: it.name } });
        btn.remove();
        out.replaceChildren(el('div.ai-reviews',
          el('div.verdict.v-good', icon('sparkles'), el('div', el('b', 'ИИ об отзывах: '), r.verdict)),
          el('div.ai-cols',
            r.pros.length ? el('div', el('div.panel-title', 'Хвалят'), el('ul', r.pros.map((x) => el('li', x)))) : null,
            r.cons.length ? el('div', el('div.panel-title', 'Жалуются'), el('ul', r.cons.map((x) => el('li', x)))) : null),
          r.who ? el('p', el('b', 'Кому подходит: '), r.who) : null,
          r.warnings && r.warnings.length ? el('div.notice', icon('alert'), el('div', el('b', 'Обратите внимание: '), r.warnings.join('; '))) : null));
      } catch (e) {
        btn.disabled = false;
        out.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message)));
      }
    },
  }, icon('sparkles'), 'Разобрать отзывы с ИИ (по смыслу)');
  aiStatus().then((st) => {
    if (!st.ai) {
      btn.disabled = true;
      btn.title = 'Нужна локальная модель или ключ в «Настройках» → «ИИ-помощник»';
    }
  });
  return el('div.ai-rev-wrap', btn, out);
}

/** Видео с YouTube: обзоры/гайды и лучшие комментарии зрителей. */
export function youtubeBlock(query, { title = 'Видео-обзоры и мнения зрителей' } = {}) {
  const out = el('div');
  const box = el('div.ai-block', el('div.ai-head', icon('film'), el('b', title)), out);
  const link = el('a', { href: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query), target: '_blank', rel: 'noopener' }, 'Открыть поиск на YouTube ↗');
  aiStatus().then(async (st) => {
    if (!st.youtube) {
      out.replaceChildren(needKey('С бесплатным ключом YouTube здесь появятся видео и комментарии зрителей.'), el('div.ext-links', link));
      return;
    }
    out.replaceChildren(el('div.row', el('div.spinner.inline'), el('span.muted', 'Загружаем видео…')));
    try {
      const r = await api('/api/youtube?q=' + encodeURIComponent(query));
      if (!r.videos.length) return out.replaceChildren(el('p.muted', 'Видео не нашлось.'), link);
      out.replaceChildren(el('div.yt-list', r.videos.map((v) => el('div.yt-item',
        el('a.yt-thumb', { href: v.url, target: '_blank', rel: 'noopener' }, v.thumb ? el('img', { src: v.thumb, alt: '', loading: 'lazy' }) : icon('film')),
        el('div',
          el('a.yt-title', { href: v.url, target: '_blank', rel: 'noopener' }, v.title),
          el('div.dim.small', `${v.channel} · ${v.date ? new Date(v.date).toLocaleDateString('ru-RU') : ''}`),
          v.comments.length ? el('details.yt-comments', el('summary', `Комментарии зрителей (${v.comments.length})`),
            el('ul', v.comments.map((c) => el('li', el('span', c.text), c.likes ? el('span.dim', ` · 👍 ${c.likes}`) : null)))) : null)))), link);
    } catch (e) {
      out.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message)), link);
    }
  });
  return box;
}
