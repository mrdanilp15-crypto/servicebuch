#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "Stoppe Digitales Servicebuch..."
docker compose down
echo
echo "Gestoppt. Deine Daten (Datenbank, Uploads, Secrets) bleiben erhalten."
read -r -p "Enter zum Schließen..." _
