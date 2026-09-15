const cron = require('node-cron');
const { checkReminders } = require('../services/reminder.service');

// Läuft täglich um 08:00 Uhr und prüft alle Fälligkeiten (TÜV, Ölwechsel,
// Service-Intervalle, km-Stand, Reifenwechsel).
function startScheduler() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const created = await checkReminders();
      if (created.length) console.log(`[reminders] ${created.length} Benachrichtigung(en) erzeugt.`);
    } catch (err) {
      console.error('[reminders] Fehler beim Prüfen der Erinnerungen:', err);
    }
  });
}

module.exports = { startScheduler };
