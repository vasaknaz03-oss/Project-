// Страница «Настройки».
import { el, icon, api, money, toast } from './util.js';
import { state, saveSettings, DEFAULT_LINKS, shopLinks } from './state.js';
import { themeCards } from './themes.js';

let root;
let onRatesChanged = () => {};

export function initSettings(container, ratesCallback) {
  root = container;
  onRatesChanged = ratesCallback;
  render();
}

export function rerenderSettings() {
  if (root) render();
}

function render() {
  root.replaceChildren(
    el('div.page-head', el('div', el('h1', 'Настройки'), el('p', 'Валюта, курсы, ссылки на магазины и данные приложения.'))),
    el('div.card', { style: { marginBottom: '16px' } }, el('h3', 'Оформление'), el('p.dim.small', 'Цветовая тема программы. Сменить можно и кружками внизу боковой панели.'),
      themeCards(state.settings.theme || 'iron', (id) => document.dispatchEvent(new CustomEvent('theme-pick', { detail: id })))),
    el('div.set-grid', serverCard(), telegramCard(), aiCard(), currencyCard(), pickCard(), ratesCard(), powerCard(), linksCard(), aboutCard()));
  loadSecrets();
}

// ------------------------------------------------------------------ сервер ПодборПК

let srv = null;

async function loadServer(force = false) {
  try {
    srv = await api('/api/server/status' + (force ? '?force=1' : ''));
  } catch {
    srv = null;
  }
  document.dispatchEvent(new CustomEvent('secrets-changed'));
  refreshCards();
}

/**
 * Перерисовать карточки внешних сервисов, но только если их состояние изменилось:
 * иначе поздний ответ сервера стирал бы набранный токен и сообщение об ошибке.
 */
function refreshCards(force = false) {
  const h = srv && srv.health;
  const f = (h && h.ok && h.features) || {};
  const sigs = {
    srvCard: JSON.stringify([srv && srv.enabled, srv && srv.url, h && h.ok, h && h.version, f, srv && srv.me && srv.me.usedToday, state.settings.serverMode, state.settings.serverFetch, !!srv]),
    tgCard: JSON.stringify([sec && sec.telegram, !!sec, f.telegram, h && h.bot, state.settings.serverTelegram]),
    aiCard: JSON.stringify([sec && sec.anthropic, sec && sec.youtube, !!sec, f.ai, f.youtube]),
  };
  const make = { srvCard: serverCard, tgCard: telegramCard, aiCard };
  for (const id of Object.keys(make)) {
    const n = document.getElementById(id);
    if (!n || (!force && n.dataset.sig === sigs[id])) continue;
    const fresh = make[id]();
    fresh.dataset.sig = sigs[id];
    n.replaceWith(fresh);
  }
}

const KIND_NAMES = { research_quick: 'ИИ-поиск', research_deep: 'ИИ подробно', reviews: 'ИИ-разбор отзывов', youtube: 'видео', notify: 'уведомления' };

