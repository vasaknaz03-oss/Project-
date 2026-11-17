#!/bin/bash
# ПодборПК для macOS: запуск в браузере. Нужен только Node.js (https://nodejs.org/).
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  # Node.js из официального установщика или Homebrew может не попасть в PATH двойного клика
  for p in /usr/local/bin /opt/homebrew/bin; do [ -x "$p/node" ] && export PATH="$p:$PATH"; done
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js не найден. Скачайте LTS-версию с https://nodejs.org/ и запустите этот файл снова."
  open "https://nodejs.org/"
  read -r -p "Нажмите Enter, чтобы закрыть..."
  exit 1
fi
node start-web.js
