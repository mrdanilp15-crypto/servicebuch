@echo off
setlocal

echo ============================================
echo   Digitales Servicebuch - wird gestartet...
echo ============================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
    echo [FEHLER] Docker wurde nicht gefunden.
    echo Bitte zuerst Docker Desktop installieren und starten:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
    echo [FEHLER] Docker Desktop laeuft nicht.
    echo Bitte Docker Desktop starten und danach dieses Skript erneut ausfuehren.
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"

echo Baue und starte Backend + Frontend (beim ersten Mal dauert das ein paar Minuten)...
docker compose up -d --build
if errorlevel 1 (
    echo.
    echo [FEHLER] Start fehlgeschlagen. Siehe Meldungen oben.
    pause
    exit /b 1
)

echo.
echo Warte, bis die App bereit ist...

set READY=0
for /l %%i in (1,1,60) do (
    curl -s -o nul -w "%%{http_code}" http://localhost:3000 2>nul | findstr /r "^2[0-9][0-9]$" >nul
    if not errorlevel 1 (
        set READY=1
        goto :ready
    )
    timeout /t 2 >nul
)

:ready
if "%READY%"=="1" (
    echo.
    echo Fertig! Die App laeuft unter http://localhost:3000
    start "" http://localhost:3000
) else (
    echo.
    echo Die Container laufen, die App hat aber noch nicht geantwortet.
    echo Oeffne in ein paar Sekunden manuell: http://localhost:3000
    echo Logs ansehen: docker compose logs -f
)

echo.
echo Zum Beenden: stop.bat doppelklicken (oder "docker compose down" ausfuehren)
echo.
pause
