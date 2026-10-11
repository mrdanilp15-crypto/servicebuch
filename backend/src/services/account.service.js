// Kontenbezogene Logik: Daten-Export (Auskunft/Übertragbarkeit, Art. 15/20
// DSGVO) und vollständiges Löschen eines Kontos (Art. 17 DSGVO).
const prisma = require('../lib/prisma');
const { removeFiles } = require('./attachment.service');

async function countAdmins() {
  return prisma.user.count({ where: { role: 'ADMIN' } });
}

// Alle Daten, die zu einem Nutzer gespeichert sind, als JSON-fähiges Objekt.
// Das Passwort-Hash und interne Token-Daten sind bewusst nicht enthalten;
// hochgeladene Dateien werden als Metadaten aufgeführt (die Dateien selbst
// lassen sich in der App herunterladen).
async function exportUserData(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const assignments = await prisma.vehicleAssignment.findMany({
    where: { userId },
    include: {
      vehicle: {
        include: {
          serviceEntries: { orderBy: { date: 'asc' }, include: { attachments: { select: { id: true, type: true, originalName: true, mimeType: true, size: true, createdAt: true } } } },
          mileageEntries: { orderBy: { date: 'asc' } },
          reminderRules: true,
          images: { select: { id: true, caption: true, createdAt: true } },
        },
      },
    },
  });

  const [notifications, pushSubscriptions] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.pushSubscription.findMany({ where: { userId }, select: { id: true, createdAt: true } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    hinweis: 'Export aller zu diesem Konto gespeicherten Daten (Digitales Servicebuch).',
    konto: user,
    fahrzeuge: assignments.map(({ role, vehicle }) => ({ meineRolle: role, ...vehicle })),
    benachrichtigungen: notifications,
    pushGeraete: pushSubscriptions,
  };
}

// Löscht einen Nutzer samt seiner Daten:
//  - Fahrzeuge, die nur dieser Nutzer hatte, werden komplett entfernt
//    (inkl. verschlüsselter Dateien auf der Platte);
//  - Fahrzeuge, die auch andere nutzen, bleiben erhalten; war der Nutzer
//    deren einziger Besitzer, wird der älteste verbleibende Zugriff zum
//    Besitzer befördert, damit das Fahrzeug nicht "herrenlos" wird.
async function deleteUserAndData(userId) {
  const mine = await prisma.vehicleAssignment.findMany({
    where: { userId },
    select: { vehicleId: true, role: true },
  });

  const filesToRemove = [];
  for (const { vehicleId, role } of mine) {
    const others = await prisma.vehicleAssignment.findMany({
      where: { vehicleId, NOT: { userId } },
      orderBy: { createdAt: 'asc' },
    });

    if (others.length === 0) {
      filesToRemove.push(...(await prisma.attachment.findMany({ where: { vehicleId } })));
      await prisma.vehicle.delete({ where: { id: vehicleId } });
    } else if (role === 'OWNER' && !others.some((a) => a.role === 'OWNER')) {
      await prisma.vehicleAssignment.update({ where: { id: others[0].id }, data: { role: 'OWNER' } });
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  await removeFiles(filesToRemove);
}

module.exports = { countAdmins, exportUserData, deleteUserAndData };
