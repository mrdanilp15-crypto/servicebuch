const { z } = require('zod');
const prisma = require('../lib/prisma');
const { storeUpload } = require('../services/attachment.service');

const mileageSchema = z.object({
  date: z.coerce.date().optional(),
  mileage: z.coerce.number().int().min(0).max(9_999_999),
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

async function bumpVehicleMileage(vehicleId, mileage) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (vehicle && mileage > vehicle.currentMileage) {
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { currentMileage: mileage } });
  }
}

async function addMileage(req, res, next) {
  try {
    const data = mileageSchema.parse(req.body);
    const vehicleId = req.params.vehicleId;

    const entry = await prisma.mileageEntry.create({
      data: { vehicleId, mileage: data.mileage, date: data.date ?? new Date(), source: 'MANUAL' },
    });
    await bumpVehicleMileage(vehicleId, data.mileage);

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
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Für den Tachostand sind nur Fotos erlaubt.' });
    }
    const { mileage } = mileageSchema.pick({ mileage: true }).parse({ mileage: req.body.mileage });
    const vehicleId = req.params.vehicleId;

    const attachment = await storeUpload(req.file, { vehicleId, type: 'ODOMETER' });
    const entry = await prisma.mileageEntry.create({
      data: { vehicleId, mileage, date: new Date(), source: 'PHOTO', photoPath: attachment.id },
    });
    await bumpVehicleMileage(vehicleId, mileage);

    res.status(201).json({ entry, attachment: { id: attachment.id } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMileage, addMileage, addMileagePhoto };
