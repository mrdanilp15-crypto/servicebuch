# Digitales Servicebuch 🚗

Ein vollständiges, mobile-optimiertes digitales Servicebuch fürs Auto: Fahrzeugverwaltung,
Service-Historie mit Belegen, PDF-Export, Kilometerstand-Tracking und Push-Erinnerungen
(TÜV, Ölwechsel, Service-Intervalle, Reifenwechsel).

## Sofort starten (keine Konfiguration nötig)

In allen drei Fällen gilt dasselbe: keine `.env`-Datei, keine Secrets, keine
Umgebungsvariablen. JWT-Signaturschlüssel, Verschlüsselungskey für Uploads und die
Web-Push-Schlüssel werden vom Backend beim allerersten Start automatisch erzeugt und in einem
Docker-Volume gespeichert, sodass sie bei jedem weiteren Start/Redeploy erhalten bleiben.
Danach nur noch: registrieren (der erste Account wird automatisch Admin) und loslegen.

### Option A: Portainer (Server / NAS / Homelab)

Backend und Frontend werden automatisch bei jedem Push nach `main` als fertige Images gebaut
und nach GitHub Container Registry veröffentlicht (`.github/workflows/docker-publish.yml`,
öffentlich abrufbar unter `ghcr.io/mrdanilp15-crypto/servicebuch-backend` bzw. `-frontend`).
`docker-compose.yml` referenziert diese Images direkt (`image:`, kein `build:`) – Portainer
baut also nichts selbst, sondern zieht nur die fertigen Images.

1. Portainer → **Stacks** → **Add stack**
2. Name vergeben (z. B. `servicebuch`)
3. Build method: **Web editor**
4. Inhalt von [`docker-compose.yml`](docker-compose.yml) hineinkopieren
5. **Deploy the stack**

Fertig – kein Registry-Login nötig (die Images sind öffentlich), keine Umgebungsvariablen
auszufüllen, kein Build auf deinem Server/NAS. Die App läuft danach unter
`http://<server-ip>:3000`. Ein Redeploy des Stacks in Portainer (Button **Pull and redeploy**,
oder ein Webhook dafür) zieht jeweils die neueste `:latest`-Version.

Alternativ funktioniert auch **Build method: Repository** (Repo-URL + Compose-Pfad
`docker-compose.yml`) – Portainer klont dann das Repo, findet aber trotzdem nur die
`image:`-Referenzen und zieht ebenfalls nur die fertigen Images statt selbst zu bauen.

### Option B: Docker Desktop (eigener PC/Laptop)

- **Windows**: [`start.bat`](start.bat) doppelklicken
- **macOS/Linux**: [`start.sh`](start.sh) doppelklicken (oder `./start.sh` im Terminal)

Das Skript ruft im Hintergrund `docker compose up -d --build` auf, wartet auf den
Health-Check und öffnet automatisch den Browser unter `http://localhost:3000`. Zum Beenden:
`stop.bat` bzw. `stop.sh` doppelklicken. (Für Portainer sind diese Skripte irrelevant – dort
zählt nur `docker-compose.yml`, siehe Option A.)

### Option C: Nur die Compose-Datei (jeder andere Docker-Host)

```bash
git clone https://github.com/mrdanilp15-crypto/servicebuch.git
cd servicebuch
docker compose up -d --build
```

