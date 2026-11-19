'use strict';
// Оболочка Electron: запускает локальный сервер и открывает окно приложения. Windows и macOS.

const { app, BrowserWindow, shell, net, Menu, Tray, Notification, nativeImage } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';
// Запуск вместе с системой — сразу в фон, без окна
const startHidden = process.argv.includes('--hidden');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;
  let serverUrl = null;
  let tray = null;
  let quitting = false;
  const store = require('./server/store');

  const settings = () => store.get('settings') || {};
  // Работа в фоне включена по умолчанию: при закрытии окна слежение за ценами продолжается
  const background = () => settings().background !== false;

  // ---------------- автозапуск
  function loginOpts() {
    // У переносной версии путь к .exe даёт переменная PORTABLE_EXECUTABLE_FILE
    return isMac ? {} : { path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: ['--hidden'] };
  }
  function getAutostart() {
    try {
      return !!app.getLoginItemSettings(loginOpts()).openAtLogin;
    } catch {
      return false;
    }
  }
  function setAutostart(on) {
    app.setLoginItemSettings(isMac ? { openAtLogin: !!on, openAsHidden: true } : { openAtLogin: !!on, ...loginOpts() });
    updateTrayMenu();
  }

  // ---------------- уведомления
  function notify({ title, body }, page = 'watch') {
    if (!Notification.isSupported()) return;
    const n = new Notification({ title, body, icon: isMac ? undefined : path.join(__dirname, 'web', 'icon.png') });
    n.on('click', () => showWindow(page));
    n.show();
  }

  // ---------------- значок в трее / строке меню
  function trayImage() {
    if (isMac) {
      const img = nativeImage.createFromPath(path.join(__dirname, 'web', 'tray', 'trayTemplate.png'));
      img.setTemplateImage(true);
      return img;
    }
    return nativeImage.createFromPath(path.join(__dirname, 'web', 'icon.png')).resize({ width: 16, height: 16 });
  }
  function trayMenu() {
    const watch = require('./server/watch');
    return Menu.buildFromTemplate([
      { label: 'Открыть ПодборПК', click: () => showWindow() },
      { label: 'Слежение за ценами', click: () => showWindow('watch') },
      { label: 'Проверить цены и объявления сейчас', click: () => watch.check({ force: true }).catch(() => {}) },
      { type: 'separator' },
      { label: 'Работать в фоне после закрытия окна', type: 'checkbox', checked: background(), click: (mi) => store.set('settings', { ...settings(), background: mi.checked }) },
      { label: 'Запускать вместе с системой', type: 'checkbox', checked: getAutostart(), click: (mi) => setAutostart(mi.checked) },
      { type: 'separator' },
      { label: 'Выход', click: () => { quitting = true; app.quit(); } },
    ]);
  }
  function updateTrayMenu() {
    if (tray) tray.setContextMenu(trayMenu());
  }
  function createTray() {
    if (tray) return;
    tray = new Tray(trayImage());
    tray.setToolTip('ПодборПК — слежение за ценами');
    updateTrayMenu();
    // Windows: клик по значку открывает окно (меню — правой кнопкой). На Mac клик показывает меню.
    if (!isMac) tray.on('click', () => showWindow());
  }

  function showWindow(page) {
    if (!win) {
      createWindow(page);
      return;
    }
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    if (page) win.webContents.executeJavaScript(`document.dispatchEvent(new CustomEvent('goto-page', { detail: ${JSON.stringify(page)} }))`).catch(() => {});
  }

  function buildMenu() {
    if (!isMac) {
      Menu.setApplicationMenu(null);
      return;
    }
    // На macOS меню обязательно: без «Правки» не работают Cmd+C / Cmd+V / Cmd+A в полях ввода
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [
          { role: 'about', label: `О программе ${app.name}` },
          { type: 'separator' },
          { role: 'hide', label: `Скрыть ${app.name}` },
          { role: 'hideOthers', label: 'Скрыть остальные' },
          { role: 'unhide', label: 'Показать все' },
          { type: 'separator' },
          { role: 'quit', label: `Завершить ${app.name}` },
        ],
      },
      {
        label: 'Правка',
        submenu: [
          { role: 'undo', label: 'Отменить' },
          { role: 'redo', label: 'Повторить' },
          { type: 'separator' },
          { role: 'cut', label: 'Вырезать' },
          { role: 'copy', label: 'Копировать' },
          { role: 'paste', label: 'Вставить' },
          { role: 'selectAll', label: 'Выбрать всё' },
        ],
      },
      {
        label: 'Вид',
        submenu: [
          { role: 'reload', label: 'Обновить' },
          { role: 'toggleDevTools', label: 'Инструменты разработчика' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Обычный размер' },
          { role: 'zoomIn', label: 'Увеличить' },
          { role: 'zoomOut', label: 'Уменьшить' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Полный экран' },
        ],
      },
      {
        label: 'Окно',
        submenu: [
          { role: 'minimize', label: 'Свернуть' },
          { role: 'zoom', label: 'Изменить масштаб окна' },
          { role: 'close', label: 'Закрыть окно' },
          { type: 'separator' },
          { role: 'front', label: 'Все окна — на передний план' },
        ],
      },
    ]));
  }

  function createWindow(page) {
    win = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 980,
      minHeight: 640,
      backgroundColor: '#110f0d',
      title: 'ПодборПК',
      icon: isMac ? undefined : path.join(__dirname, 'web', 'icon.png'),
      show: false,
      // На macOS — «родная» шапка: кнопки окна поверх боковой панели
      ...(isMac ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 20 } } : {}),
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => (win = null));
    // Закрытие окна при включённой работе в фоне — прячем окно, слежение продолжается
    win.on('close', (e) => {
      if (quitting || !background()) return;
      e.preventDefault();
      win.hide();
      if (!settings().bgHintShown) {
        store.set('settings', { ...settings(), bgHintShown: true });
        notify({ title: 'ПодборПК работает в фоне', body: `Слежение за ценами продолжается. Открыть программу или выйти — через значок ${isMac ? 'в строке меню вверху экрана' : 'в трее рядом с часами'}.` }, null);
      }
    });

    // Все внешние ссылки открываем в обычном браузере
    win.webContents.setWindowOpenHandler(({ url: target }) => {
      if (/^https?:\/\//.test(target)) shell.openExternal(target);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, target) => {
      if (!target.startsWith(serverUrl)) {
        e.preventDefault();
        if (/^https?:\/\//.test(target)) shell.openExternal(target);
      }
    });
    if (!isMac) {
      // На Windows меню нет, поэтому горячие клавиши обрабатываем сами (на Mac их даёт меню)
      win.webContents.on('before-input-event', (e, input) => {
        if (input.type !== 'keyDown') return;
        const key = input.key.toLowerCase();
        if (input.key === 'F12' || (input.control && input.shift && key === 'i')) win.webContents.toggleDevTools();
        if (input.key === 'F5' || (input.control && key === 'r')) win.webContents.reload();
      });
    }
    const qs = new URLSearchParams();
    if (isMac) qs.set('mac', '1');
    if (page) qs.set('page', page);
    win.loadURL(serverUrl + (qs.toString() ? '?' + qs : ''));
  }

  app.on('second-instance', () => showWindow());

  app.whenReady().then(async () => {
    store.setDir(path.join(app.getPath('userData'), 'data'));
    // net.fetch учитывает системный прокси — запасной путь, если обычный запрос не прошёл
    require('./server/http').setAltFetch((url, opts) => net.fetch(url, opts));
    if (process.platform === 'win32') app.setAppUserModelId('by.podbor.pc'); // нужно для уведомлений Windows
    const server = require('./server/server');
    server.setAppHooks({ getAutostart, setAutostart, notify });
    const { url } = await server.start(0);
    serverUrl = url;
    // Новые события слежения — системным уведомлением
    require('./server/watch').onEvent((e) => {
      if (settings().notify !== false) notify({ title: e.title, body: e.body }, 'watch');
    });
    if (isMac) app.setAboutPanelOptions({ applicationName: 'ПодборПК', copyright: 'Цены: Onliner, Kufar. Курсы: НБРБ.' });
    buildMenu();
    createTray();
    if (!startHidden) createWindow();
  });

  // macOS: клик по значку в Dock снова открывает окно
  app.on('activate', () => {
    if (serverUrl) showWindow();
  });

  // Без работы в фоне закрытие окна на Windows завершает программу; macOS — как все Mac-приложения
  app.on('window-all-closed', () => {
    if (!isMac && !background()) app.quit();
  });

  // Дописываем несохранённые данные перед выходом
  app.on('before-quit', () => {
    quitting = true;
    store.flush();
  });
}
