const webpush = require('web-push');
const prisma = require('../lib/prisma');

let configured = false;
function configure() {
  if (configured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  }
}

// Sendet eine Push-Benachrichtigung an alle Geräte eines Nutzers.
// Ungültige/abgelaufene Subscriptions werden automatisch entfernt.
async function sendPushToUser(userId, payload) {
  configure();
  if (!configured) {
    console.warn('VAPID Keys nicht konfiguriert - Push wird übersprungen. Siehe README.');
    return;
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Push-Fehler:', err.message);
        }
      }
    })
  );
}

module.exports = { sendPushToUser, configure };
