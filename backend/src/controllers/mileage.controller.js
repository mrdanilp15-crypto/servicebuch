const { z } = require('zod');
const prisma = require('../lib/prisma');
const { encryptBuffer } = require('../utils/fileCrypto');
const { saveEncryptedFile } = require('../services/storage.service');

const mileageSchema = z.object({
  date: z.coerce.date().optional(),
  mileage: z.coerce.number().int().min(0),
});

// Verlauf für die Kilometerstand-Kurve im Dashboard.
async function listMileage(req, res, next) {
  try {
    const entries = await prisma.mileageEntry.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { date: 'asc' },
    });
    res.json(entries);
  } catch (err) {
    next(err);
  }
}

async function addMileage(req, res, next) {
  try {
    const data = mileageSchema.parse(req.body);
    const vehicleId = req.params.vehicleId;

    const entry = await prisma.mileageEntry.create({
      data: { vehicleId, mileage: data.mileage, date: data.date ?? new Date(), source: 'MANUAL' },
    });

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (data.mileage > vehicle.currentMileage) {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { currentMileage: data.mileage } });
    }

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

// Kilometerstand per Tacho-Foto: Bild wird verschlüsselt gespeichert, der
// tatsächliche Stand wird (vorerst) manuell im selben Request mitgegeben -
// eine echte OCR-Auswertung kann hier später angebunden werden.
async function addMileagePhoto(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Kein Foto hochgeladen.' });
    const mileage = Number(req.body.mileage);
    if (!Number.isFinite(mileage)) {
      return res.status(400).json({ error: 'mileage (Kilometerstand) ist erforderlich.' });
    }
    const vehicleId = req.params.vehicleId;

    const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer);
    const fileName = await saveEncryptedFile(encrypted);

    const attachment = await prisma.attachment.create({
      data: {
        vehicleId,
        type: 'ODOMETER',
        fileName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        iv,
        authTag,
      },
    });

    const entry = await prisma.mileageEntry.create({
      data: { vehicleId, mileage, date: new Date(), source: 'PHOTO', photoPath: attachment.id },
    });

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (mileage > vehicle.currentMileage) {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { currentMileage: mileage } });
    }

    res.status(201).json({ entry, attachment: { id: attachment.id } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMileage, addMileage, addMileagePhoto };
