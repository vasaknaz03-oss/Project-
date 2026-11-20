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
    el('div.set-grid', telegramCard(), aiCard(), currencyCard(), pickCard(), ratesCard(), powerCard(), linksCard(), aboutCard()));
  loadSecrets();
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
  const t = document.getElementById('tgCard');
  if (t) t.replaceWith(telegramCard());
  const a = document.getElementById('aiCard');
  if (a) a.replaceWith(aiCard());
}

/** Уведомления на телефон: свой бот в Telegram (бесплатно, без регистрации где-либо ещё). */
function telegramCard() {
  const tg = sec && sec.telegram;
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

/** Общие предпочтения подбора. */
function pickCard() {
  return el('div.card',
    el('h3', 'Подбор'),
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
