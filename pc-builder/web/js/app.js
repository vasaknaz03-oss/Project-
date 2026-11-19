// Точка входа интерфейса.
import { el, api, money, toast, hydrateIcons, closeModal } from './util.js';
import { state, loadSettings, loadBuilds, saveSettings } from './state.js';
import { initBuild, rerenderBuild } from './build.js';
import { initSearch, rerenderSearch, openSearchFor, renderTray } from './search.js';
import { initSaved, rerenderSaved } from './saved.js';
import { initSettings, rerenderSettings } from './settings.js';
import { loadMarks } from './kufarui.js';
import { initWatch, rerenderWatch } from './watch.js';
import { initUpgrade, rerenderUpgrade } from './upgrade.js';
import { initLaptops, rerenderLaptops } from './laptops.js';

const pages = ['build', 'upgrade', 'laptops', 'search', 'watch', 'saved', 'settings'];

function go(page) {
  state.page = page;
  for (const p of pages) document.getElementById('page-' + p).hidden = p !== page;
  for (const b of document.querySelectorAll('.nav-item')) b.classList.toggle('active', b.dataset.page === page);
  if (page === 'saved') rerenderSaved();
  if (page === 'watch') rerenderWatch();
  if (page === 'upgrade') rerenderUpgrade();
  if (page === 'laptops') rerenderLaptops();
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
  document.getElementById('ratesSrc').textContent = r.source;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('themeBtn');
  btn.querySelector('[data-icon]').dataset.icon = theme === 'dark' ? 'sun' : 'moon';
  btn.querySelector('[data-icon]').innerHTML = '';
  hydrateIcons(btn);
  document.getElementById('themeLabel').textContent = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
}

async function main() {
  hydrateIcons();
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
  applyTheme(state.settings.theme || 'dark');
  document.getElementById('themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveSettings({ theme: next }).catch(() => {});
  });

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
  initSettings(document.getElementById('page-settings'), async (force) => {
    await loadRates(force);
    rerenderBuild();
    rerenderSearch();
  });
  // Оболочка может открыть сразу нужную страницу (например, по клику на уведомление)
  const startPage = new URLSearchParams(location.search).get('page');
  go(startPage && pages.includes(startPage) ? startPage : 'build');
  // обновление курсов раз в 6 часов, если приложение долго открыто
  setInterval(() => loadRates(false), 6 * 60 * 60 * 1000);
  window.__ready = true;
}

main().catch((e) => {
  document.getElementById('page-build').replaceChildren(el('div.notice.err', String(e.message || e)));
});

export { rerenderSettings };
