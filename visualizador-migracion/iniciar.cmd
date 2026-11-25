@echo off
rem Doble clic para levantar el visualizador y abrirlo en el navegador.
rem Si ya hay una copia vieja del servidor en el puerto 4173, la cierra para arrancar la version actual.
cd /d "%~dp0"
where node >nul 2>nul || (echo No encuentro Node.js. Instalalo desde https://nodejs.org & pause & exit /b 1)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4173 " ^| findstr LISTENING') do (
  echo Cerrando el servidor anterior que usaba el puerto 4173 ^(PID %%a^)...
  taskkill /F /PID %%a >nul 2>nul
)
start "" http://127.0.0.1:4173
node server.js 4173
pause
