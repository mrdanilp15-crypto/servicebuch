require('dotenv').config();
const { ensureSecrets } = require('./utils/secrets');

// Muss vor allen anderen require()s laufen: erzeugt bei Bedarf JWT_SECRET,
// UPLOAD_ENCRYPTION_KEY und VAPID-Keys, bevor Module wie utils/jwt.js beim
// Laden darauf zugreifen. Dadurch startet die App ohne jede manuelle
// .env-Konfiguration (siehe utils/secrets.js).
ensureSecrets();

const app = require('./app');
const prisma = require('./lib/prisma');
const { startScheduler } = require('./jobs/scheduler');
const { ensureUploadDir } = require('./services/storage.service');

const PORT = process.env.PORT || 4000;

async function main() {
  await ensureUploadDir();
  await prisma.enableWalMode();
  startScheduler();
  app.listen(PORT, () => {
    console.log(`Servicebuch API läuft auf http://localhost:${PORT}`);
  });
}

main();
