const path = require('path');
const prisma = require('../lib/prisma');
const { encryptBuffer, decryptBuffer } = require('../utils/fileCrypto');
const { saveEncryptedFile, readEncryptedFile, deleteFile } = require('../services/storage.service');

function extFor(mimeType) {
  return { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic' }[mimeType] || '.bin';
}

// Headerbild / Profilbild eines Fahrzeugs. Wird verschlüsselt gespeichert;
// die Attachment-id dient als öffentlicher Verweis (Wiedergabe über
// GET /api/attachments/:id).
async function setHeaderImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Kein Bild hochgeladen.' });
    const vehicleId = req.params.vehicleId;

    const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer);
    const fileName = await saveEncryptedFile(encrypted, extFor(req.file.mimetype));

    const attachment = await prisma.attachment.create({
      data: {
        vehicleId,
        type: 'PHOTO',
        fileName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        iv,
        authTag,
      },
    });

    await prisma.vehicle.update({ where: { id: vehicleId }, data: { headerImage: attachment.id } });
    res.status(201).json({ attachmentId: attachment.id });
  } catch (err) {
    next(err);
  }
}

// Galerie: mehrere Fotos zu einem Fahrzeug.
async function addGalleryImages(req, res, next) {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'Keine Bilder hochgeladen.' });
    const vehicleId = req.params.vehicleId;

    const images = [];
    for (const file of files) {
      const { encrypted, iv, authTag } = encryptBuffer(file.buffer);
      const fileName = await saveEncryptedFile(encrypted, extFor(file.mimetype));
      const attachment = await prisma.attachment.create({
        data: {
          vehicleId,
          type: 'PHOTO',
          fileName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          iv,
          authTag,
        },
      });
      const image = await prisma.vehicleImage.create({
        data: { vehicleId, url: attachment.id },
      });
      images.push(image);
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
      await deleteFile(attachment.fileName);
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
    const type = req.file.mimetype === 'application/pdf' ? 'INVOICE' : 'PHOTO';

    const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer);
    const fileName = await saveEncryptedFile(encrypted, extFor(req.file.mimetype));

    const attachment = await prisma.attachment.create({
      data: {
        vehicleId,
        serviceEntryId: serviceId,
        type,
        fileName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        iv,
        authTag,
      },
    });
    res.status(201).json(attachment);
  } catch (err) {
    next(err);
  }
}

async function deleteAttachment(req, res, next) {
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) return res.status(404).json({ error: 'Datei nicht gefunden.' });
    await prisma.attachment.delete({ where: { id: attachment.id } });
    await deleteFile(attachment.fileName);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// Liefert eine hochgeladene Datei entschlüsselt aus (Bild/PDF).
async function serveAttachment(req, res, next) {
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) return res.status(404).json({ error: 'Datei nicht gefunden.' });

    const encrypted = await readEncryptedFile(attachment.fileName);
    const decrypted = decryptBuffer(encrypted, attachment.iv, attachment.authTag);

    // Der Inhalt hinter einer Attachment-ID ändert sich nie (ein Ersetzen
    // legt immer eine neue Attachment-ID an) - darf also aggressiv und
    // langfristig gecacht werden. "private", weil die Route
    // authentifiziert ist und der Inhalt nutzerspezifisch sein kann.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(attachment.originalName)}"`);
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
