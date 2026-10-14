const { z } = require('zod');
const prisma = require('../lib/prisma');
const { storeUpload, removeFiles } = require('../services/attachment.service');
const { addMileageEntry, recomputeCurrentMileage } = require('../services/mileage.service');

const mileageSchema = z.object({
  date: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.date().optional()),
  mileage: z.coerce.number().int().min(0, 'Kilometerstand darf nicht negativ sein.').max(9_999_999),
});

// Verlauf für die Kilometerstand-Kurve und die Liste. Neueste zuletzt (für
// das Diagramm); gleiches Datum -> Reihenfolge der Anlage.
async function listMileage(req, res, next) {
  try {
    const entries = await prisma.mileageEntry.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(entries);
  } catch (err) {
    next(err);
  }
}

async function currentMileageOf(vehicleId) {
  const v = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { currentMileage: true } });
  return v?.currentMileage ?? 0;
}

async function addMileage(req, res, next) {
  try {
    const data = mileageSchema.parse(req.body);
    const vehicleId = req.params.vehicleId;
    const entry = await addMileageEntry({ vehicleId, mileage: data.mileage, date: data.date, source: 'MANUAL' });
    res.status(201).json({ ...entry, currentMileage: await currentMileageOf(vehicleId) });
  } catch (err) {
    next(err);
  }
}

// Kilometerstand per Tacho-Foto: Bild wird verschlüsselt gespeichert und am
// Eintrag angezeigt; der tatsächliche Stand wird (vorerst) manuell im selben
// Request mitgegeben - eine echte OCR-Auswertung kann hier später angebunden
// werden.
async function addMileagePhoto(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Kein Foto hochgeladen.' });
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Für den Tachostand sind nur Fotos erlaubt.' });
    }
    const data = mileageSchema.parse({ mileage: req.body.mileage, date: req.body.date });
    const vehicleId = req.params.vehicleId;

    const attachment = await storeUpload(req.file, { vehicleId, type: 'ODOMETER' });
    const entry = await addMileageEntry({
      vehicleId,
      mileage: data.mileage,
      date: data.date,
      source: 'PHOTO',
      photoPath: attachment.id,
    });
    res.status(201).json({ entry, attachment: { id: attachment.id }, currentMileage: await currentMileageOf(vehicleId) });
  } catch (err) {
    next(err);
  }
}

// Einträge, die aus einem Service-Eintrag stammen, werden dort geändert.
async function loadEditableEntry(req, res) {
  const entry = await prisma.mileageEntry.findFirst({
    where: { id: req.params.id, vehicleId: req.params.vehicleId },
  });
  if (!entry) {
    res.status(404).json({ error: 'Eintrag nicht gefunden.' });
    return null;
  }
  if (entry.serviceEntryId) {
    res.status(400).json({ error: 'Dieser Stand gehört zu einem Service-Eintrag und wird dort geändert.' });
    return null;
  }
  return entry;
}

async function updateMileage(req, res, next) {
  try {
    const data = mileageSchema.partial().parse(req.body);
    const entry = await loadEditableEntry(req, res);
    if (!entry) return;
    const updated = await prisma.mileageEntry.update({
      where: { id: entry.id },
      data: { ...(data.mileage != null && { mileage: data.mileage }), ...(data.date && { date: data.date }) },
    });
    await recomputeCurrentMileage(entry.vehicleId);
    res.json({ ...updated, currentMileage: await currentMileageOf(entry.vehicleId) });
  } catch (err) {
    next(err);
  }
}

async function deleteMileage(req, res, next) {
  try {
    const entry = await loadEditableEntry(req, res);
    if (!entry) return;
    // Hängt ein Tacho-Foto daran, wird auch die verschlüsselte Datei entfernt.
    const photo = entry.photoPath ? await prisma.attachment.findUnique({ where: { id: entry.photoPath } }) : null;
    await prisma.mileageEntry.delete({ where: { id: entry.id } });
    if (photo) {
      await prisma.attachment.delete({ where: { id: photo.id } });
      await removeFiles([photo]);
    }
    await recomputeCurrentMileage(entry.vehicleId);
    res.json({ currentMileage: await currentMileageOf(entry.vehicleId) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMileage, addMileage, addMileagePhoto, updateMileage, deleteMileage };
