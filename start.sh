#!/usr/bin/env bash
# Digitales Servicebuch starten - keine manuelle Konfiguration nötig.
# Doppelklick (macOS: "Terminal öffnen" beim Ausführen erlauben) oder:
#   chmod +x start.sh && ./start.sh
set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  Digitales Servicebuch - wird gestartet..."
echo "============================================"
echo

if ! command -v docker >/dev/null 2>&1; then
  echo "[FEHLER] Docker wurde nicht gefunden."
  echo "Bitte zuerst Docker Desktop installieren und starten:"
  echo "https://www.docker.com/products/docker-desktop/"
  read -r -p "Enter zum Beenden..." _
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "[FEHLER] Docker läuft nicht. Bitte Docker Desktop starten und dieses Skript erneut ausführen."
  read -r -p "Enter zum Beenden..." _
  exit 1
fi

echo "Baue und starte Backend + Frontend (beim ersten Mal dauert das ein paar Minuten)..."
docker compose up -d --build

echo
echo "Warte, bis die App bereit ist..."
ready=0
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true)
  if [[ "$code" == 2* ]]; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" == "1" ]]; then
  echo
  echo "Fertig! Die App läuft unter http://localhost:3000"
  ( command -v open >/dev/null 2>&1 && open http://localhost:3000 ) || \
  ( command -v xdg-open >/dev/null 2>&1 && xdg-open http://localhost:3000 ) || true
else
  echo
  echo "Die Container laufen, die App hat aber noch nicht geantwortet."
  echo "Öffne in ein paar Sekunden manuell: http://localhost:3000"
  echo "Logs ansehen: docker compose logs -f"
fi

echo
echo "Zum Beenden: ./stop.sh (oder: docker compose down)"
read -r -p "Enter zum Schließen..." _
