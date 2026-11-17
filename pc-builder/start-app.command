#!/bin/bash
# ПодборПК для macOS: запуск в окне приложения (Electron). Нужен Node.js (https://nodejs.org/).
cd "$(dirname "$0")" || exit 1
for p in /usr/local/bin /opt/homebrew/bin; do [ -x "$p/node" ] && export PATH="$p:$PATH"; done
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js не найден. Скачайте LTS-версию с https://nodejs.org/ и запустите этот файл снова."
  open "https://nodejs.org/"
  read -r -p "Нажмите Enter, чтобы закрыть..."
  exit 1
fi
if [ ! -d node_modules/electron ]; then
  echo "Первый запуск: устанавливаю зависимости, это займёт 1–3 минуты..."
  npm install --no-audit --no-fund || { echo "Не удалось установить. Попробуйте start-browser.command"; read -r -p "Enter..."; exit 1; }
fi
npm start