function serverCard() {
  const head = [el('h3', icon('store'), ' Сервер ПодборПК'),
    el('p', 'Через сервер программа получает ИИ-помощника, видео YouTube и уведомления в Telegram без собственных ключей, а данные Onliner и Kufar — из общего кэша (быстрее и без лишней нагрузки на сайты).')];
  if (!srv) {
    setTimeout(() => loadServer(), 0);
    return el('div.card.full#srvCard', head, el('div.muted', 'Проверяем связь…'));
  }
  const st = state.settings;
  const h = srv.health;
  const ok = h && h.ok;
  const f = (h && h.features) || {};
  const me = srv.me && !srv.me.error ? srv.me : null;
  const url = el('input.input', { value: st.serverUrl || '', placeholder: srv.url && !st.serverUrl ? `по умолчанию: ${srv.url}` : 'https://адрес-сервера' });
  return el('div.card.full#srvCard', head,
    !srv.enabled ? el('div.notice', icon('info'), el('div', st.serverMode === 'off' ? 'Сервер выключен — программа работает сама, со своими ключами (если заданы).' : 'Адрес сервера не задан — программа работает сама, со своими ключами (если заданы).'))
      : ok ? el('div.notice.ok', icon('check'), el('div', el('b', 'Подключено: '), srv.url, ` · версия ${h.version}. Доступно: `,
        [f.ai ? 'ИИ-помощник' : null, f.youtube ? 'YouTube' : null, f.telegram ? 'Telegram' : null, f.fetch ? 'общий кэш Onliner и Kufar' : null].filter(Boolean).join(', ') + '.'))
        : el('div.notice.err', icon('error'), el('div', `Сервер ${srv.url} не отвечает: ${(h && h.error) || 'нет связи'}. Программа пока работает сама.`)),
    me ? el('div.dim.small', { style: { margin: '6px 0' } }, `Тариф: ${me.plan === 'pro' ? 'расширенный' : 'бесплатный'}. Сегодня: `,
      Object.entries(KIND_NAMES).filter(([k]) => me.limits[k] != null).map(([k, n]) => `${n} ${me.usedToday[k] || 0}/${me.limits[k]}`).join(' · '), '. Повторные вопросы, которые уже кто-то задавал, лимит не тратят.') : null,
    el('label.check', el('input', {
      type: 'checkbox', checked: st.serverMode !== 'off',
      onchange: async (e) => { await saveSettings({ serverMode: e.target.checked ? 'auto' : 'off' }); loadServer(true); },
    }), 'Использовать сервер ПодборПК'),
    el('label.check', el('input', {
      type: 'checkbox', checked: st.serverFetch !== false,
      onchange: async (e) => { await saveSettings({ serverFetch: e.target.checked }); toast('Сохранено'); },
    }), 'Брать данные Onliner и Kufar через общий кэш сервера'),
    el('details.adv', el('summary', 'Другой адрес сервера (для своего сервера)'),
      el('div.row', { style: { gap: '8px', marginTop: '8px' } }, url,
        el('button.btn.btn-sm', { onclick: async () => { await saveSettings({ serverUrl: url.value.trim() }); toast('Адрес сохранён'); loadServer(true); } }, 'Сохранить'),
        el('button.btn.btn-sm.btn-ghost', { onclick: () => loadServer(true) }, icon('refresh'), 'Проверить'))));
}

// ------------------------------------------------------------------ внешние сервисы

let sec = null;
let linkTimer = null;

async function loadSecrets() {
  try {
    sec = await api('/api/secrets');
  } catch {
    sec = null;
  }
  document.dispatchEvent(new CustomEvent('secrets-changed'));
  refreshCards();
}

/** Уведомления через общий бот ПодборПК (сервер): одна кнопка и «Старт» в Telegram. */
function sharedTelegram(head) {
  const linked = !!state.settings.serverTelegram;
  const status = el('div');
  if (linked) {
    return el('div.card.full#tgCard', head,
      el('div.notice.ok', icon('check'), el('div', 'Подключено к боту ', el('b', '@' + srv.health.bot), '. Уведомления приходят в Telegram.')),
      el('label.check', el('input', {
        type: 'checkbox', checked: state.settings.telegramNotify !== false,
        onchange: async (e) => { await saveSettings({ telegramNotify: e.target.checked }); toast(e.target.checked ? 'Уведомления в Telegram включены' : 'Уведомления в Telegram выключены'); },
      }), 'Присылать уведомления слежения в Telegram'),
      el('div.row', { style: { marginTop: '10px' } },
        el('button.btn.btn-sm', { onclick: async () => { try { await api('/api/telegram/shared/test', { method: 'POST' }); toast('Отправлено — проверьте Telegram'); } catch (e) { toast(e.message, 'err'); } } }, icon('bell'), 'Прислать проверку'),
        el('button.btn.btn-sm.btn-ghost', { onclick: async () => { await api('/api/telegram/shared/unlink', { method: 'POST' }).catch(() => {}); await saveSettings({ serverTelegram: false }); loadServer(); toast('Telegram отключён'); } }, icon('trash'), 'Отключить')));
  }
  return el('div.card.full#tgCard', head,
    el('p', 'Нажмите кнопку — откроется Telegram с ботом ПодборПК. Нажмите в нём «Старт», и всё готово.'),
    el('button.btn.btn-primary', {
      onclick: async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        try {
          const r = await api('/api/telegram/shared/link', { method: 'POST' });
          window.open(r.url, '_blank');
          status.replaceChildren(el('div.notice', icon('info'), el('div', 'Если Telegram не открылся — ', el('a', { href: r.url, target: '_blank', rel: 'noopener' }, 'откройте ссылку'), ' и нажмите «Старт». Программа ждёт…')));
          const t0 = Date.now();
          clearInterval(linkTimer);
          linkTimer = setInterval(async () => {
            if (Date.now() - t0 > 5 * 60 * 1000) { clearInterval(linkTimer); btn.disabled = false; return; }
            const s2 = await api('/api/telegram/shared/status').catch(() => null);
            if (s2 && s2.linked) {
              clearInterval(linkTimer);
              await saveSettings({ serverTelegram: true });
              toast('Telegram подключён');
              loadServer();
            }
          }, 2500);
        } catch (err) {
          btn.disabled = false;
          status.replaceChildren(el('div.notice.err', icon('error'), el('div', err.message)));
        }
      },
    }, icon('bell'), 'Подключить Telegram'),
    status);
}

