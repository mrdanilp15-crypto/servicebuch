// Gemeinsame Logik für hochgeladene Dateien: bereinigen (EXIF entfernen),
// verschlüsseln, ablegen, in der Datenbank erfassen - und beim Löschen
// auch die Dateien selbst von der Platte entfernen.
const prisma = require('../lib/prisma');
const { encryptBuffer } = require('../utils/fileCrypto');
const { sanitizeUpload } = require('../utils/image');
const { saveEncryptedFile, deleteFile } = require('./storage.service');

const EXT = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

// multer (busboy) liest Dateinamen als Latin-1, Browser senden sie aber als
// UTF-8 - aus "Rechnung Müller.pdf" würde sonst "Rechnung MÃ¼ller.pdf".
function decodeFileName(name) {
  const raw = String(name || 'datei');
  const utf8 = Buffer.from(raw, 'latin1').toString('utf8');
  return utf8.includes('�') ? raw : utf8;
}

// Speichert eine von multer (memoryStorage) gelieferte Datei und legt den
// zugehörigen Attachment-Datensatz an.
async function storeUpload(file, { vehicleId, serviceEntryId = null, type }) {
  const { buffer, mimeType } = await sanitizeUpload(file.buffer, file.mimetype);
  const { encrypted, iv, authTag } = encryptBuffer(buffer);
  const fileName = await saveEncryptedFile(encrypted, EXT[mimeType] || '.bin');

  return prisma.attachment.create({
    data: {
      vehicleId,
      serviceEntryId,
      type,
      fileName,
      // Nur der Dateiname, kein evtl. vom Client mitgeschickter Pfad.
      originalName: decodeFileName(file.originalname).split(/[\\/]/).pop().slice(0, 200),
      mimeType,
      size: buffer.length,
      iv,
      authTag,
    },
  });
}

// Löscht die verschlüsselten Dateien zu den übergebenen Attachment-Datensätzen
// von der Platte. Die Datenbankzeilen müssen separat entfernt werden (bei
// Fahrzeug/Service-Eintrag per Cascade). Fehler beim Löschen einzelner
// Dateien brechen nichts ab - schlimmstenfalls bleibt eine verwaiste Datei.
async function removeFiles(attachments) {
  await Promise.all(
    attachments.map((a) =>
      deleteFile(a.fileName).catch((err) => console.error('[storage] Datei konnte nicht gelöscht werden:', a.fileName, err.message))
    )
  );
}

module.exports = { storeUpload, removeFiles };
