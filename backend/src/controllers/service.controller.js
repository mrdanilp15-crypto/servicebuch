const { z } = require('zod');
const prisma = require('../lib/prisma');
const { removeFiles } = require('../services/attachment.service');

const optionalInt = (max) =>
  z.preprocess((v) => (v === '' ? null : v), z.coerce.number().int().min(0).max(max).optional().nullable());

const serviceSchema = z.object({
  date: z.coerce.date(),
  mileage: z.coerce.number().int().min(0).max(9_999_999),
  type: z.string().trim().min(1, 'Service-Art fehlt.').max(100),
  workshop: z.string().trim().max(150).optional().nullable(),
  cost: z.coerce.number().min(0, 'Kosten dürfen nicht negativ sein.').max(10_000_000).optional().default(0),
  notes: z.string().max(5000).optional().nullable(),
  important: z.coerce.boolean().optional().default(false),
  recurring: z.coerce.boolean().optional().default(false),
  recurringIntervalMonths: optionalInt(600),
  recurringIntervalKm: optionalInt(1_000_000),
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
    const service = await prisma.serviceEntry.findFirst({
      where: { id: req.params.id, vehicleId: req.params.vehicleId },
      include: { attachments: true },
    });
    if (!service) return res.status(404).json({ error: 'Service-Eintrag nicht gefunden.' });
    res.json(service);
  } catch (err) {
    next(err);
  }
}

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // 31. Januar + 1 Monat darf nicht im März landen, sondern am 28./29. Februar.
  if (d.getUTCDate() !== day) d.setUTCDate(0);
  return d;
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
      const dueDate = data.recurringIntervalMonths ? addMonths(data.date, data.recurringIntervalMonths) : null;
      const dueMileage = data.recurringIntervalKm ? data.mileage + data.recurringIntervalKm : null;
      const label = `${data.type} fällig`;
      const ruleData = {
        dueDate,
        dueMileage,
        intervalMonths: data.recurringIntervalMonths ?? null,
        intervalKm: data.recurringIntervalKm ?? null,
        active: true,
        lastTriggeredAt: null,
      };

      // Dieselbe Wartung (z.B. jährlicher Ölwechsel) bekommt nur EINE
      // laufende Erinnerung: Die bisherige wird auf den neuen Termin
      // fortgeschrieben, statt dass die alte (nun erledigte) Erinnerung
      // überfällig bleibt und weiter Warnungen auslöst.
      const existing = await prisma.reminderRule.findFirst({
        where: { vehicleId, type: 'SERVICE_INTERVAL', label },
      });
      if (existing) {
        await prisma.reminderRule.update({ where: { id: existing.id }, data: ruleData });
      } else {
        await prisma.reminderRule.create({ data: { vehicleId, type: 'SERVICE_INTERVAL', label, ...ruleData } });
      }
    }

    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
}

async function updateService(req, res, next) {
  try {
    const data = serviceSchema.partial().parse(req.body);
    // Zusätzlich auf vehicleId filtern: ein Bearbeiter darf nur Einträge des
    // Fahrzeugs ändern, für das er berechtigt ist (nicht per ID fremde).
    const service = await prisma.serviceEntry.update({
      where: { id: req.params.id, vehicleId: req.params.vehicleId },
      data,
    });
    res.json(service);
  } catch (err) {
    next(err);
  }
}

async function deleteService(req, res, next) {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { serviceEntryId: req.params.id, vehicleId: req.params.vehicleId },
    });
    await prisma.serviceEntry.delete({ where: { id: req.params.id, vehicleId: req.params.vehicleId } });
    await removeFiles(attachments);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listServices, getService, createService, updateService, deleteService };
