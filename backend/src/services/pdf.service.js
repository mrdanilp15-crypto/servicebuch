// PDF-Export: Servicebuch eines Fahrzeugs bzw. einzelner Service-Eintrag.
//
// Gestaltungsprinzipien:
//  - Reines PDFKit mit den eingebauten Standardschriften (Helvetica) - keine
//    Font-Dateien nötig. Diese Schriften kennen nur den Windows-ANSI-Zeichensatz
//    (Umlaute, ß, €, Gedankenstrich ... ja; Emojis, Pfeile, ⚠ ... nein). Alle
//    Texte laufen deshalb durch safe(), das Unbekanntes durch Ersatzzeichen
//    ersetzt, statt Kauderwelsch zu erzeugen.
//  - Datum/Zahlen werden von Hand deutsch formatiert (ohne Abhängigkeit von
//    der ICU-Locale des Servers); gespeicherte Datumswerte sind UTC-Mitternacht
//    und werden daher in UTC dargestellt, sonst rutscht ein Datum je nach
//    Server-Zeitzone um einen Tag.
//  - Seitenzahlen/Fußzeile werden nachträglich auf allen Seiten gesetzt
//    (bufferPages). Das fertige PDF wird komplett im Speicher erzeugt und
//    erst dann gesendet - so kann bei einem Fehler noch eine saubere
//    Fehlermeldung statt eines kaputten Downloads geliefert werden.
const PDFDocument = require('pdfkit');
const { decryptBuffer } = require('../utils/fileCrypto');
const { pdfImage } = require('../utils/image');
const { readEncryptedFile } = require('./storage.service');

const C = {
  ink: '#111827',
  text: '#374151',
  muted: '#6b7280',
  line: '#e5e7eb',
  brand: '#1d4ed8',
  brandBg: '#eff6ff',
  panel: '#f9fafb',
  warn: '#92400e',
  warnBg: '#fffbeb',
  warnLine: '#fcd34d',
  ok: '#166534',
  okBg: '#f0fdf4',
  okLine: '#86efac',
  danger: '#b91c1c',
};

const MARGIN = 48;
const FOOTER_SPACE = 62; // Platz unten für Fußzeile
const FONT = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

/* ---------- Text & Formatierung ---------- */

const REPLACEMENTS = [
  [/[\u2192\u279C\u2794]/g, '->'],
  [/\u2190/g, '<-'],
  [/[\u2713\u2714]/g, 'ok'],
  [/[\u2717\u2718]/g, 'x'],
  [/[\u2018\u2019\u201A]/g, "'"],
  [/[\u201C\u201D\u201E]/g, '"'],
  [/\u00A0/g, ' '],
  [/[\u2002\u2003\u2009\u200A\u202F]/g, ' '],
];
// Zeichen, die Helvetica (WinAnsi = Windows-1252) darstellen kann: Latin-1
// plus u.a. Š/š/Ž/ž/Œ/œ/Ÿ (z.B. "Škoda"), €, Gedankenstriche, Aufzählungspunkt.
const WIN_ANSI_OK = /[\u0020-\u007E\u00A1-\u00FF\u20AC\u0160\u0161\u017D\u017E\u0152\u0153\u0178\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u2122\n]/;
// Buchstaben ohne Zerlegung in Grundbuchstabe + Akzent.
const LETTER_FALLBACK = { 'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D', 'ħ': 'h', 'Ħ': 'H', 'ı': 'i' };

function safe(value) {
  let s = String(value ?? '');
  for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep);
  s = s.replace(/\r\n?/g, '\n');
  return Array.from(s)
    .map((ch) => {
      if (WIN_ANSI_OK.test(ch)) return ch;
      if (ch.trim() === '') return ' ';
      // Č -> C, ć -> c, ... (Akzent weglassen statt "?" auszugeben)
      const base = LETTER_FALLBACK[ch] || ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return base.length === 1 && WIN_ANSI_OK.test(base) ? base : '?';
    })
    .join('');
}

