// Einheitliche deutsche Formatierung für Datum, Kilometer und Geld.
//
// Datumswerte aus der API sind "Kalendertage" (UTC-Mitternacht, z.B.
// 2024-02-01T00:00:00Z). Würde man sie in der lokalen Zeitzone des Browsers
// anzeigen, erschiene der Tag für Nutzer westlich von UTC einen Tag zu früh.
// Deshalb wird Datum immer in UTC formatiert.
const dateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const dateTimeFmt = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const intFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const moneyFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const moneyRoundFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const fmtDate = (d) => (d ? dateFmt.format(new Date(d)) : '-');
// Zeitpunkte (z.B. Benachrichtigungen) in der Ortszeit des Betrachters.
export const fmtDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : '-');
export const fmtKm = (n) => `${intFmt.format(Number(n) || 0)} km`;
export const fmtInt = (n) => intFmt.format(Number(n) || 0);
export const fmtMoney = (n) => moneyFmt.format(Number(n) || 0);
export const fmtMoneyRound = (n) => moneyRoundFmt.format(Number(n) || 0);
