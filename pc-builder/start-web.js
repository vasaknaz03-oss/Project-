'use strict';
// Запуск без Electron: сервер + открытие в браузере по умолчанию. Нужен только Node.js 18+.

const { exec } = require('child_process');
const { start } = require('./server/server');

async function run() {
  const preferred = Number(process.env.PORT) || 4780;
  let res;
  try {
    res = await start(preferred);
  } catch {
    res = await start(0); // порт занят — берём любой свободный
  }
  console.log('');
  console.log('  ПодборПК запущен: ' + res.url);
  console.log('  Чтобы закрыть — закройте это окно или нажмите Ctrl+C.');
  console.log('');
  if (process.env.NO_BROWSER) return;
  const cmd = process.platform === 'win32' ? `start "" "${res.url}"` : process.platform === 'darwin' ? `open "${res.url}"` : `xdg-open "${res.url}"`;
  exec(cmd, () => {});
}

run().catch((e) => {
  console.error('Не удалось запустить:', e.message);
  process.exit(1);
});