// Kürzt einen Text so, dass er in einer Zeile in `width` Punkte passt
// (PDFKits eigenes ellipsis bricht trotz lineBreak:false um).
function fitLine(doc, text, width) {
  let t = safe(text).replace(/\n/g, ' ');
  if (doc.widthOfString(t) <= width) return t;
  while (t.length > 1 && doc.widthOfString(`${t}...`) > width) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

const pad2 = (n) => String(n).padStart(2, '0');
const group = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function fmtDate(d) {
  const x = new Date(d);
  return `${pad2(x.getUTCDate())}.${pad2(x.getUTCMonth() + 1)}.${x.getUTCFullYear()}`;
}

// Erstellzeitpunkt in deutscher Ortszeit.
function fmtNow(now = new Date()) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: process.env.TZ || 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
      .format(now)
      .replace(',', '');
  } catch {
    return `${fmtDate(now)} ${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())} UTC`;
  }
}

const fmtInt = (n) => group(String(Math.round(Number(n) || 0)));

function fmtMoney(n) {
  const v = Number(n) || 0;
  const [i, f] = Math.abs(v).toFixed(2).split('.');
  return `${v < 0 ? '-' : ''}${group(i)},${f} €`;
}

function trimText(s, max) {
  const t = safe(s);
  return t.length > max ? `${t.slice(0, max).trimEnd()}...` : t;
}

/* ---------- Dokument-Grundlagen ---------- */

function createDocument({ title, subject }) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: FOOTER_SPACE, left: MARGIN, right: MARGIN },
    bufferPages: true,
    autoFirstPage: true,
    displayTitle: true,
    lang: 'de-DE',
    info: {
      Title: safe(title),
      Subject: safe(subject),
      Author: 'Digitales Servicebuch',
      Creator: 'Digitales Servicebuch',
    },
  });
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, done };
}

const contentWidth = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;
const bottomLimit = (doc) => doc.page.height - FOOTER_SPACE;

// Springt auf eine neue Seite, wenn weniger als `height` Platz übrig ist.
function ensureSpace(doc, height) {
  if (doc.y + height > bottomLimit(doc)) {
    doc.addPage();
    return true;
  }
  return false;
}

function hLine(doc, y, color = C.line, width = 0.75) {
  doc
    .save()
    .lineWidth(width)
    .strokeColor(color)
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke()
    .restore();
}

function sectionTitle(doc, title, { minFollowing = 70 } = {}) {
  ensureSpace(doc, 30 + minFollowing);
  if (doc.y > doc.page.margins.top + 2) doc.y += 12;
  doc.font(FONT_BOLD).fontSize(12.5).fillColor(C.ink).text(safe(title), doc.page.margins.left, doc.y);
  const y = doc.y + 3;
  hLine(doc, y);
  doc.y = y + 9;
  doc.x = doc.page.margins.left;
}

/* ---------- Anhänge / Bilder ---------- */

async function attachmentBuffer(attachment) {
  try {
    const encrypted = await readEncryptedFile(attachment.fileName);
    return decryptBuffer(encrypted, attachment.iv, attachment.authTag);
  } catch {
    return null;
  }
}

// Lädt die Bild-Anhänge eines Eintrags als kompakte JPEGs; alle anderen
// Anhänge (z.B. PDF-Rechnungen) werden nur namentlich aufgeführt.
async function loadAttachments(attachments, { withImages, maxImages, maxEdge }) {
  const images = [];
  const files = [];
  let skipped = 0;
  for (const att of attachments || []) {
    if (att.mimeType.startsWith('image/')) {
      if (!withImages) {
        files.push(att);
      } else if (images.length >= maxImages) {
        skipped += 1;
      } else {
        const raw = await attachmentBuffer(att);
        const img = raw && (await pdfImage(raw, { maxEdge }));
        if (img) images.push(img);
        else files.push(att);
      }
    } else {
      files.push(att);
    }
  }
  return { images, files, skipped };
}

