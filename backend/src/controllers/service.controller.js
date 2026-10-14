const { z } = require('zod');
const prisma = require('../lib/prisma');
const { removeFiles } = require('../services/attachment.service');
const { addMileageEntry, recomputeCurrentMileage } = require('../services/mileage.service');
const { addMonths } = require('../utils/dates');
const { notifyServiceDone } = require('../services/notify.service');

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
  // Nur beim Anlegen: andere Zugeordnete benachrichtigen (wird nicht gespeichert).
  notify: z.boolean().optional(),
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

// Legt einen Service-Eintrag an. Aktualisiert den Fahrzeug-Kilometerstand,
// wenn der Eintrag einen höheren Stand meldet, und erzeugt bei "recurring"
// automatisch eine ReminderRule fürs nächste Fälligkeitsdatum/-km.
async function createService(req, res, next) {
  try {
    const { notify = true, ...data } = serviceSchema.parse(req.body);
    const vehicleId = req.params.vehicleId;

    const service = await prisma.serviceEntry.create({
      data: { ...data, vehicleId },
    });

    // Jeder Service-Eintrag ist zugleich ein Kilometerstand-Messpunkt (mit dem
    // Eintrag verknüpft). Ob er den aktuellen Stand ändert, entscheidet das
    // Datum: nur der zuletzt datierte Eintrag zählt als aktueller Stand.
    await addMileageEntry({
      vehicleId,
      mileage: data.mileage,
      date: data.date,
      source: 'SERVICE_ENTRY',
      serviceEntryId: service.id,
    });

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

    if (notify) await notifyServiceDone({ vehicleId, service, actor: req.user });

    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
}

async function updateService(req, res, next) {
  try {
    const { notify, ...data } = serviceSchema.partial().parse(req.body);
    // Zusätzlich auf vehicleId filtern: ein Bearbeiter darf nur Einträge des
    // Fahrzeugs ändern, für das er berechtigt ist (nicht per ID fremde).
    const service = await prisma.serviceEntry.update({
      where: { id: req.params.id, vehicleId: req.params.vehicleId },
      data,
    });

    // Datum/Kilometerstand geändert (z.B. Tippfehler korrigiert): verknüpften
    // Verlaufs-Eintrag mitziehen. Ältere Service-Einträge ohne Verknüpfung
    // bekommen dabei nachträglich einen.
    if (data.mileage != null || data.date != null) {
      const linked = await prisma.mileageEntry.findFirst({ where: { serviceEntryId: service.id } });
      if (linked) {
        await prisma.mileageEntry.update({
          where: { id: linked.id },
          data: { mileage: service.mileage, date: service.date },
        });
      } else {
        await prisma.mileageEntry.create({
          data: {
            vehicleId: service.vehicleId,
            mileage: service.mileage,
            date: service.date,
            source: 'SERVICE_ENTRY',
            serviceEntryId: service.id,
          },
        });
      }
      await recomputeCurrentMileage(service.vehicleId);
    }
    res.json(service);
  } catch (err) {
    next(err);
  }
}

// Meldung zu einem bestehenden Eintrag (erneut) senden - z.B. wenn der Mechaniker
// nach dem automatischen Hinweis noch etwas ergänzen möchte ("Bitte Bremsen in
// 2 Wochen prüfen lassen") oder die erste Meldung abgewählt hatte.
async function notifyService(req, res, next) {
  try {
    const { message } = z.object({ message: z.string().trim().max(300).optional() }).parse(req.body || {});
    const service = await prisma.serviceEntry.findFirst({
      where: { id: req.params.id, vehicleId: req.params.vehicleId },
    });
    if (!service) return res.status(404).json({ error: 'Service-Eintrag nicht gefunden.' });
    const sent = await notifyServiceDone({ vehicleId: service.vehicleId, service, actor: req.user, message });
    if (sent === 0) {
      return res.status(400).json({ error: 'Es ist niemand sonst diesem Fahrzeug zugeordnet, der benachrichtigt werden könnte.' });
    }
    res.json({ sent });
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
    // Der verknüpfte Verlaufs-Eintrag verschwindet per Cascade mit - Stand neu berechnen.
    await recomputeCurrentMileage(req.params.vehicleId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listServices, getService, createService, updateService, deleteService, notifyService };