/** Уведомления на телефон: общий бот сервера или свой бот в Telegram. */
function telegramCard() {
  const tg = sec && sec.telegram;
  const shared = srv && srv.health && srv.health.ok && srv.health.features && srv.health.features.telegram && srv.health.bot;
  if (shared && !(tg && tg.connected)) {
    return sharedTelegram([el('h3', icon('bell'), ' Уведомления на телефон (Telegram)'),
      el('p', 'Сообщения о снижении цен и новых выгодных объявлениях Kufar будут приходить в Telegram — даже когда вы не за компьютером (программа при этом должна быть запущена, можно в фоне).')]);
  }
  const head = [el('h3', icon('bell'), ' Уведомления на телефон (Telegram)'),
    el('p', 'Сообщения о снижении цен и новых выгодных объявлениях Kufar будут приходить в Telegram — даже когда вы не за компьютером (программа при этом должна быть запущена, можно в фоне).')];
  if (!sec) return el('div.card.full#tgCard', head, el('div.muted', 'Загрузка…'));
  if (tg.connected) {
    return el('div.card.full#tgCard', head,
      el('div.notice.ok', icon('check'), el('div', 'Подключено: бот ', el('b', '@' + tg.bot), '. Уведомления приходят в ваш чат с ним.')),
      el('label.check', el('input', {
        type: 'checkbox', checked: state.settings.telegramNotify !== false,
        onchange: async (e) => { await saveSettings({ telegramNotify: e.target.checked }); toast(e.target.checked ? 'Уведомления в Telegram включены' : 'Уведомления в Telegram выключены'); },
      }), 'Присылать уведомления слежения в Telegram'),
      el('div.row', { style: { marginTop: '10px' } },
        el('button.btn.btn-sm', { onclick: async () => { try { await api('/api/telegram/test', { method: 'POST' }); toast('Отправлено — проверьте Telegram'); } catch (e) { toast(e.message, 'err'); } } }, icon('bell'), 'Прислать проверку'),
        el('button.btn.btn-sm.btn-ghost', { onclick: async () => { sec = await api('/api/telegram/disconnect', { method: 'POST' }); loadSecrets(); toast('Telegram отключён'); } }, icon('trash'), 'Отключить')));
  }
  const token = el('input.input', { type: 'password', placeholder: 'Токен бота: 123456789:AAH…', autocomplete: 'off' });
  const status = el('div');
  const waitStart = (bot, linkUrl) => {
    clearInterval(linkTimer);
    status.replaceChildren(el('div.notice', icon('info'), el('div',
      el('b', 'Последний шаг: '), 'откройте своего бота ', el('a', { href: linkUrl, target: '_blank', rel: 'noopener' }, '@' + bot + ' ↗'),
      ' и нажмите «Старт» (или отправьте ему любое сообщение). Программа ждёт…')));
    const t0 = Date.now();
    linkTimer = setInterval(async () => {
      if (Date.now() - t0 > 5 * 60 * 1000) {
        clearInterval(linkTimer);
        status.replaceChildren(el('div.notice.err', icon('error'), el('div', 'Не дождались сообщения боту. Нажмите «Старт» у бота и затем «Подключить» ещё раз.')));
        return;
      }
      try {
        const r = await api('/api/telegram/link', { method: 'POST' });
        if (r.linked) {
          clearInterval(linkTimer);
          toast('Telegram подключён — проверочное сообщение уже в чате');
          loadSecrets();
        }
      } catch (e) {
        clearInterval(linkTimer);
        status.replaceChildren(el('div.notice.err', icon('error'), el('div', e.message)));
      }
    }, 2500);
  };
  return el('div.card.full#tgCard', head,
    el('ol.steps',
      el('li', 'Откройте в Telegram ', el('a', { href: 'https://t.me/BotFather', target: '_blank', rel: 'noopener' }, '@BotFather ↗'), ', отправьте ', el('code', '/newbot'), ', придумайте имя (любое) и адрес бота (должен заканчиваться на «bot»).'),
      el('li', 'BotFather пришлёт токен — длинную строку вида ', el('code', '123456789:AAH…'), '. Скопируйте её сюда.'),
      el('li', 'Нажмите «Подключить», затем откройте своего бота и нажмите «Старт».')),
    el('div.row', { style: { gap: '8px' } }, token,
      el('button.btn.btn-primary', {
        onclick: async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true;
          try {
            const r = await api('/api/telegram/connect', { method: 'POST', body: { token: token.value } });
            waitStart(r.bot, r.link);
          } catch (err) {
            status.replaceChildren(el('div.notice.err', icon('error'), el('div', err.message)));
          }
          btn.disabled = false;
        },
      }, 'Подключить')),
    el('p.dim.small', 'Токен хранится только на этом компьютере. Бот ваш личный: писать в него будет только программа.'),
    status);
}