// Ordnet Bilder zeilenweise in einer Spalte an. Liefert Zeilen mit
// Positionen, damit eine Bildzeile bei Bedarf auf die nächste Seite
// umbrechen kann (statt einen ganzen Eintrag zu verschieben).
function layoutImages(images, { x, width, boxW, boxH, gap = 8 }) {
  const rows = [];
  let row = { items: [], h: 0 };
  let cx = x;
  for (const img of images) {
    const scale = Math.min(boxW / img.width, boxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    if (row.items.length && cx + w > x + width) {
      rows.push(row);
      row = { items: [], h: 0 };
      cx = x;
    }
    row.items.push({ img, x: cx, w, h });
    row.h = Math.max(row.h, h);
    cx += w + gap;
  }
  if (row.items.length) rows.push(row);
  return rows;
}

function drawImageRow(doc, row, y) {
  for (const p of row.items) {
    doc.image(p.img.buffer, p.x, y, { width: p.w, height: p.h });
    doc.save().lineWidth(0.5).strokeColor(C.line).rect(p.x, y, p.w, p.h).stroke().restore();
  }
}

/* ---------- Kopfbereich ---------- */

function drawBrandBar(doc) {
  doc.save().rect(0, 0, doc.page.width, 7).fill(C.brand).restore();
}

function plateBadge(doc, plate, x, y) {
  const text = safe(plate);
  doc.font(FONT_BOLD).fontSize(14);
  const w = Math.max(96, doc.widthOfString(text) + 28);
  doc.save().lineWidth(1.6).roundedRect(x, y, w, 30, 5).fillAndStroke('#ffffff', C.ink).restore();
  doc.font(FONT_BOLD).fontSize(14).fillColor(C.ink).text(text, x, y + 8, { width: w, align: 'center', lineBreak: false });
  return { w, h: 30 };
}

async function drawHeader(doc, vehicle, { kicker, headerImage }) {
  drawBrandBar(doc);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = MARGIN;
  const imgW = 150;
  const imgH = 100;
  const textW = (headerImage ? right - left - imgW - 20 : right - left);

  doc.font(FONT_BOLD).fontSize(8.5).fillColor(C.brand).text(safe(kicker).toUpperCase(), left, top, {
    characterSpacing: 1.2,
    width: textW,
    lineBreak: false,
  });
  doc.font(FONT_BOLD).fontSize(24).fillColor(C.ink).text(safe(`${vehicle.make} ${vehicle.model}`), left, top + 16, {
    width: textW,
  });
  const afterTitle = doc.y + 8;
  const badge = plateBadge(doc, vehicle.licensePlate, left, afterTitle);

  let bottom = afterTitle + badge.h;
  if (headerImage) {
    const s = Math.min(imgW / headerImage.width, imgH / headerImage.height);
    const w = headerImage.width * s;
    const h = headerImage.height * s;
    const ix = right - w;
    doc.save().roundedRect(ix, top, w, h, 6).clip();
    doc.image(headerImage.buffer, ix, top, { width: w, height: h });
    doc.restore();
    doc.save().lineWidth(0.5).strokeColor(C.line).roundedRect(ix, top, w, h, 6).stroke().restore();
    bottom = Math.max(bottom, top + h);
  }
  doc.y = bottom + 16;
  doc.x = left;
}

// Beschriftete Wertefelder in einem Raster (z.B. 3 Spalten).
function drawFacts(doc, facts, { columns = 3 } = {}) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const padX = 14;
  const padY = 12;
  const colW = (width - 2 * padX) / columns;
  const rowH = 38;
  const rows = Math.ceil(facts.length / columns);
  const height = rows * rowH + 2 * padY - 8;
  const y0 = doc.y;

  doc.save().roundedRect(left, y0, width, height, 8).fillAndStroke(C.panel, C.line).restore();

  facts.forEach((f, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = left + padX + col * colW;
    const y = y0 + padY + row * rowH;
    doc.font(FONT_BOLD).fontSize(7).fillColor(C.muted).text(safe(f.label).toUpperCase(), x, y, {
      width: colW - 8,
      characterSpacing: 0.6,
      lineBreak: false,
    });
    doc.font(FONT_BOLD).fontSize(11).fillColor(f.color || C.ink);
    doc.text(fitLine(doc, f.value, colW - 8), x, y + 12, { lineBreak: false });
  });
  doc.y = y0 + height + 12;
  doc.x = left;
}

