const { z } = require('zod');
const prisma = require('../lib/prisma');
const { addMonths } = require('../utils/dates');
const { startOfTodayUtc } = require('../services/mileage.service');

const optionalInt = (max) =>
  z.preprocess((v) => (v === '' ? null : v), z.coerce.number().int().min(0).max(max).optional().nullable());

const reminderSchema = z.object({
  type: z.enum([
    'TUEV',
    'OEL',
    'SERVICE_INTERVAL',
    'KM_INTERVAL',
    'REIFEN',
    'BREMSEN',
    'ZAHNRIEMEN',
    'KLIMAANLAGE',
    'BATTERIE',
    'LUFTFILTER',
    'KUPPLUNG',
    'CUSTOM',
  ]),
  label: z.string().trim().min(1, 'Bezeichnung fehlt.').max(150),
  dueDate: z.preprocess((v) => (v === '' ? null : v), z.coerce.date().optional().nullable()),
  dueMileage: optionalInt(9_999_999),
  intervalMonths: optionalInt(600),
  intervalKm: optionalInt(1_000_000),
  active: z.coerce.boolean().optional().default(true),
  // true: Fälligkeit serverseitig ab HEUTE bzw. ab dem AKTUELLEN Kilometerstand aus den Intervallen berechnen.
  fromNow: z.boolean().optional(),
});

async function listReminders(req, res, next) {
  try {
    const rules = await prisma.reminderRule.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rules);
  } catch (err) {
    next(err);
  }
}

async function createReminder(req, res, next) {
  try {
    const { fromNow, ...data } = reminderSchema.parse(req.body);

    // Intervall-Erinnerung: Bezugspunkt ist der Kilometerstand und das Datum,
    // die der SERVER jetzt kennt - nicht ein evtl. veralteter Stand, der in der
    // geöffneten Seite im Speicher liegt (z.B. wenn kurz vorher ein neuer
    // Kilometerstand eingetragen wurde).
    if (fromNow) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: req.params.vehicleId },
        select: { currentMileage: true },
      });
      data.dueDate = data.intervalMonths ? addMonths(startOfTodayUtc(), data.intervalMonths) : null;
      data.dueMileage = data.intervalKm ? vehicle.currentMileage + data.intervalKm : null;
    }
    if (!data.dueDate && data.dueMileage == null) {
      return res.status(400).json({ error: 'Bitte mindestens ein Fälligkeitskriterium angeben (Datum oder Kilometerstand).' });
    }

    const rule = await prisma.reminderRule.create({
      data: { ...data, vehicleId: req.params.vehicleId },
    });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

async function updateReminder(req, res, next) {
  try {
    const data = reminderSchema.partial().parse(req.body);
    const rule = await prisma.reminderRule.update({
      where: { id: req.params.id, vehicleId: req.params.vehicleId },
      data,
    });
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

async function deleteReminder(req, res, next) {
  try {
    await prisma.reminderRule.delete({ where: { id: req.params.id, vehicleId: req.params.vehicleId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listReminders, createReminder, updateReminder, deleteReminder };
