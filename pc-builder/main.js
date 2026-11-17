'use strict';
// Оболочка Electron: запускает локальный сервер и открывает окно приложения.

const { app, BrowserWindow, shell, net, Menu } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;

  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    const store = require('./server/store');
    store.setDir(path.join(app.getPath('userData'), 'data'));
    // net.fetch учитывает системный прокси Windows — запасной путь, если обычный запрос не прошёл
    require('./server/http').setAltFetch((url, opts) => net.fetch(url, opts));
    const { url } = await require('./server/server').start(0);

    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 980,
      minHeight: 640,
      backgroundColor: '#0b0e14',
      title: 'ПодборПК',
      icon: path.join(__dirname, 'web', 'icon.png'),
      show: false,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    win.once('ready-to-show', () => win.show());

    // Все внешние ссылки открываем в обычном браузере
    win.webContents.setWindowOpenHandler(({ url: target }) => {
      if (/^https?:\/\//.test(target)) shell.openExternal(target);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, target) => {
      if (!target.startsWith(url)) {
        e.preventDefault();
        if (/^https?:\/\//.test(target)) shell.openExternal(target);
      }
    });
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) {
        win.webContents.toggleDevTools();
      }
      if (input.type === 'keyDown' && (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r'))) {
        win.webContents.reload();
      }
    });
    win.loadURL(url);
  });

  app.on('window-all-closed', () => app.quit());
}
