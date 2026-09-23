const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// SQLites Standard-Journal-Modus ("delete"/Rollback-Journal) lässt
// Schreib- und Lesezugriffe sich gegenseitig blockieren - genau das sorgt
// bei gleichzeitiger Nutzung (z.B. der tägliche Erinnerungs-Cronjob oder
// ein Foto-Upload, während gerade jemand das Dashboard lädt) für spürbare
// Verzögerungen. WAL erlaubt nebenläufige Leser/Schreiber. Die Einstellung
// wird in der Datenbankdatei selbst gespeichert, dieser Aufruf beim Start
// ist also einmalig wirksam und bei jedem weiteren Start ein No-Op.
async function enableWalMode() {
  try {
    // $queryRawUnsafe statt $executeRawUnsafe: "PRAGMA journal_mode=WAL"
    // gibt den tatsächlich gesetzten Modus als Ergebniszeile zurück, was
    // $executeRaw als Fehler behandelt.
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
  } catch (err) {
    // Betrifft nur SQLite - bei Postgres/MySQL (siehe README "Deployment")
    // existieren diese Pragmas nicht und schlagen erwartungsgemäß fehl.
    if (!/no such/i.test(err.message)) {
      console.warn('[db] Konnte WAL-Modus nicht aktivieren:', err.message);
    }
  }
}

module.exports = prisma;
module.exports.enableWalMode = enableWalMode;
