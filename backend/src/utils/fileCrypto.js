// Verschlüsselt hochgeladene Dateien (Rechnungen, Fotos) mit AES-256-GCM,
// bevor sie auf die Festplatte geschrieben werden. Der Schlüssel liegt in
// UPLOAD_ENCRYPTION_KEY (.env) - niemals im Repository.
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const hex = process.env.UPLOAD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'UPLOAD_ENCRYPTION_KEY muss ein 32-Byte Hex-String (64 Zeichen) sein. Siehe .env.example.'
    );
  }
  return Buffer.from(hex, 'hex');
}

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
}

function decryptBuffer(encrypted, ivHex, authTagHex) {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

module.exports = { encryptBuffer, decryptBuffer };
