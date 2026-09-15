const PDFDocument = require('pdfkit');
const { decryptBuffer } = require('../utils/fileCrypto');
const { readEncryptedFile } = require('./storage.service');

function fmtDate(d) {
  return new Date(d).toLocaleDateString('de-DE');
}
function fmtMoney(n) {
  return `${Number(n || 0).toFixed(2)} €`;
}

async function attachmentImageBuffer(attachment) {
  if (!attachment || !attachment.mimeType.startsWith('image/')) return null;
  try {
    const encrypted = await readEncryptedFile(attachment.fileName);
    return decryptBuffer(encrypted, attachment.iv, attachment.authTag);
  } catch {
    return null;
  }
}

function drawHeader(doc, title, subtitle) {
  doc.fontSize(20).fillColor('#111827').text(title, { align: 'left' });
  if (subtitle) doc.fontSize(11).fillColor('#6b7280').text(subtitle);
  doc.moveDown(0.5);
  doc
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(1);
  doc.fillColor('#111827');
}

async function writeServiceEntry(doc, entry, opts = {}) {
  doc.fontSize(14).fillColor('#111827').text(`${entry.type}${entry.important ? '  ⚠ Wichtig' : ''}`);
  doc.fontSize(10).fillColor('#374151');
  doc.text(`Datum: ${fmtDate(entry.date)}    Kilometerstand: ${entry.mileage.toLocaleString('de-DE')} km`);
  if (entry.workshop) doc.text(`Werkstatt: ${entry.workshop}`);
  doc.text(`Kosten: ${fmtMoney(entry.cost)}`);
  if (entry.notes) doc.text(`Notizen: ${entry.notes}`);
  if (entry.recurring) {
    const parts = [];
    if (entry.recurringIntervalMonths) parts.push(`${entry.recurringIntervalMonths} Monate`);
    if (entry.recurringIntervalKm) parts.push(`${entry.recurringIntervalKm} km`);
    doc.text(`Wiederkehrend: alle ${parts.join(' / ')}`);
  }

  if (opts.withImages && entry.attachments?.length) {
    doc.moveDown(0.3);
    for (const att of entry.attachments) {
      const buf = await attachmentImageBuffer(att);
      if (buf) {
        try {
          doc.image(buf, { fit: [220, 160] });
          doc.moveDown(0.3);
        } catch {
          // Datei kein unterstütztes Bildformat für PDFKit - überspringen
        }
      } else if (att.type === 'INVOICE') {
        doc.fontSize(9).fillColor('#2563eb').text(`Anhang (Rechnung): ${att.originalName}`);
      }
    }
    doc.fillColor('#111827');
  }
  doc.moveDown(1);
}

// Erstellt das vollständige Servicebuch eines Fahrzeugs als PDF-Stream.
function generateVehiclePdf(vehicle, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  drawHeader(
    doc,
    `Servicebuch: ${vehicle.make} ${vehicle.model}`,
    `Kennzeichen: ${vehicle.licensePlate}   |   Baujahr: ${vehicle.year || '-'}   |   VIN: ${vehicle.vin || '-'}   |   Aktueller km-Stand: ${vehicle.currentMileage.toLocaleString('de-DE')} km`
  );

  return { doc };
}

async function renderVehiclePdf(vehicle, serviceEntries, res, { withImages = true } = {}) {
  const { doc } = generateVehiclePdf(vehicle, res);

  if (!serviceEntries.length) {
    doc.fontSize(11).fillColor('#6b7280').text('Keine Service-Einträge vorhanden.');
  }

  for (const entry of serviceEntries) {
    if (doc.y > doc.page.height - 200) doc.addPage();
    await writeServiceEntry(doc, entry, { withImages });
  }

  doc.end();
}

async function renderServiceEntryPdf(vehicle, entry, res, { withImages = true } = {}) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);
  drawHeader(doc, `Service-Eintrag: ${entry.type}`, `${vehicle.make} ${vehicle.model} — ${vehicle.licensePlate}`);
  await writeServiceEntry(doc, entry, { withImages });
  doc.end();
}

module.exports = { renderVehiclePdf, renderServiceEntryPdf };