/** ИИ-помощник (Claude) и YouTube: читают форумы, статьи, обзоры и отзывы и делают выжимку со ссылками. */
function aiCard() {
  const head = [el('h3', icon('sparkles'), ' ИИ-помощник и YouTube'),
    el('p', 'С ключом Anthropic программа сама ищет в интернете — на форумах (Overclockers.ru, Reddit, iXBT…), в статьях и обзорах, в рассказах людей о своих сборках и разгоне — и пишет понятную выжимку со ссылками на источники. Отзывы покупателей она тоже разбирает по смыслу, а не по ключевым словам. С ключом YouTube в программе видны обзоры и комментарии зрителей.')];
  if (!sec) return el('div.card.full#aiCard', head, el('div.muted', 'Загрузка…'));
  const sf = srv && srv.health && srv.health.ok ? srv.health.features || {} : {};
  if (sf.ai || sf.youtube) {
    head.push(el('div.notice.ok', icon('check'), el('div', 'Работает через сервер ПодборПК — ключи не нужны', sf.ai && sf.youtube ? '' : sf.ai ? ' (ИИ)' : ' (YouTube)',
      '. Свой ключ можно вставить ниже, если хотите без дневных лимитов сервера (оплата — в вашем аккаунте).')));
  }
  const keyRow = (label, field, info, placeholder, help) => {
    const inp = el('input.input', { type: 'password', placeholder: info.set ? `ключ задан (${info.tail}) — вставьте новый, чтобы заменить` : placeholder, autocomplete: 'off' });
    return el('div.field',
      el('label', label, info.set ? el('span.chip.ok', { style: { marginLeft: '8px' } }, 'подключено') : null),
      el('div.row', { style: { gap: '8px' } }, inp,
        el('button.btn.btn-sm.btn-primary', {
          onclick: async () => {
            if (!inp.value.trim()) return toast('Вставьте ключ', 'err');
            sec = await api('/api/secrets', { method: 'POST', body: { [field]: inp.value.trim() } });
            toast('Ключ сохранён');
            loadSecrets();
          },
        }, 'Сохранить'),
        info.set ? el('button.btn.btn-sm.btn-ghost', { onclick: async () => { sec = await api('/api/secrets', { method: 'POST', body: { [field]: '' } }); toast('Ключ удалён'); loadSecrets(); } }, 'Удалить') : null),
      el('div.dim.small', help));
  };
  return el('div.card.full#aiCard', head,
    keyRow('Ключ Anthropic (Claude)', 'anthropicKey', sec.anthropic, 'sk-ant-…',
      el('span', 'Где взять: ', el('a', { href: 'https://console.anthropic.com/settings/keys', target: '_blank', rel: 'noopener' }, 'console.anthropic.com → API Keys ↗'),
        '. Запросы платные: оплата по факту использования в аккаунте Anthropic (обычно центы за один разбор).')),
    keyRow('Ключ YouTube Data API (необязательно)', 'youtubeKey', sec.youtube, 'AIza…',
      el('span', 'Бесплатно: ', el('a', { href: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com', target: '_blank', rel: 'noopener' }, 'Google Cloud → YouTube Data API v3 ↗'),
        ' → «Включить» → «Учётные данные» → «Создать ключ API».')),
    el('p.dim.small', 'Ключи хранятся только на этом компьютере и используются только для запросов к Anthropic и Google.'));
}

/** Общие предпочтения подбора и интерфейса. */
function pickCard() {
  return el('div.card',
    el('h3', 'Интерфейс'),
    el('label.check', el('input', {
      type: 'checkbox', checked: state.settings.mascot !== false,
      onchange: async (e) => { await saveSettings({ mascot: e.target.checked, mascotSeen: e.target.checked ? [] : state.settings.mascotSeen }); toast(e.target.checked ? 'Байт снова будет подсказывать' : 'Подсказки выключены'); },
    }), 'Подсказки персонажа «Байт»'),
    el('label.check', el('input', {
      type: 'checkbox', checked: state.settings.animations !== false,
      onchange: async (e) => { await saveSettings({ animations: e.target.checked }); document.documentElement.classList.toggle('no-motion', !e.target.checked); },
    }), 'Анимации переключений'),
    el('h3', { style: { marginTop: '14px' } }, 'Подбор'),
    el('label.check', el('input', {
      type: 'checkbox', checked: !!state.settings.trustedOnly,
      onchange: async (e) => { await saveSettings({ trustedOnly: e.target.checked }); toast(e.target.checked ? 'Подбор берёт только известные бренды' : 'Китайские и малоизвестные бренды снова участвуют в подборе'); },
    }), 'Только известные бренды'),
    el('p.dim.small', 'Исключить малоизвестные (часто китайские) видеокарты, платы, память и SSD. Без галочки они участвуют в подборе, но известный бренд выигрывает при близкой цене.'));
}

/** Тариф и часы использования — для расчёта счёта за электроэнергию в сборке. */
function powerCard() {
  const st = state.settings;
  const field = (key, label, def, step, hint) => el('div.field', el('label', label),
    el('input.input', {
      type: 'number', min: '0', step, value: st[key] != null ? st[key] : def,
      onchange: async (e) => { await saveSettings({ [key]: +e.target.value }); toast('Сохранено'); },
    }), hint ? el('div.dim.small', hint) : null);
  return el('div.card',
    el('h3', 'Электроэнергия'),
    el('p', 'Для оценки, сколько сборка будет стоить по свету в месяц (показывается в карточке «Питание и охлаждение»).'),
    field('tariff', 'Тариф, р. за кВт·ч', 0.27, '0.01', 'Посмотрите в квитанции за электроэнергию'),
    field('gameHours', 'Часов игр в день', 4, '0.5'),
    field('officeHours', 'Часов работы, учёбы, браузера в день', 4, '0.5'));
}

function currencyCard() {
  const sel = el('select.select', {
    onchange: async (e) => {
      await saveSettings({ currency: e.target.value });
      toast('Валюта по умолчанию сохранена');
    },
  }, (state.rates ? state.rates.currencies : [{ code: 'BYN', name: 'Белорусский рубль' }]).map((c) => el('option', { value: c.code }, `${c.code} — ${c.name}`)));
  sel.value = state.settings.currency || 'BYN';
  return el('div.card', el('h3', 'Валюта по умолчанию'), el('p', 'В ней вводится бюджет и показываются цены. Сменить можно и прямо в форме подбора.'), sel);
}

function ratesCard() {
  const r = state.rates;
  const manual = state.settings.manualRates || {};
  const codes = r ? r.currencies.map((c) => c.code).filter((c) => c !== 'BYN') : ['USD', 'EUR', 'RUB'];
  const inputs = {};
  const rows = codes.map((code) => {
    inputs[code] = el('input.input', { type: 'number', step: 'any', min: '0', placeholder: 'авто', value: manual[code] || '' });
    return [el('b', code), el('span.muted.small', r && r.rates[code] ? `НБ/авто: ${(+r.rates[code]).toFixed(code === 'RUB' || code === 'KZT' || code === 'UAH' ? 5 : 4)} р.` : ''), inputs[code]];
  });
  return el('div.card',
    el('h3', 'Курсы валют'),
    el('p', r ? `Источник: ${r.source}${r.date ? ', ' + new Date(r.date).toLocaleDateString('ru-RU') : ''}. Можно задать свой курс (BYN за 1 единицу), например курс вашего банка.` : 'Загрузка…'),
    el('div.rate-edit', rows.flat()),
    el('div.row', { style: { marginTop: '14px' } },
      el('button.btn.btn-primary.btn-sm', {
        onclick: async () => {
          const m = {};
          for (const [k, inp] of Object.entries(inputs)) if (inp.value && +inp.value > 0) m[k] = +inp.value;
          await saveSettings({ manualRates: m });
          await onRatesChanged(true);
          toast('Курсы сохранены');
          render();
        },
      }, 'Сохранить курсы'),
      el('button.btn.btn-sm', {
        onclick: async () => {
          await onRatesChanged(true);
          toast('Курсы обновлены');
          render();
        },
      }, icon('refresh'), 'Обновить с НБРБ')));
}

function linksCard() {
  let links = shopLinks().map((l) => ({ ...l }));
  const box = el('div');
  const draw = () => {
    box.replaceChildren(...links.map((l, i) => el('div.link-edit',
      el('input.input', { value: l.name, placeholder: 'Название', oninput: (e) => (l.name = e.target.value) }),
      el('input.input', { value: l.url, placeholder: 'https://…{q}…', oninput: (e) => (l.url = e.target.value) }),
      el('button.icon-btn', { title: 'Удалить', onclick: () => { links.splice(i, 1); draw(); } }, icon('trash')))));
  };
  draw();
  return el('div.card.full',
    el('h3', 'Ссылки на магазины'),
    el('p', 'Кнопки «искать также на…» в поиске и у каждой детали. {q} заменяется на название товара. Если магазин поменял адрес поиска, поправьте здесь.'),
    box,
    el('div.row', { style: { marginTop: '6px' } },
      el('button.btn.btn-sm', { onclick: () => { links.push({ name: '', url: 'https://' }); draw(); } }, icon('plus'), 'Добавить'),
      el('button.btn.btn-primary.btn-sm', {
        onclick: async () => {
          const clean = links.filter((l) => l.name.trim() && /^https?:\/\//.test(l.url) && l.url.includes('{q}'));
          await saveSettings({ shopLinks: clean });
          toast('Ссылки сохранены');
          render();
        },
      }, 'Сохранить'),
      el('button.btn.btn-ghost.btn-sm', { onclick: async () => { links = DEFAULT_LINKS.map((l) => ({ ...l })); await saveSettings({ shopLinks: [] }); draw(); toast('Ссылки сброшены'); } }, 'По умолчанию')));
}

function aboutCard() {
  const info = el('p.small.muted', '');
  api('/api/info').then((i) => (info.textContent = `Версия ${i.version}. Данные (сборки, настройки) хранятся в папке: ${i.dataDir}`)).catch(() => {});
  return el('div.card.full',
    el('h3', 'О программе'),
    el('p', 'ПодборПК берёт цены из открытого каталога Onliner (минимальная цена среди магазинов) и объявлений Kufar. Производительность процессоров и видеокарт — усреднённая оценка по тестам, она нужна для сравнения вариантов, а не для точного FPS. Перед покупкой проверяйте наличие и характеристики на странице магазина.'),
    info,
    el('div.row', { style: { marginTop: '10px' } },
      el('button.btn.btn-sm', {
        onclick: async () => {
          await api('/api/cache/clear', { method: 'POST' });
          toast('Кэш очищен: следующий подбор загрузит свежие цены');
        },
      }, icon('refresh'), 'Очистить кэш цен')));
}

export { money };
