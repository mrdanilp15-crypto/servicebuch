const { z } = require('zod');
const prisma = require('../lib/prisma');

const { removeFiles } = require('../services/attachment.service');
const { addMileageEntry, startOfTodayUtc } = require('../services/mileage.service');

const currentYear = new Date().getFullYear();

const vehicleSchema = z.object({
  licensePlate: z.string().trim().min(1, 'Kennzeichen fehlt.').max(20).transform((v) => v.toUpperCase()),
  make: z.string().trim().min(1, 'Hersteller fehlt.').max(60),
  model: z.string().trim().min(1, 'Modell fehlt.').max(60),
  year: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().int().min(1886).max(currentYear + 1).optional().nullable()
  ),
  vin: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toUpperCase() || null : v),
    z.string().max(32).optional().nullable()
  ),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional().default([]),
  currentMileage: z.coerce.number().int().min(0).max(9_999_999).optional().default(0),
});

function serializeVehicle(vehicle) {
  return {
    ...vehicle,
    tags: vehicle.tags ? vehicle.tags.split(',').filter(Boolean) : [],
  };
}

// Fahrzeuge, auf die der eingeloggte Nutzer Zugriff hat (Admin sieht alle).
async function listVehicles(req, res, next) {
  try {
    const where =
      req.user.role === 'ADMIN'
        ? {}
        : { assignments: { some: { userId: req.user.id } } };

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { images: { take: 1 }, _count: { select: { serviceEntries: true } } },
    });
    res.json(vehicles.map(serializeVehicle));
  } catch (err) {
    next(err);
  }
}

async function getVehicle(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        images: { orderBy: { createdAt: 'desc' } },
        reminderRules: { where: { active: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { serviceEntries: true, mileageEntries: true } },
      },
    });
    if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden.' });
    res.json(serializeVehicle(vehicle));
  } catch (err) {
    next(err);
  }
}

async function createVehicle(req, res, next) {
  try {
    const data = vehicleSchema.parse(req.body);
    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate: data.licensePlate,
        make: data.make,
        model: data.model,
        year: data.year ?? null,
        vin: data.vin ?? null,
        tags: data.tags.join(','),
        currentMileage: data.currentMileage,
        assignments: { create: { userId: req.user.id, role: 'OWNER' } },
        // Der Startwert ist der erste Punkt im Kilometer-Verlauf. Er ist oft nur
        // geschätzt und lässt sich später durch einen genaueren Eintrag
        // überschreiben (der zuletzt datierte Stand gilt) oder löschen.
        ...(data.currentMileage > 0 && {
          mileageEntries: {
            create: { mileage: data.currentMileage, date: startOfTodayUtc(), source: 'INITIAL' },
          },
        }),
      },
    });
    res.status(201).json(serializeVehicle(vehicle));
  } catch (err) {
    next(err);
  }
}

async function updateVehicle(req, res, next) {
  try {
    const data = vehicleSchema.partial().parse(req.body);
    const payload = { ...data };
    if (data.tags) payload.tags = data.tags.join(',');

    // Kilometerstand wird nicht direkt überschrieben, sondern als neuer Eintrag
    // im Verlauf erfasst (dadurch bleibt die Historie stimmig und der Stand
    // auch bei Folge-Einträgen konsistent).
    const newMileage = payload.currentMileage;
    delete payload.currentMileage;
    const before = await prisma.vehicle.findUnique({ where: { id: req.params.id }, select: { currentMileage: true } });

    let vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data: payload });
    if (newMileage != null && before && newMileage !== before.currentMileage) {
      await addMileageEntry({ vehicleId: vehicle.id, mileage: newMileage, source: 'MANUAL' });
      vehicle = await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
    }
    res.json(serializeVehicle(vehicle));
  } catch (err) {
    next(err);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    // Die Datenbankzeilen verschwinden per Cascade - die verschlüsselten
    // Dateien (Rechnungen, Fotos) müssen explizit von der Platte gelöscht
    // werden, sonst blieben Daten trotz "Fahrzeug gelöscht" zurück
    // (Recht auf Löschung, Art. 17 DSGVO).
    const attachments = await prisma.attachment.findMany({ where: { vehicleId: req.params.id } });
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    await removeFiles(attachments);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

const assignSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']).default('VIEWER'),
});

// Verhindert, dass ein Fahrzeug ohne Besitzer zurückbleibt (dann könnte es
// niemand außer einem Admin mehr verwalten oder löschen).
async function wouldRemoveLastOwner(vehicleId, userId) {
  const owners = await prisma.vehicleAssignment.findMany({ where: { vehicleId, role: 'OWNER' } });
  return owners.length === 1 && owners[0].userId === userId;
}

async function assignUser(req, res, next) {
  try {
    const data = assignSchema.parse(req.body);
    if (data.role !== 'OWNER' && (await wouldRemoveLastOwner(req.params.id, data.userId))) {
      return res.status(400).json({ error: 'Der letzte Besitzer eines Fahrzeugs kann nicht herabgestuft werden.' });
    }
    const assignment = await prisma.vehicleAssignment.upsert({
      where: { userId_vehicleId: { userId: data.userId, vehicleId: req.params.id } },
      update: { role: data.role },
      create: { userId: data.userId, vehicleId: req.params.id, role: data.role },
    });
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
}

async function unassignUser(req, res, next) {
  try {
    if (await wouldRemoveLastOwner(req.params.id, req.params.userId)) {
      return res.status(400).json({ error: 'Der letzte Besitzer eines Fahrzeugs kann nicht entfernt werden.' });
    }
    await prisma.vehicleAssignment.delete({
      where: { userId_vehicleId: { userId: req.params.userId, vehicleId: req.params.id } },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  assignUser,
  unassignUser,
  serializeVehicle,
};
