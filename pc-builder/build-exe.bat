@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js не найден. Скачайте и установите LTS-версию: https://nodejs.org/
  pause
  exit /b 1
)
echo Устанавливаю зависимости...
call npm install --no-audit --no-fund
if errorlevel 1 goto fail
echo Собираю .exe (несколько минут)...
call npx electron-builder --win portable nsis --publish never
if errorlevel 1 goto fail
echo.
echo Готово! Файлы лежат в папке dist:
explorer dist
pause
exit /b 0
:fail
echo Сборка не удалась, смотрите сообщения выше.
pause
exit /b 1
