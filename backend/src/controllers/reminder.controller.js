const { z } = require('zod');
const prisma = require('../lib/prisma');

const reminderSchema = z.object({
  type: z.enum(['TUEV', 'OEL', 'SERVICE_INTERVAL', 'KM_INTERVAL', 'REIFEN', 'CUSTOM']),
  label: z.string().min(1),
  dueDate: z.coerce.date().optional().nullable(),
  dueMileage: z.coerce.number().int().optional().nullable(),
  intervalMonths: z.coerce.number().int().optional().nullable(),
  intervalKm: z.coerce.number().int().optional().nullable(),
  active: z.coerce.boolean().optional().default(true),
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
    const data = reminderSchema.parse(req.body);
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
    const rule = await prisma.reminderRule.update({ where: { id: req.params.id }, data });
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

async function deleteReminder(req, res, next) {
  try {
    await prisma.reminderRule.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listReminders, createReminder, updateReminder, deleteReminder };
