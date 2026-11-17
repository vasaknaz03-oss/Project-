@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js не найден. Скачайте и установите LTS-версию: https://nodejs.org/
  start "" https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules\electron (
  echo Первый запуск: устанавливаю зависимости, это займёт 1-3 минуты...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Не удалось установить зависимости. Попробуйте start-browser.bat
    pause
    exit /b 1
  )
)
call npm start
