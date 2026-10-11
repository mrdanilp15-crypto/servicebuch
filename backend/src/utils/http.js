// Baut einen sicheren Content-Disposition-Header (RFC 6266/5987).
// Dateinamen mit Umlauten (z.B. Kennzeichen "KÜN-AB 12" oder "Rechnung
// Müller.pdf") oder Anführungszeichen würden in einem einfachen
// filename="..." entweder einen Server-Fehler ("Invalid character in
// header content") auslösen oder den Header manipulieren können.
function contentDisposition(type, filename) {
  const clean = String(filename).replace(/[\r\n]/g, ' ').trim() || 'datei';
  const ascii = clean
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(clean).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

module.exports = { contentDisposition };