function noteBox(doc, text, tone = 'warn') {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const colors = tone === 'ok' ? [C.okBg, C.okLine, C.ok] : [C.warnBg, C.warnLine, C.warn];
  doc.font(FONT).fontSize(9);
  const h = doc.heightOfString(safe(text), { width: width - 24 }) + 16;
  ensureSpace(doc, h + 6);
  const y = doc.y;
  doc.save().roundedRect(left, y, width, h, 6).fillAndStroke(colors[0], colors[1]).restore();
  doc.font(FONT).fontSize(9).fillColor(colors[2]).text(safe(text), left + 12, y + 8, { width: width - 24 });
  doc.y = y + h + 10;
  doc.x = left;
}

/* ---------- Auswertungen ---------- */

function costsByYear(entries) {
  const byYear = new Map();
  for (const e of entries) {
    const year = new Date(e.date).getUTCFullYear();
    byYear.set(year, (byYear.get(year) || 0) + (e.cost || 0));
  }
  return [...byYear.entries()].sort((a, b) => b[0] - a[0]);
}

// Prüft, ob die erfassten Kilometerstände mit der Zeit nicht sinken.
function mileagePlausibility(services, mileageEntries) {
  const points = [
    ...services.map((s) => ({ date: new Date(s.date), km: s.mileage })),
    // Der beim Anlegen erfasste Startwert ist oft nur geschätzt - er soll keinen
    // "Kilometerstand sinkt"-Hinweis auslösen, wenn später der genaue Stand eingetragen wird.
    ...mileageEntries.filter((m) => m.source !== 'INITIAL').map((m) => ({ date: new Date(m.date), km: m.mileage })),
  ].sort((a, b) => a.date - b.date || a.km - b.km);
  if (points.length < 2) return null;
  let max = points[0];
  for (const p of points.slice(1)) {
    if (p.km < max.km) {
      return {
        ok: false,
        text: `Hinweis: Der Kilometerstand sinkt zwischen dem ${fmtDate(max.date)} (${fmtInt(max.km)} km) und dem ${fmtDate(
          p.date
        )} (${fmtInt(p.km)} km). Bitte die Einträge prüfen - ein Rückgang kann auf einen Tippfehler oder einen Tachotausch hindeuten.`,
      };
    }
    max = p;
  }
  return { ok: true, text: 'Die erfassten Kilometerstände steigen chronologisch durchgängig an.' };
}

function drawCostChart(doc, rows) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const labelW = 38;
  const valueW = 78;
  const barMax = width - labelW - valueW - 12;
  const max = Math.max(...rows.map((r) => r[1]), 1);
  const rowH = 17;

  ensureSpace(doc, rows.length * rowH + 6);
  let y = doc.y;
  for (const [year, cost] of rows) {
    doc.font(FONT).fontSize(9.5).fillColor(C.text).text(String(year), left, y + 2, { width: labelW, lineBreak: false });
    const w = Math.max(2, (cost / max) * barMax);
    doc.save().roundedRect(left + labelW, y + 1, w, 11, 2).fill(C.brand).restore();
    doc.font(FONT_BOLD).fontSize(9.5).fillColor(C.ink).text(fmtMoney(cost), left + labelW + w + 8, y + 2, {
      width: valueW + barMax - w,
      lineBreak: false,
    });
    y += rowH;
  }
  doc.y = y + 4;
  doc.x = left;
}

function drawReminders(doc, reminders, vehicleMileage) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const now = new Date();
  for (const r of reminders) {
    const parts = [];
    let overdue = false;
    if (r.dueDate) {
      parts.push(`am ${fmtDate(r.dueDate)}`);
      if (new Date(r.dueDate) < now) overdue = true;
    }
    if (r.dueMileage != null) {
      parts.push(`bei ${fmtInt(r.dueMileage)} km`);
      if (r.dueMileage <= vehicleMileage) overdue = true;
    }
    const when = parts.join(' / ') || '-';
    ensureSpace(doc, 20);
    const y = doc.y;
    const whenText = `${overdue ? 'Überfällig: ' : 'Fällig '}${when}`;
    doc.font(FONT).fontSize(10);
    const whenW = doc.widthOfString(whenText);
    doc.font(FONT_BOLD).fontSize(10);
    doc.fillColor(C.ink).text(fitLine(doc, r.label, width - whenW - 16), left, y, { lineBreak: false });
    doc.font(FONT).fontSize(10).fillColor(overdue ? C.danger : C.text).text(whenText, left, y, {
      width,
      align: 'right',
      lineBreak: false,
    });
    doc.y = y + 18;
    hLine(doc, doc.y - 4, C.line, 0.5);
  }
  doc.x = left;
}

