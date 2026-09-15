const prisma = require('../lib/prisma');
const { checkReminders } = require('../services/reminder.service');

async function listNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { vehicle: { select: { id: true, make: true, model: true, licensePlate: true } } },
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { read: true },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// Manueller Trigger, z.B. für Tests oder einen "jetzt prüfen" Button im UI.
async function runCheck(req, res, next) {
  try {
    const created = await checkReminders();
    res.json({ created: created.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotifications, markRead, markAllRead, runCheck };
