#!/bin/bash
# ПодборПК: сборка .dmg для macOS (Apple Silicon и Intel). Нужен Node.js.
cd "$(dirname "$0")" || exit 1
for p in /usr/local/bin /opt/homebrew/bin; do [ -x "$p/node" ] && export PATH="$p:$PATH"; done
command -v npm >/dev/null 2>&1 || { echo "Нужен Node.js: https://nodejs.org/"; read -r -p "Enter..."; exit 1; }
echo "Устанавливаю зависимости..."
npm install --no-audit --no-fund || { read -r -p "Ошибка. Enter..."; exit 1; }
echo "Собираю .dmg (несколько минут)..."
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac dmg --arm64 --x64 --publish never || { read -r -p "Ошибка. Enter..."; exit 1; }
echo "Готово: файлы в папке dist"
open dist