/* ---------- Service-Einträge ---------- */

function drawListHeader(doc) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const y = doc.y;
  doc.font(FONT_BOLD).fontSize(7.5).fillColor(C.muted);
  doc.text('DATUM / KM-STAND', left, y, { characterSpacing: 0.5, lineBreak: false });
  doc.text('ARBEITEN', left + 92, y, { characterSpacing: 0.5, lineBreak: false });
  doc.text('KOSTEN', left, y, { width: right - left, align: 'right', characterSpacing: 0.5, lineBreak: false });
  doc.y = y + 12;
  hLine(doc, doc.y, C.ink, 1);
  doc.y += 8;
  doc.x = left;
}

// Zeichnet einen Service-Eintrag. layout: 'row' (Listenzeile im
// Fahrzeug-PDF, kleine Vorschaubilder) oder 'detail' (Einzel-PDF, große Bilder).
async function drawEntry(doc, entry, { withImages, layout = 'row', repeatHeader = true }) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const dateW = 78;
  const costW = 78;
  const gap = 14;
  const mainX = left + dateW + gap;
  const mainW = width - dateW - costW - 2 * gap;
  const detail = layout === 'detail';

  const { images, files, skipped } = await loadAttachments(entry.attachments, {
    withImages,
    maxImages: detail ? 12 : 6,
    maxEdge: detail ? 1400 : 900,
  });
  const imageRows = layoutImages(images, {
    x: mainX,
    width: mainW,
    boxW: detail ? 250 : 100,
    boxH: detail ? 190 : 75,
  });

  const badgeW = entry.important ? 52 : 0;
  const typeText = safe(entry.type);
  const notes = entry.notes ? trimText(entry.notes, 1800) : '';

  doc.font(FONT_BOLD).fontSize(11.5);
  const typeH = doc.heightOfString(typeText, { width: mainW - (badgeW ? badgeW + 8 : 0) });
  doc.font(FONT).fontSize(9.5);
  const workshopH = entry.workshop ? doc.heightOfString(`Werkstatt: ${safe(entry.workshop)}`, { width: mainW }) + 2 : 0;
  const notesH = notes ? doc.heightOfString(notes, { width: mainW }) + 3 : 0;

  let recurringText = '';
  if (entry.recurring && (entry.recurringIntervalMonths || entry.recurringIntervalKm)) {
    const parts = [];
    if (entry.recurringIntervalMonths) parts.push(`${entry.recurringIntervalMonths} Monate`);
    if (entry.recurringIntervalKm) parts.push(`${fmtInt(entry.recurringIntervalKm)} km`);
    recurringText = `Wiederkehrend: alle ${parts.join(' bzw. ')}`;
  }
  const recurringH = recurringText ? doc.heightOfString(recurringText, { width: mainW }) + 2 : 0;

  const fileNames = [
    ...files.map((f) => `${f.type === 'INVOICE' ? 'Rechnung' : 'Datei'}: ${f.originalName}`),
    ...(skipped ? [`+ ${skipped} weitere Bilder (nicht abgebildet)`] : []),
  ];
  const filesText = fileNames.length ? trimText(fileNames.join('  |  '), 400) : '';
  const filesH = filesText ? doc.heightOfString(`Anhänge - ${filesText}`, { width: mainW }) + 3 : 0;

  const padY = 10;
  const textBlockH = Math.max(typeH + workshopH + notesH + recurringH + filesH, 30);
  // Mindestens der Textblock und die erste Bildzeile müssen auf die Seite
  // passen; weitere Bildzeilen dürfen auf die Folgeseite umbrechen.
  const total = padY + textBlockH + (imageRows.length ? imageRows[0].h + 12 : 0) + padY;

  const wouldOverflow = doc.y + total > bottomLimit(doc);
  if (wouldOverflow) {
    doc.addPage();
    if (repeatHeader && !detail) drawListHeader(doc);
  }

  const y0 = doc.y + padY;

  // Spalte 1: Datum + Kilometerstand
  doc.font(FONT_BOLD).fontSize(10.5).fillColor(C.ink).text(fmtDate(entry.date), left, y0, { width: dateW, lineBreak: false });
  doc.font(FONT).fontSize(9).fillColor(C.muted).text(`${fmtInt(entry.mileage)} km`, left, y0 + 14, { width: dateW, lineBreak: false });

  // Spalte 2: Beschreibung
  let y = y0;
  doc.font(FONT_BOLD).fontSize(11.5).fillColor(C.ink).text(typeText, mainX, y, { width: mainW - (badgeW ? badgeW + 8 : 0) });
  if (entry.important) {
    const bx = mainX + mainW - badgeW;
    doc.save().roundedRect(bx, y, badgeW, 14, 3).fillAndStroke(C.warnBg, C.warnLine).restore();
    doc.font(FONT_BOLD).fontSize(7).fillColor(C.warn).text('WICHTIG', bx, y + 4.5, { width: badgeW, align: 'center', lineBreak: false });
  }
  y += typeH;
  if (entry.workshop) {
    doc.font(FONT).fontSize(9.5).fillColor(C.text).text(`Werkstatt: ${safe(entry.workshop)}`, mainX, y + 1, { width: mainW });
    y += workshopH;
  }
  if (notes) {
    doc.font(FONT).fontSize(9.5).fillColor(C.text).text(notes, mainX, y + 1, { width: mainW });
    y += notesH;
  }
  if (recurringText) {
    doc.font(FONT).fontSize(9).fillColor(C.brand).text(recurringText, mainX, y + 1, { width: mainW });
    y += recurringH;
  }
  if (filesText) {
    doc.font(FONT).fontSize(8.5).fillColor(C.muted).text(`Anhänge - ${filesText}`, mainX, y + 2, { width: mainW });
    y += filesH;
  }
  y = Math.max(y, y0 + 30);
  for (const row of imageRows) {
    y += 6;
    if (y + row.h > bottomLimit(doc)) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    drawImageRow(doc, row, y);
    y += row.h + 2;
  }

  // Spalte 3: Kosten
  const costText = entry.cost ? fmtMoney(entry.cost) : '-';
  doc.font(FONT_BOLD).fontSize(11).fillColor(entry.cost ? C.ink : C.muted).text(costText, left + width - costW, y0, {
    width: costW,
    align: 'right',
    lineBreak: false,
  });

  const rowBottom = y + padY;
  hLine(doc, rowBottom - 1, C.line, 0.5);
  doc.y = rowBottom;
  doc.x = left;
}

