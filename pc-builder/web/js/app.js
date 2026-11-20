// Точка входа интерфейса.
import { el, api, money, toast, hydrateIcons, closeModal } from './util.js';
import { state, loadSettings, loadBuilds, saveSettings } from './state.js';
import { initBuild, rerenderBuild } from './build.js';
import { initSearch, rerenderSearch, openSearchFor, renderTray } from './search.js';
import { initSaved, rerenderSaved } from './saved.js';
import { initSettings, rerenderSettings } from './settings.js';
import { loadMarks } from './kufarui.js';
import { applyTheme, themeDots } from './themes.js';
import { initWatch, rerenderWatch } from './watch.js';
import { initUpgrade, rerenderUpgrade } from './upgrade.js';
import { initLaptops, rerenderLaptops } from './laptops.js';
import { initNews, rerenderNews } from './news.js';
import { initOc, rerenderOc } from './oc.js';
import { transition, navIndicator, initMotion } from './motion.js';
import { initMascot } from './mascot.js';

const pages = ['build', 'upgrade', 'laptops', 'search', 'watch', 'news', 'oc', 'saved', 'settings'];

function go(page) {
  if (state.page && state.page !== page) return transition(() => show(page), pages.indexOf(page));
  show(page);
}

function show(page) {
  const first = !state.page;
  state.page = page;
  for (const p of pages) document.getElementById('page-' + p).hidden = p !== page;
  for (const b of document.querySelectorAll('.nav-item')) b.classList.toggle('active', b.dataset.page === page);
  navIndicator();
  document.dispatchEvent(new CustomEvent('page-shown', { detail: { page, first } }));
  if (page === 'saved') rerenderSaved();
  if (page === 'watch') rerenderWatch();
  if (page === 'upgrade') rerenderUpgrade();
  if (page === 'laptops') rerenderLaptops();
  if (page === 'news') rerenderNews();
  if (page === 'oc') rerenderOc();
  renderTray();
  document.getElementById('main').scrollTop = 0;
}

async function loadRates(force = false) {
  try {
    state.rates = await api('/api/rates' + (force ? '?force=1' : ''));
    money.rates = state.rates.rates;
  } catch (e) {
    toast('Не удалось получить курсы валют: ' + e.message, 'err');
  }
  renderRates();
}

function renderRates() {
  const r = state.rates;
  const list = document.getElementById('ratesList');
  if (!r) {
    list.textContent = 'нет данных';
    return;
  }
  const show = ['USD', 'EUR', 'RUB'].filter((c) => r.rates[c]);
  list.replaceChildren(...show.flatMap((c) => {
    const scale = c === 'RUB' ? 100 : 1;
    return [el('span.k', `${scale} ${c}`), el('span.v', `${(r.rates[c] * scale).toFixed(4)} р.`)];
  }));
  const day = r.date ? new Date(r.date).toLocaleDateString('ru-RU') : '';
  document.getElementById('ratesSrc').textContent = r.source.replace(' (официальный курс)', '') + (day ? `, на ${day}` : '');
}

async function main() {
  hydrateIcons();
  initMotion();
  for (const b of document.querySelectorAll('.nav-item')) b.addEventListener('click', () => go(b.dataset.page));
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBack').addEventListener('click', (e) => e.target.id === 'modalBack' && closeModal());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());
  document.addEventListener('goto-page', (e) => go(e.detail));
  document.addEventListener('goto-search', (e) => {
    go('search');
    openSearchFor(e.detail.cat, e.detail.slot);
  });
  document.addEventListener('currency-change', () => {
    rerenderSearch();
    rerenderSaved();
  });

  try {
    await loadSettings();
  } catch {
    state.settings = {};
  }
  // Тема: по умолчанию — фирменная Iron Prince
  const pickTheme = (id) => {
    applyTheme(id);
    saveSettings({ theme: id }).catch(() => {});
  };
  // Один раз переводим со старых тем (тёмная/светлая) на новые фирменные
  if (!state.settings.themeV2) {
    const next = state.settings.theme === 'light' ? 'iron-light' : 'iron';
    state.settings.theme = next;
    saveSettings({ theme: next, themeV2: true }).catch(() => {});
  }
  applyTheme(state.settings.theme || 'iron');
  document.getElementById('themeDots').replaceChildren(...themeDots(state.settings.theme || 'iron', pickTheme));
  document.addEventListener('theme-pick', (e) => pickTheme(e.detail));
  await loadRates();
  loadBuilds().catch(() => {});
  await loadMarks();
  let lastForm = null;
  try {
    lastForm = (await api('/api/store/lastForm')).value;
  } catch {}

  initBuild(document.getElementById('page-build'), lastForm);
  initSearch(document.getElementById('page-search'));
  initSaved(document.getElementById('page-saved'));
  await initWatch(document.getElementById('page-watch'));
  await initUpgrade(document.getElementById('page-upgrade'));
  await initLaptops(document.getElementById('page-laptops'));
  initNews(document.getElementById('page-news'));
  initOc(document.getElementById('page-oc'));
  initSettings(document.getElementById('page-settings'), async (force) => {
    await loadRates(force);
    rerenderBuild();
    rerenderSearch();
  });
  // Оболочка может открыть сразу нужную страницу (например, по клику на уведомление)
  const startPage = new URLSearchParams(location.search).get('page');
  go(startPage && pages.includes(startPage) ? startPage : 'build');
  initMascot();
  // обновление курсов раз в 6 часов, если приложение долго открыто
  // Курс НБРБ меняется раз в день: проверяем каждые 30 минут, сменилась ли дата, и при смене — обновляем
  let ratesDay = new Date().toDateString();
  setInterval(() => {
    const today = new Date().toDateString();
    if (today !== ratesDay) {
      ratesDay = today;
      loadRates(true);
    } else loadRates(false);
  }, 30 * 60 * 1000);
  window.__ready = true;
}

main().catch((e) => {
  document.getElementById('page-build').replaceChildren(el('div.notice.err', String(e.message || e)));
});

export { rerenderSettings };
