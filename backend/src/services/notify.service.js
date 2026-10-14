// Benachrichtigt die einem Fahrzeug zugeordneten Nutzer (In-App-Meldung + Push).
const prisma = require('../lib/prisma');
const { sendPushToUser } = require('./push.service');

function fmtDate(d) {
  const x = new Date(d);
  return `${String(x.getUTCDate()).padStart(2, '0')}.${String(x.getUTCMonth() + 1).padStart(2, '0')}.${x.getUTCFullYear()}`;
}

// Meldet allen ANDEREN Zugeordneten (nicht dem Ersteller), dass ein Service
// erledigt wurde - z.B. wenn der Mechaniker den Eintrag anlegt und der
// Fahrzeugbesitzer informiert werden soll. Fehler beim Senden dürfen das
// Speichern des Eintrags nie verhindern.
async function notifyServiceDone({ vehicleId, service, actor, message = '' }) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { assignments: true },
    });
    if (!vehicle) return 0;
    const recipients = vehicle.assignments.map((a) => a.userId).filter((id) => id !== actor.id);

    const title = `Hurra, ${service.type} ist erledigt!`;
    const body =
      `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate}): ` +
      `${service.type} am ${fmtDate(service.date)} bei ${Number(service.mileage).toLocaleString('de-DE')} km ` +
      `eingetragen von ${actor.name}.` +
      (message ? `
${actor.name}: ${message}` : '');

    for (const userId of recipients) {
      await prisma.notification.create({
        data: { userId, vehicleId, title, body, type: 'SERVICE_DONE' },
      });
      sendPushToUser(userId, { title, body, url: `/vehicles/${vehicleId}` }).catch(() => {});
    }
    return recipients.length;
  } catch (err) {
    console.error('[notify] Service-Benachrichtigung fehlgeschlagen:', err.message);
    return 0;
  }
}

module.exports = { notifyServiceDone };