/* ---------- Fußzeile ---------- */

function drawFooters(doc, leftText) {
  const range = doc.bufferedPageRange();
  const left = MARGIN;
  const width = doc.page.width - 2 * MARGIN;
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    // Die untere Seitenrand-Reserve kurz aufheben, sonst würde PDFKit beim
    // Schreiben in den Fußbereich automatisch eine neue Seite anhängen.
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 44;
    hLine(doc, y - 7, C.line, 0.5);
    doc.font(FONT).fontSize(7.5).fillColor(C.muted);
    doc.text(safe(leftText), left, y, { width: width - 90, lineBreak: false });
    doc.text(`Seite ${i + 1} von ${range.count}`, left, y, { width, align: 'right', lineBreak: false });
    doc.text(
      'Eigenangaben des Fahrzeughalters - kein amtlicher oder von einer Werkstatt bestätigter Nachweis.',
      left,
      y + 11,
      { width, lineBreak: false }
    );
    doc.page.margins.bottom = savedBottom;
  }
}

async function loadHeaderImage(attachment) {
  if (!attachment || !attachment.mimeType.startsWith('image/')) return null;
  const raw = await attachmentBuffer(attachment);
  return raw ? pdfImage(raw, { maxEdge: 600, quality: 80 }) : null;
}

/* ---------- Öffentliche API ---------- */

