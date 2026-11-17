'use strict';
// Оболочка Electron: запускает локальный сервер и открывает окно приложения. Windows и macOS.

const { app, BrowserWindow, shell, net, Menu } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;
  let serverUrl = null;
  const store = require('./server/store');

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

  function createWindow() {
    win = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 980,
      minHeight: 640,
      backgroundColor: '#0b0e14',
      title: 'ПодборПК',
      icon: isMac ? undefined : path.join(__dirname, 'web', 'icon.png'),
      show: false,
      // На macOS — «родная» шапка: кнопки окна поверх боковой панели
      ...(isMac ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 20 } } : {}),
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => (win = null));

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
    win.loadURL(serverUrl + (isMac ? '?mac=1' : ''));
  }

  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    store.setDir(path.join(app.getPath('userData'), 'data'));
    // net.fetch учитывает системный прокси — запасной путь, если обычный запрос не прошёл
    require('./server/http').setAltFetch((url, opts) => net.fetch(url, opts));
    const { url } = await require('./server/server').start(0);
    serverUrl = url;
    if (isMac) app.setAboutPanelOptions({ applicationName: 'ПодборПК', copyright: 'Цены: Onliner, Kufar. Курсы: НБРБ.' });
    buildMenu();
    createWindow();
  });

  // macOS: клик по значку в Dock снова открывает окно
  app.on('activate', () => {
    if (!win && serverUrl) createWindow();
  });

  // macOS: закрытие окна не завершает программу (как у всех Mac-приложений)
  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });

  // Дописываем несохранённые данные перед выходом
  app.on('before-quit', () => store.flush());
}
