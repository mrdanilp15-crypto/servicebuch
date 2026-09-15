const { z } = require('zod');
const prisma = require('../lib/prisma');

const serviceSchema = z.object({
  date: z.coerce.date(),
  mileage: z.coerce.number().int().min(0),
  type: z.string().min(1),
  workshop: z.string().optional().nullable(),
  cost: z.coerce.number().optional().default(0),
  notes: z.string().optional().nullable(),
  important: z.coerce.boolean().optional().default(false),
  recurring: z.coerce.boolean().optional().default(false),
  recurringIntervalMonths: z.coerce.number().int().optional().nullable(),
  recurringIntervalKm: z.coerce.number().int().optional().nullable(),
});

async function listServices(req, res, next) {
  try {
    const services = await prisma.serviceEntry.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { date: 'desc' },
      include: { attachments: true },
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
}

async function getService(req, res, next) {
  try {
    const service = await prisma.serviceEntry.findUnique({
      where: { id: req.params.id },
      include: { attachments: true, vehicle: true },
    });
    if (!service || service.vehicleId !== req.params.vehicleId) {
      return res.status(404).json({ error: 'Service-Eintrag nicht gefunden.' });
    }
    res.json(service);
  } catch (err) {
    next(err);
  }
}

// Legt einen Service-Eintrag an. Aktualisiert den Fahrzeug-Kilometerstand,
// wenn der Eintrag einen höheren Stand meldet, und erzeugt bei "recurring"
// automatisch eine ReminderRule fürs nächste Fälligkeitsdatum/-km.
async function createService(req, res, next) {
  try {
    const data = serviceSchema.parse(req.body);
    const vehicleId = req.params.vehicleId;

    const service = await prisma.serviceEntry.create({
      data: { ...data, vehicleId },
    });

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (data.mileage > vehicle.currentMileage) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { currentMileage: data.mileage },
      });
      await prisma.mileageEntry.create({
        data: { vehicleId, mileage: data.mileage, date: data.date, source: 'SERVICE_ENTRY' },
      });
    }

    if (data.recurring && (data.recurringIntervalMonths || data.recurringIntervalKm)) {
      const dueDate = data.recurringIntervalMonths
        ? new Date(new Date(data.date).setMonth(new Date(data.date).getMonth() + data.recurringIntervalMonths))
        : null;
      const dueMileage = data.recurringIntervalKm ? data.mileage + data.recurringIntervalKm : null;

      await prisma.reminderRule.create({
        data: {
          vehicleId,
          type: 'SERVICE_INTERVAL',
          label: `${data.type} fällig`,
          dueDate,
          dueMileage,
          intervalMonths: data.recurringIntervalMonths ?? null,
          intervalKm: data.recurringIntervalKm ?? null,
        },
      });
    }

    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
}

async function updateService(req, res, next) {
  try {
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.serviceEntry.update({
      where: { id: req.params.id },
      data,
    });
    res.json(service);
  } catch (err) {
    next(err);
  }
}

async function deleteService(req, res, next) {
  try {
    await prisma.serviceEntry.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listServices, getService, createService, updateService, deleteService };