Ohne Docker geht es auch – siehe [„Manuelle Installation ohne Docker"](#manuelle-installation-ohne-docker)
weiter unten.

> **Warum bauen B und C lokal, Portainer aber nicht?** Neben `docker-compose.yml` liegt im Repo
> auch [`docker-compose.override.yml`](docker-compose.override.yml). `docker compose` lädt diese
> Datei automatisch mit, sobald sie im selben Ordner liegt (bei B/C, weil du das Repo geklont
> hast), und baut dann aus dem Quellcode statt das Image zu pullen. Fügst du nur den Inhalt von
> `docker-compose.yml` in Portainers Web Editor ein, existiert diese zweite Datei dort nicht –
> Portainer zieht dann immer das fertige Image.

## Tech-Stack

| Bereich    | Technologie                                                        |
| ---------- | ------------------------------------------------------------------- |
| Backend    | Node.js, Express, Prisma ORM (SQLite standardmäßig, Postgres/MySQL kompatibel) |
| Frontend   | Next.js 14 (App Router), React, Tailwind CSS – mobile-first         |
| Auth       | JWT + Argon2 Passwort-Hashing                                       |
| Uploads    | Multer, AES-256-GCM verschlüsselte Ablage auf der Festplatte        |
| PDF        | PDFKit (serverseitige Generierung inkl. Bildern)                    |
| Push       | Web Push API (VAPID) + Service Worker                               |
| Jobs       | node-cron (tägliche Prüfung fälliger Erinnerungen)                  |

## Projektstruktur

```
Servicebuch/
├── .github/workflows/         Baut & published Docker-Images nach ghcr.io bei jedem Push
├── backend/                   Express API
│   ├── prisma/                 Datenmodell (schema.prisma) + Seed-Skript
│   └── src/
│       ├── controllers/        Request-Handler
│       ├── routes/             Express-Router
│       ├── middleware/         Auth, Upload, Fehlerbehandlung
│       ├── services/           PDF-, Push-, Storage-, Reminder-Logik
│       ├── jobs/                Cron-Scheduler
│       └── utils/              JWT, Datei-Verschlüsselung, Secrets-Bootstrap
├── frontend/                   Next.js App (mobile-optimiert)
│   └── src/
│       ├── app/                 Seiten (Login, Dashboard, Fahrzeuge, ...)
│       ├── components/          UI-Komponenten inkl. Fahrzeug-Tabs
│       └── lib/                 API-Client (ruft immer /api relativ auf)
├── docker-compose.yml         Pullt fertige Images von ghcr.io (für Portainer & Produktion)
├── docker-compose.override.yml  Baut lokal aus dem Quellcode (greift nur bei geklontem Repo)
├── start.bat / start.sh       Doppelklick-Starter für Docker Desktop (lokal)
├── stop.bat / stop.sh         Stoppt die App wieder
└── README.md
```

## Docker-Images

| Image | Registry | Baut bei |
| ----- | -------- | -------- |
| Backend | `ghcr.io/mrdanilp15-crypto/servicebuch-backend:latest` | jedem Push auf `main` mit Änderungen in `backend/` |
| Frontend | `ghcr.io/mrdanilp15-crypto/servicebuch-frontend:latest` | jedem Push auf `main` mit Änderungen in `frontend/` |

Beide werden von [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)
für `linux/amd64` und `linux/arm64` gebaut (läuft also auch auf Raspberry Pi / ARM-NAS) und sind
öffentlich pullbar, kein Login nötig. Manuell auslösen: GitHub → Actions → „Build and publish
Docker images" → **Run workflow**. Zusätzlich wird jedes Mal auch mit dem jeweiligen Commit-SHA
als Tag veröffentlicht, falls du eine bestimmte Version statt `:latest` fixieren willst.

## Funktionsübersicht

- **Fahrzeugverwaltung**: Kennzeichen, Hersteller, Modell, Baujahr, VIN, Headerbild, Galerie,
  Kilometerstand, Tags (Privat/Firma/Feuerwehr/Projekt).
- **Service-Einträge**: Datum, km-Stand, Art, Werkstatt, Kosten, Rechnungs-Upload (PDF/Bild),
  Reparaturfotos, Notizen, „Wichtig"-Markierung, wiederkehrende Services (erzeugt automatisch
  eine Erinnerung).
- **PDF-Export**: komplettes Servicebuch oder einzelner Eintrag, inklusive eingebetteter Fotos.
- **Push-Benachrichtigungen**: TÜV fällig, Ölwechsel fällig, Service-Intervall erreicht,
  km-Stand über Intervall, Reifenwechsel – täglicher Cron-Check plus manueller Trigger im UI.
- **Kilometerstand-Tracking**: manuelle Eingabe, Foto vom Tacho, Verlaufskurve.
- **Dashboard**: alle Fahrzeuge, fällige Services, Kosten pro Jahr, Kilometerentwicklung, Warnungen.
- **Benutzerverwaltung**: Login/Registrierung, Rollen (Admin/User), Fahrzeuge pro Nutzer mit
  Owner/Editor/Viewer-Rolle zuweisen.
- **Sicherheit**: JWT-Auth, Argon2id Passwort-Hashing, Uploads AES-256-GCM-verschlüsselt at rest,
  Rate-Limiting, Helmet-Security-Header.

## Manuelle Installation ohne Docker

Für die Weiterentwicklung am Code (nicht nötig, wenn du nur die App nutzen willst – dafür siehe
oben).

Voraussetzungen: Node.js ≥ 18, npm.

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate -- --name init
npm run seed        # optional: Beispieldaten
npm run dev
```

`JWT_SECRET`, `UPLOAD_ENCRYPTION_KEY` und die VAPID-Keys müssen in `.env` **nicht** gesetzt
werden – sie werden beim ersten Start automatisch generiert und in `backend/data/.secrets.json`
gespeichert (siehe `backend/src/utils/secrets.js`). Nur `DATABASE_URL` muss vorhanden sein
(steht schon per Default in `.env.example`).

Die API läuft auf `http://localhost:4000`. Health-Check: `GET /api/health`.

