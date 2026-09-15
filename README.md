# Digitales Servicebuch 🚗

Ein vollständiges, mobile-optimiertes digitales Servicebuch fürs Auto: Fahrzeugverwaltung,
Service-Historie mit Belegen, PDF-Export, Kilometerstand-Tracking und Push-Erinnerungen
(TÜV, Ölwechsel, Service-Intervalle, Reifenwechsel).

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
├── backend/                 Express API
│   ├── prisma/               Datenmodell (schema.prisma) + Seed-Skript
│   └── src/
│       ├── controllers/      Request-Handler
│       ├── routes/           Express-Router
│       ├── middleware/       Auth, Upload, Fehlerbehandlung
│       ├── services/         PDF-, Push-, Storage-, Reminder-Logik
│       ├── jobs/              Cron-Scheduler
│       └── utils/            JWT, Datei-Verschlüsselung
├── frontend/                 Next.js App (mobile-optimiert)
│   └── src/
│       ├── app/               Seiten (Login, Dashboard, Fahrzeuge, ...)
│       ├── components/        UI-Komponenten inkl. Fahrzeug-Tabs
│       └── lib/               API-Client
├── docker-compose.yml
└── README.md
```

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

## Voraussetzungen

- Node.js ≥ 18
- npm

## Schnellstart (lokal)

### 1. Backend

```bash
cd backend
cp .env.example .env
```

In `backend/.env` folgende Werte setzen:

- `JWT_SECRET`: ein langer, zufälliger String
- `UPLOAD_ENCRYPTION_KEY`: 32-Byte-Hex-Schlüssel, erzeugen mit:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: erzeugen mit:
  ```bash
  npm install
  npm run vapid:generate
  ```

Dann Datenbank initialisieren und Server starten:

```bash
npm install
npm run prisma:migrate -- --name init
npm run seed        # optional: Beispieldaten
npm run dev
```

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

Damit Web Push funktioniert, muss `NEXT_PUBLIC_API_URL` auf die Backend-URL zeigen und das
Backend die VAPID-Keys gesetzt haben. Push-Benachrichtigungen lassen sich auf der
Dashboard-Seite über den Schalter „Push-Benachrichtigungen aktivieren" einschalten.

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
- Rate-Limiting auf Auth-Routen und global über `express-rate-limit`, Security-Header über
  `helmet`.
- **Wichtig**: `.env`-Dateien und der `UPLOAD_ENCRYPTION_KEY` dürfen niemals ins Repository
  committet werden (siehe `.gitignore`).

## Deployment

### Option A: Docker Compose (empfohlen für Selbst-Hosting)

```bash
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
export UPLOAD_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# VAPID Keys einmalig lokal erzeugen (siehe oben, npm run vapid:generate) und exportieren:
export VAPID_PUBLIC_KEY=...
export VAPID_PRIVATE_KEY=...

docker compose up -d --build
```

Backend läuft auf Port 4000, Frontend auf Port 3000. SQLite-Datenbank und Uploads liegen in
benannten Docker-Volumes (`servicebuch_data`, `servicebuch_uploads`) und bleiben über Neustarts
hinweg erhalten. Für eine öffentliche Domain zusätzlich einen Reverse Proxy (z. B. Nginx,
Caddy oder Traefik) mit TLS-Zertifikat vor beide Services schalten – Web Push benötigt HTTPS.

**Migrationen für Docker vorbereiten**: Bevor `docker compose up` das erste Mal läuft, müssen
lokal Prisma-Migrationsdateien erzeugt werden (die dann Teil des Docker-Images sind):

```bash
cd backend
npm run prisma:migrate -- --name init
```

### Option B: Manuelles Deployment (z. B. VPS, Render, Railway, Fly.io)

1. **Backend**: `npm ci`, `npx prisma migrate deploy`, `npm start`. Alle Variablen aus
   `.env.example` als Umgebungsvariablen setzen. Für Postgres/MySQL statt SQLite:
   - `backend/prisma/schema.prisma`: `provider = "postgresql"` (bzw. `"mysql"`)
   - `DATABASE_URL` auf die Verbindungszeichenfolge des Anbieters setzen
   - `npx prisma migrate deploy` erneut ausführen
2. **Frontend**: `npm ci`, `npm run build`, `npm start` (oder `next start`). Umgebungsvariable
   `NEXT_PUBLIC_API_URL` auf die öffentliche Backend-URL setzen (Build-Zeit-Variable!).
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
