// Prüft alle aktiven ReminderRules gegen das aktuelle Datum / den aktuellen
// Kilometerstand jedes Fahrzeugs. Bei Fälligkeit wird für jeden zugewiesenen
// Nutzer eine Notification erzeugt und eine Push-Benachrichtigung verschickt.
// Läuft periodisch über jobs/scheduler.js (node-cron), kann aber auch manuell
// per GET /api/dashboard/check-reminders getriggert werden.
const prisma = require('../lib/prisma');
const { sendPushToUser } = require('./push.service');

const TUEV_WARNING_DAYS = Number(process.env.TUEV_WARNING_DAYS || 30);
const SERVICE_KM_WARNING = Number(process.env.SERVICE_INTERVAL_KM_WARNING || 1000);

const TYPE_LABELS = {
  TUEV: 'TÜV fällig',
  OEL: 'Ölwechsel fällig',
  SERVICE_INTERVAL: 'Service-Intervall erreicht',
  KM_INTERVAL: 'Kilometerstand über Intervall',
  REIFEN: 'Reifenwechsel fällig',
  CUSTOM: 'Erinnerung',
};

function isDue(rule, vehicle) {
  const now = new Date();
  if (rule.dueDate) {
    const warnFrom = new Date(rule.dueDate);
    warnFrom.setDate(warnFrom.getDate() - (rule.type === 'TUEV' ? TUEV_WARNING_DAYS : 0));
    if (now >= warnFrom) return true;
  }
  if (rule.dueMileage != null) {
    const threshold = rule.type === 'KM_INTERVAL' ? SERVICE_KM_WARNING : 0;
    if (vehicle.currentMileage >= rule.dueMileage - threshold) return true;
  }
  return false;
}

async function checkReminders() {
  const rules = await prisma.reminderRule.findMany({
    where: { active: true },
    include: { vehicle: { include: { assignments: true } } },
  });

  const created = [];
  for (const rule of rules) {
    if (!isDue(rule, rule.vehicle)) continue;

    // Nicht öfter als 1x pro 24h für dieselbe Regel benachrichtigen.
    if (rule.lastTriggeredAt && Date.now() - new Date(rule.lastTriggeredAt).getTime() < 24 * 60 * 60 * 1000) {
      continue;
    }

    const title = TYPE_LABELS[rule.type] || 'Erinnerung';
    const body = `${rule.vehicle.make} ${rule.vehicle.model} (${rule.vehicle.licensePlate}): ${rule.label}`;

    for (const assignment of rule.vehicle.assignments) {
      const notification = await prisma.notification.create({
        data: {
          userId: assignment.userId,
          vehicleId: rule.vehicleId,
          title,
          body,
          type: rule.type,
        },
      });
      created.push(notification);
      await sendPushToUser(assignment.userId, {
        title,
        body,
        url: `/vehicles/${rule.vehicleId}`,
      });
    }

    await prisma.reminderRule.update({ where: { id: rule.id }, data: { lastTriggeredAt: new Date() } });
  }
  return created;
}

module.exports = { checkReminders, TYPE_LABELS };
