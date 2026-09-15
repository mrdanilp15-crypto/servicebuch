const { z } = require('zod');
const prisma = require('../lib/prisma');

const vehicleSchema = z.object({
  licensePlate: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().optional().nullable(),
  vin: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  currentMileage: z.coerce.number().int().optional().default(0),
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

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: payload,
    });
    res.json(serializeVehicle(vehicle));
  } catch (err) {
    next(err);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

const assignSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']).default('VIEWER'),
});

async function assignUser(req, res, next) {
  try {
    const data = assignSchema.parse(req.body);
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
