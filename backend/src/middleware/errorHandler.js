const multer = require('multer');

function notFound(req, res) {
  res.status(404).json({ error: 'Route nicht gefunden.' });
}

// Macht aus Zod-Fehlern eine lesbare deutsche Meldung für Formulare, z.B.
// "Kosten dürfen nicht negativ sein." statt nur "Validierungsfehler.".
function zodMessage(err) {
  const issue = err.errors?.[0];
  if (!issue) return 'Ungültige Eingabe.';
  const field = issue.path?.join('.');
  const known = issue.message && !/^(Required|Invalid|Expected|String must|Number must)/.test(issue.message);
  if (known) return issue.message;
  return field ? `Ungültige Eingabe im Feld "${field}".` : 'Ungültige Eingabe.';
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Antwort wurde bereits (teilweise) gesendet, z.B. mitten im PDF-Stream:
  // nur noch die Verbindung sauber beenden.
  if (res.headersSent) {
    console.error(err);
    return res.destroy(err);
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: zodMessage(err), details: err.errors });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Die Datei ist zu groß (maximal ${process.env.MAX_UPLOAD_MB || 15} MB).`
        : err.message;
    return res.status(400).json({ error: message });
  }

  // Prisma: "Datensatz nicht gefunden" (z.B. update/delete mit unbekannter
  // oder fremder ID), Unique- und Fremdschlüssel-Verletzungen.
  if (err.code === 'P2025') return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'Dieser Eintrag existiert bereits.' });
  if (err.code === 'P2003') return res.status(400).json({ error: 'Ungültiger Verweis.' });

  // Malformed JSON im Request-Body (von express.json).
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Ungültige Anfrage.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Anfrage zu groß.' });

  // Eigene, bewusst formulierte Fehler (z.B. Upload-Dateityp) weitergeben;
  // bei unerwarteten Fehlern keine internen Details (Pfade, SQL, ...) preisgeben.
  console.error(err);
  const status = err.status && err.status < 500 ? err.status : err.message?.startsWith('Dateityp nicht erlaubt') ? 400 : 500;
  const message = status === 500 ? 'Interner Serverfehler.' : err.message;
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
