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
rem Режим без Electron: нужен только Node.js, приложение откроется в браузере
node start-web.js
pause