// Vollständiges Servicebuch eines Fahrzeugs. Gibt einen Buffer zurück.
async function renderVehiclePdf(vehicle, serviceEntries, { mileageEntries = [], reminders = [], headerAttachment = null, withImages = true } = {}) {
  const now = new Date();
  const { doc, done } = createDocument({
    title: `Servicebuch ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
    subject: 'Service- und Wartungshistorie',
  });

  const headerImage = withImages ? await loadHeaderImage(headerAttachment) : null;
  await drawHeader(doc, vehicle, { kicker: 'Digitales Servicebuch', headerImage });

  const total = serviceEntries.reduce((sum, e) => sum + (e.cost || 0), 0);
  const dates = serviceEntries.map((e) => new Date(e.date)).sort((a, b) => a - b);
  const period = dates.length
    ? dates.length === 1 || fmtDate(dates[0]) === fmtDate(dates[dates.length - 1])
      ? fmtDate(dates[0])
      : `${fmtDate(dates[0])} - ${fmtDate(dates[dates.length - 1])}`
    : '-';

  drawFacts(doc, [
    { label: 'Baujahr', value: vehicle.year || '-' },
    { label: 'Fahrzeug-Ident.-Nr. (FIN)', value: vehicle.vin || '-' },
    { label: 'Aktueller Kilometerstand', value: `${fmtInt(vehicle.currentMileage)} km` },
    { label: 'Service-Einträge', value: String(serviceEntries.length) },
    { label: 'Gesamtkosten', value: fmtMoney(total) },
    { label: 'Zeitraum', value: period },
  ]);

  const plausibility = mileagePlausibility(serviceEntries, mileageEntries);
  if (plausibility) noteBox(doc, plausibility.text, plausibility.ok ? 'ok' : 'warn');

  const yearRows = costsByYear(serviceEntries).slice(0, 8);
  if (yearRows.length && total > 0) {
    sectionTitle(doc, 'Kosten nach Jahr', { minFollowing: yearRows.length * 17 });
    drawCostChart(doc, yearRows);
  }

  if (reminders.length) {
    const sorted = [...reminders].sort((a, b) => (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity));
    sectionTitle(doc, 'Anstehende Fälligkeiten', { minFollowing: 40 });
    drawReminders(doc, sorted, vehicle.currentMileage);
  }

  sectionTitle(doc, 'Service-Historie', { minFollowing: 110 });
  if (!serviceEntries.length) {
    doc.font(FONT).fontSize(10).fillColor(C.muted).text('Es sind noch keine Service-Einträge vorhanden.', MARGIN, doc.y);
  } else {
    drawListHeader(doc);
    for (const entry of serviceEntries) {
      await drawEntry(doc, entry, { withImages, layout: 'row' });
    }
  }

  drawFooters(doc, `Erstellt am ${fmtNow(now)}  |  ${vehicle.make} ${vehicle.model}  |  ${vehicle.licensePlate}`);
  doc.end();
  return done;
}

// Einzelner Service-Eintrag (z.B. als Nachweis für eine Reparatur).
async function renderServiceEntryPdf(vehicle, entry, { withImages = true } = {}) {
  const now = new Date();
  const { doc, done } = createDocument({
    title: `Service-Eintrag ${entry.type} - ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
    subject: 'Service-Nachweis',
  });

  await drawHeader(doc, vehicle, { kicker: 'Service-Nachweis', headerImage: null });
  drawFacts(doc, [
    { label: 'Baujahr', value: vehicle.year || '-' },
    { label: 'Fahrzeug-Ident.-Nr. (FIN)', value: vehicle.vin || '-' },
    { label: 'Kilometerstand bei Service', value: `${fmtInt(entry.mileage)} km` },
  ]);

  sectionTitle(doc, 'Service-Eintrag', { minFollowing: 120 });
  await drawEntry(doc, entry, { withImages, layout: 'detail', repeatHeader: false });

  drawFooters(doc, `Erstellt am ${fmtNow(now)}  |  ${vehicle.make} ${vehicle.model}  |  ${vehicle.licensePlate}`);
  doc.end();
  return done;
}

module.exports = { renderVehiclePdf, renderServiceEntryPdf, safe, fmtDate, fmtMoney, fmtInt };
