@echo off
cd /d "%~dp0"
echo Stoppe Digitales Servicebuch...
docker compose down
echo.
echo Gestoppt. Deine Daten (Datenbank, Uploads, Secrets) bleiben erhalten.
pause
