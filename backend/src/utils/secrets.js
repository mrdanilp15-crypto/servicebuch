// Sorgt dafür, dass die App ohne jede manuelle Konfiguration startet:
// JWT_SECRET, UPLOAD_ENCRYPTION_KEY und die VAPID-Keys werden beim allerersten
// Start automatisch generiert und in eine lokale Datei geschrieben
// (DATA_DIR/.secrets.json). Bei jedem weiteren Start werden dieselben Werte
// wiederverwendet, damit bestehende Logins/Tokens und verschlüsselte
// Uploads gültig bleiben. Wer die Werte selbst kontrollieren möchte, kann
// die entsprechenden Umgebungsvariablen (siehe .env.example) setzen - diese
// haben immer Vorrang und werden nie überschrieben.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function secretsFilePath() {
  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
  return path.join(dataDir, '.secrets.json');
}

function ensureSecrets() {
  const file = secretsFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  let stored = {};
  if (fs.existsSync(file)) {
    try {
      stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      stored = {};
    }
  }

  let changed = false;
  const setIfMissing = (key, generate) => {
    if (process.env[key]) return; // explizite Konfiguration hat immer Vorrang
    if (!stored[key]) {
      stored[key] = generate();
      changed = true;
    }
    process.env[key] = stored[key];
  };

  setIfMissing('JWT_SECRET', () => crypto.randomBytes(48).toString('hex'));
  setIfMissing('UPLOAD_ENCRYPTION_KEY', () => crypto.randomBytes(32).toString('hex'));

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    if (!stored.VAPID_PUBLIC_KEY || !stored.VAPID_PRIVATE_KEY) {
      const webpush = require('web-push');
      const keys = webpush.generateVAPIDKeys();
      stored.VAPID_PUBLIC_KEY = keys.publicKey;
      stored.VAPID_PRIVATE_KEY = keys.privateKey;
      changed = true;
    }
    process.env.VAPID_PUBLIC_KEY = stored.VAPID_PUBLIC_KEY;
    process.env.VAPID_PRIVATE_KEY = stored.VAPID_PRIVATE_KEY;
  }

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(stored, null, 2), { mode: 0o600 });
    console.log(`[bootstrap] Neue Secrets automatisch generiert und gespeichert unter: ${file}`);
  }
}

module.exports = { ensureSecrets, secretsFilePath };