Beispiel-Logins nach `npm run seed`:

- Admin: `admin@servicebuch.local` / `Admin1234!`
- User: `user@servicebuch.local` / `User1234!`

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Die App läuft auf `http://localhost:3000` und ist für mobile Viewports (Bottom-Navigation,
Touch-optimierte Formulare) ausgelegt – am besten im Browser mit aktiviertem
Mobile-Emulationsmodus testen, oder direkt auf dem Smartphone öffnen.

Push-Benachrichtigungen lassen sich auf der Dashboard-Seite über den Schalter
„Push-Benachrichtigungen aktivieren" einschalten (VAPID-Keys generiert das Backend selbst,
siehe unten).

## API-Überblick

Alle Routen unter `/api`, JWT im Header `Authorization: Bearer <token>`.

| Bereich        | Routen (Auszug)                                                        |
| -------------- | ------------------------------------------------------------------------ |
| Auth           | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`               |
| Fahrzeuge      | `GET/POST /vehicles`, `GET/PUT/DELETE /vehicles/:id`, `POST /vehicles/:id/assign` |
| Service        | `GET/POST /vehicles/:id/services`, `PUT/DELETE .../:serviceId`, `POST .../:serviceId/attachments` |
| Kilometerstand | `GET/POST /vehicles/:id/mileage`, `POST /vehicles/:id/mileage/photo`    |
| Erinnerungen   | `GET/POST /vehicles/:id/reminders`, `PUT/DELETE .../:ruleId`             |
| PDF            | `GET /vehicles/:id/pdf`, `GET /vehicles/:id/services/:serviceId/pdf`    |
| Uploads        | `POST /vehicles/:id/uploads/header`, `POST /vehicles/:id/uploads/gallery` |
| Dateien        | `GET /attachments/:id` (entschlüsselt ausgeliefert), `DELETE /attachments/:id` |
| Push           | `GET /push/public-key`, `POST /push/subscribe`, `POST /push/unsubscribe` |
| Benachrichtigungen | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/check` |
| Dashboard      | `GET /dashboard`                                                        |
| Benutzer       | `GET /users`, `PUT /users/:id/role` (Admin), `DELETE /users/:id` (Admin) |

## Rollen & Berechtigungen

- **Systemrollen**: `ADMIN` (voller Zugriff auf alle Fahrzeuge & Benutzerverwaltung) und `USER`.
  Der erste registrierte Nutzer wird automatisch `ADMIN`.
- **Fahrzeug-Rollen** (pro Zuweisung): `OWNER` (voller Zugriff inkl. Löschen/Zuweisen),
  `EDITOR` (Service-Einträge, km-Stand, Erinnerungen, Uploads verwalten), `VIEWER` (nur
  Lesezugriff auf PDF-Export/Übersicht). Aus Einfachheitsgründen wird der Zugriff pro
  Unterressource einheitlich geprüft (nicht pro HTTP-Methode) – für produktive Nutzung mit
  vielen Viewer-Konten empfiehlt sich eine feingranularere Prüfung pro Route.

## PDF-Erstellung

- `GET /api/vehicles/:id/pdf` – komplettes Servicebuch, sortiert nach Datum, mit eingebetteten
  Fotos aus den Service-Einträgen.
- `GET /api/vehicles/:id/services/:serviceId/pdf` – einzelner Eintrag.
- Query-Parameter `?images=false`, um Bilder aus Performance-Gründen auszulassen.

## Push-Benachrichtigungen

Läuft über die Web Push API (VAPID) + Service Worker (`frontend/public/sw.js`). Ein täglicher
Cron-Job (`backend/src/jobs/scheduler.js`, 08:00 Uhr) prüft alle aktiven Erinnerungsregeln
(TÜV, Ölwechsel, Service-Intervall, km-Intervall, Reifenwechsel) und verschickt bei Fälligkeit
eine Push-Nachricht an alle zugewiesenen Nutzer. Zusätzlich lässt sich die Prüfung über
`POST /api/notifications/check` manuell auslösen (auch über den Button „Jetzt prüfen" in der
App).

> Hinweis: Web Push funktioniert in den meisten mobilen Browsern nur zuverlässig, wenn die
> Seite über HTTPS ausgeliefert wird (in der Produktion) bzw. wenn die App auf dem Homescreen
> installiert ist (iOS Safari erfordert PWA-Installation für Push).

## Sicherheit

