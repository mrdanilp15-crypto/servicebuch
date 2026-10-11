const prisma = require('../lib/prisma');
const { decryptBuffer } = require('../utils/fileCrypto');
const { contentDisposition } = require('../utils/http');
const { readEncryptedFile } = require('../services/storage.service');
const { storeUpload, removeFiles } = require('../services/attachment.service');
const { hasVehicleAccess } = require('../middleware/auth');

// Headerbild / Profilbild eines Fahrzeugs. Wird verschlüsselt gespeichert;
// die Attachment-id dient als Verweis (Wiedergabe über
// GET /api/attachments/:id). Ein vorheriges Headerbild wird samt Datei
// entfernt, damit keine verwaisten Dateien auf der Platte zurückbleiben.
async function setHeaderImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Kein Bild hochgeladen.' });
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Als Fahrzeugbild sind nur Bilddateien erlaubt.' });
    }
    const vehicleId = req.params.vehicleId;

    const previous = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { headerImage: true } });
    const attachment = await storeUpload(req.file, { vehicleId, type: 'PHOTO' });
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { headerImage: attachment.id } });

    if (previous?.headerImage) {
      const old = await prisma.attachment.findUnique({ where: { id: previous.headerImage } });
      if (old) {
        await prisma.attachment.delete({ where: { id: old.id } });
        await removeFiles([old]);
      }
    }
    res.status(201).json({ attachmentId: attachment.id });
  } catch (err) {
    next(err);
  }
}

// Galerie: mehrere Fotos zu einem Fahrzeug.
async function addGalleryImages(req, res, next) {
  try {
    const files = (req.files || []).filter((f) => f.mimetype.startsWith('image/'));
    if (!files.length) return res.status(400).json({ error: 'Keine Bilder hochgeladen.' });
    const vehicleId = req.params.vehicleId;

    const images = [];
    for (const file of files) {
      const attachment = await storeUpload(file, { vehicleId, type: 'PHOTO' });
      images.push(await prisma.vehicleImage.create({ data: { vehicleId, url: attachment.id } }));
    }
    res.status(201).json(images);
  } catch (err) {
    next(err);
  }
}

async function deleteGalleryImage(req, res, next) {
  try {
    const image = await prisma.vehicleImage.findUnique({ where: { id: req.params.imageId } });
    if (!image || image.vehicleId !== req.params.vehicleId) {
      return res.status(404).json({ error: 'Bild nicht gefunden.' });
    }
    const attachment = await prisma.attachment.findUnique({ where: { id: image.url } });
    await prisma.vehicleImage.delete({ where: { id: image.id } });
    if (attachment) {
      await prisma.attachment.delete({ where: { id: attachment.id } });
      await removeFiles([attachment]);
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// Rechnung / Reparaturfoto zu einem Service-Eintrag.
async function addServiceAttachment(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
    const { vehicleId, serviceId } = req.params;

    // Der Service-Eintrag muss zu genau diesem Fahrzeug gehören - sonst
    // könnte ein Bearbeiter Dateien an Einträge fremder Fahrzeuge hängen.
    const service = await prisma.serviceEntry.findFirst({ where: { id: serviceId, vehicleId }, select: { id: true } });
    if (!service) return res.status(404).json({ error: 'Service-Eintrag nicht gefunden.' });

    const type = req.file.mimetype === 'application/pdf' ? 'INVOICE' : 'PHOTO';
    const attachment = await storeUpload(req.file, { vehicleId, serviceEntryId: serviceId, type });
    res.status(201).json(attachment);
  } catch (err) {
    next(err);
  }
}

// Zugriff auf eine Datei hängt am Fahrzeug, zu dem sie gehört: Lesen mit
// mindestens VIEWER, Löschen mit mindestens EDITOR. Ohne diese Prüfung
// könnte jeder eingeloggte Nutzer mit bekannter Datei-ID fremde Rechnungen
// und Fotos abrufen oder löschen.
async function loadAttachmentWithAccess(req, res, minRole) {
  const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
  // Bewusst dieselbe Antwort für "gibt es nicht" und "darfst du nicht" -
  // verrät nicht, ob eine ID existiert.
  if (!attachment || !(await hasVehicleAccess(req.user, attachment.vehicleId, minRole))) {
    res.status(404).json({ error: 'Datei nicht gefunden.' });
    return null;
  }
  return attachment;
}

async function deleteAttachment(req, res, next) {
  try {
    const attachment = await loadAttachmentWithAccess(req, res, 'EDITOR');
    if (!attachment) return;
    await prisma.attachment.delete({ where: { id: attachment.id } });
    // Falls die Datei als Headerbild verwendet wurde, Verweis entfernen.
    await prisma.vehicle.updateMany({ where: { id: attachment.vehicleId, headerImage: attachment.id }, data: { headerImage: null } });
    await removeFiles([attachment]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// Liefert eine hochgeladene Datei entschlüsselt aus (Bild/PDF).
async function serveAttachment(req, res, next) {
  try {
    const attachment = await loadAttachmentWithAccess(req, res, 'VIEWER');
    if (!attachment) return;

    let decrypted;
    try {
      const encrypted = await readEncryptedFile(attachment.fileName);
      decrypted = decryptBuffer(encrypted, attachment.iv, attachment.authTag);
    } catch (err) {
      // Datei fehlt auf der Platte (z.B. Volume nicht mit eingespielt) oder
      // lässt sich nicht entschlüsseln (anderer Schlüssel): sauberer Fehler
      // statt eines allgemeinen 500ers.
      if (err.code === 'ENOENT') return res.status(404).json({ error: 'Die Datei ist auf dem Server nicht mehr vorhanden.' });
      console.error('[attachments] Entschlüsselung fehlgeschlagen:', attachment.id, err.message);
      return res.status(410).json({ error: 'Die Datei kann nicht entschlüsselt werden (Schlüssel passt nicht).' });
    }

    // Der Inhalt hinter einer Attachment-ID ändert sich nie (ein Ersetzen
    // legt immer eine neue Attachment-ID an) - darf also aggressiv und
    // langfristig gecacht werden. "private", weil die Route
    // authentifiziert ist und der Inhalt nutzerspezifisch sein kann.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', contentDisposition('inline', attachment.originalName));
    res.send(decrypted);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  setHeaderImage,
  addGalleryImages,
  deleteGalleryImage,
  addServiceAttachment,
  deleteAttachment,
  serveAttachment,
};
