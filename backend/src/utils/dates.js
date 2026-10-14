// Monate auf ein Datum addieren (in UTC). Endet der Zielmonat früher (31. Januar
// + 1 Monat), gilt der letzte Tag des Zielmonats statt eines Datums im Folgemonat.
function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() !== day) d.setUTCDate(0);
  return d;
}

module.exports = { addMonths };