- Passwörter werden mit **Argon2id** gehasht (`backend/src/controllers/auth.controller.js`).
- Sitzungen laufen über **JWT** (`JWT_SECRET`, konfigurierbare Gültigkeit).
- Hochgeladene Dateien (Rechnungen, Fotos, Tacho-Bilder) werden vor dem Schreiben auf die
  Festplatte mit **AES-256-GCM** verschlüsselt (`UPLOAD_ENCRYPTION_KEY`) und nur über die
  authentifizierte Route `GET /api/attachments/:id` entschlüsselt ausgeliefert.
- `JWT_SECRET`, `UPLOAD_ENCRYPTION_KEY` und die VAPID-Keys werden beim ersten Start automatisch
  generiert (`backend/src/utils/secrets.js`) und in `data/.secrets.json` (Docker-Volume bzw.
  `backend/data/` lokal) gespeichert – diese Datei ist der "Tresor" der Installation und wird
  nie ins Repository committet (siehe `.gitignore`). Bei einem Neustart mit leerem Volume
  werden neue Secrets erzeugt; bestehende JWT-Tokens werden dann ungültig und verschlüsselte
  Alt-Uploads lassen sich nicht mehr entschlüsseln – das Volume also nicht versehentlich löschen.
- Rate-Limiting auf Auth-Routen und global über `express-rate-limit`, Security-Header über
  `helmet`.

## Deployment in Produktion

Alle drei Docker-Wege oben (Portainer, Docker Desktop, `docker compose up -d --build`) landen
auf demselben Ergebnis: Backend auf Port 4000, Frontend auf Port 3000, SQLite-Datenbank,
Uploads und die automatisch generierten Secrets liegen in benannten Docker-Volumes
(`servicebuch_data`, `servicebuch_uploads`) und bleiben über Neustarts/Redeploys hinweg
erhalten (`docker compose down` bzw. das Entfernen des Portainer-Stacks behält die Volumes,
ein explizites Löschen der Volumes bzw. `docker compose down -v` löscht sie – dann sind auch
alte Logins/verschlüsselte Uploads weg).

Für eine öffentliche Domain zusätzlich einen Reverse Proxy (z. B. Nginx, Caddy, Traefik oder
Portainers eigenes Ingress-Setup) mit TLS-Zertifikat vor beide Services schalten – Web Push
benötigt HTTPS. `FRONTEND_URL` in `docker-compose.yml` auf die echte Domain anpassen (nur für
CORS relevant). Die Backend-Adresse selbst muss **nicht** angepasst werden: das Frontend ruft
immer `/api/...` relativ zur eigenen Domain auf, der Next.js-Server proxied das serverseitig
zum `backend`-Container (siehe `BACKEND_INTERNAL_URL`, `frontend/next.config.js`) – das
funktioniert unabhängig davon, unter welcher Domain/IP die App erreichbar ist, ohne Rebuild.

### Ohne Docker (z. B. VPS, Render, Railway, Fly.io)

1. **Backend**: `npm ci`, `npx prisma migrate deploy`, `npm start`. Nur `DATABASE_URL` muss
   gesetzt sein – `JWT_SECRET`, `UPLOAD_ENCRYPTION_KEY` und die VAPID-Keys generieren sich beim
   ersten Start selbst (siehe oben). Wichtig: `DATA_DIR` auf ein persistentes Volume zeigen
   lassen, damit die generierten Secrets einen Neustart/Redeploy überleben – sonst werden bei
   jedem Deploy neue erzeugt und alte JWT-Tokens/verschlüsselte Uploads ungültig. Für
   Postgres/MySQL statt SQLite:
   - `backend/prisma/schema.prisma`: `provider = "postgresql"` (bzw. `"mysql"`)
   - `DATABASE_URL` auf die Verbindungszeichenfolge des Anbieters setzen
   - `npx prisma migrate deploy` erneut ausführen
2. **Frontend**: `npm ci`, `npm run build`, `npm start` (oder `next start`). Umgebungsvariable
   `BACKEND_INTERNAL_URL` auf die (server-intern erreichbare) Backend-URL setzen – wird zur
   Laufzeit gelesen, kein Rebuild nötig, siehe `frontend/next.config.js`.
3. **Uploads**: `UPLOAD_DIR` auf ein persistentes Volume zeigen lassen (nicht auf ephemeren
   Storage bei PaaS-Anbietern ohne Volume-Unterstützung).
4. **Reverse Proxy / HTTPS**: für Produktion zwingend erforderlich (Web Push, sichere Cookies
   falls später ergänzt).

## Beispieldaten

`npm run seed` (im `backend`-Verzeichnis) legt zwei Beispiel-Fahrzeuge mit Service-Historie,
Kilometerstand-Verlauf und Erinnerungsregeln sowie einen Admin- und einen User-Account an
(siehe oben für die Zugangsdaten).

## Lizenz

MIT, siehe [LICENSE](LICENSE).
