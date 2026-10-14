// Zentrale Logik für den Kilometerstand eines Fahrzeugs.
//
// Regel: Der AKTUELLE Kilometerstand ist der Stand des zuletzt datierten
// Eintrags im Kilometer-Verlauf (bei gleichem Datum gewinnt der später
// angelegte). Er ist NICHT das Maximum aller Einträge: Wer ein Fahrzeug mit
// einem geschätzten Stand (z.B. 200.000 km) anlegt und später den
// tatsächlichen Stand (199.380 km) einträgt, muss damit den Wert korrigieren
// können. Ein nachträglich eingetragener, älterer Service (niedrigerer km-Stand
// in der Vergangenheit) ändert den aktuellen Stand dagegen nicht.
const prisma = require('../lib/prisma');

// Kalendertag (UTC-Mitternacht) - wie die Datumsfelder der App.
function startOfTodayUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Setzt vehicle.currentMileage auf den Stand des zuletzt datierten Eintrags.
// Gibt den neuen Stand zurück (oder null, wenn es keine Einträge gibt - dann
// bleibt der bisherige Wert unverändert).
async function recomputeCurrentMileage(vehicleId) {
  const latest = await prisma.mileageEntry.findFirst({
    where: { vehicleId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
  if (!latest) return null;
  await prisma.vehicle.update({ where: { id: vehicleId }, data: { currentMileage: latest.mileage } });
  return latest.mileage;
}

// Legt einen Eintrag an und aktualisiert den aktuellen Stand.
async function addMileageEntry({ vehicleId, mileage, date, source = 'MANUAL', photoPath = null, serviceEntryId = null }) {
  const entry = await prisma.mileageEntry.create({
    data: { vehicleId, mileage, date: date ?? startOfTodayUtc(), source, photoPath, serviceEntryId },
  });
  await recomputeCurrentMileage(vehicleId);
  return entry;
}

module.exports = { recomputeCurrentMileage, addMileageEntry, startOfTodayUtc };
