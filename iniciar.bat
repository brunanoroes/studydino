@echo off
echo 🦕 Iniciando StudyDino...
echo.
echo [1/2] Iniciando servidor backend (porta 3001)...
start "StudyDino Backend" cmd /k "cd /d "%~dp0backend" && node index.js"
timeout /t 2 /nobreak >nul
echo [2/2] Iniciando frontend (porta 5173)...
start "StudyDino Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul
echo.
echo ✅ StudyDino iniciado!
echo    Acesse: http://localhost:5173
echo.
start http://localhost:5173
