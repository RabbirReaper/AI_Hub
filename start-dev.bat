@echo off
REM Start the Vite dev server and open the browser automatically.
REM Close this window or press Ctrl+C to stop the server.
cd /d "%~dp0"
call yarn dev --open
pause
