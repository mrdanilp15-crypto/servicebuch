// Bildverarbeitung für Uploads und PDF-Export (sharp).
//
// 1) Uploads: Fotos vom Handy enthalten EXIF-Metadaten (u.a. exakte
//    GPS-Koordinaten des Aufnahmeorts, Gerätemodell, Zeitstempel). Das sind
//    personenbezogene Daten, die für ein Servicebuch nicht gebraucht werden
//    (Datenminimierung, Art. 5 Abs. 1 lit. c DSGVO) - sie werden deshalb beim
//    Upload entfernt. Gleichzeitig wird die Ausrichtung korrekt eingerechnet
//    und das Bild auf eine sinnvolle Maximalgröße verkleinert.
// 2) PDF: PDFKit bettet JPEG/PNG unverändert ein - ein Handyfoto mit 5-10 MB
//    würde das PDF unnötig aufblähen und WebP/HEIC gar nicht darstellen. Für
//    das PDF wird daher jedes Bild zu einem kompakten JPEG umgerechnet.
const sharp = require('sharp');

// Verhindert, dass sharp bei Dutzenden gleichzeitigen Uploads viel RAM belegt.
sharp.cache(false);
sharp.concurrency(2);

const PROCESSABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const UPLOAD_MAX_EDGE = 2560;

// Gibt { buffer, mimeType } zurück. Schlägt die Verarbeitung fehl (z.B.
// HEIC ohne passenden Decoder), wird die Originaldatei unverändert
// gespeichert - ein Upload scheitert deshalb nie an der Bildverarbeitung.
async function sanitizeUpload(buffer, mimeType) {
  if (!PROCESSABLE.has(mimeType)) return { buffer, mimeType };
  try {
    let pipeline = sharp(buffer, { failOn: 'none' }).rotate(); // rotate() wendet EXIF-Orientation an und entfernt sie
    pipeline = pipeline.resize({
      width: UPLOAD_MAX_EDGE,
      height: UPLOAD_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (mimeType === 'image/png') {
      return { buffer: await pipeline.png({ compressionLevel: 9 }).toBuffer(), mimeType };
    }
    if (mimeType === 'image/webp') {
      return { buffer: await pipeline.webp({ quality: 85 }).toBuffer(), mimeType };
    }
    // JPEG; HEIC/HEIF werden (falls dekodierbar) in JPEG umgewandelt, damit
    // sie in jedem Browser und im PDF angezeigt werden können.
    return { buffer: await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), mimeType: 'image/jpeg' };
  } catch {
    return { buffer, mimeType };
  }
}

// Kompaktes JPEG für den PDF-Export. Gibt null zurück, wenn das Bild nicht
// lesbar ist.
async function pdfImage(buffer, { maxEdge = 1000, quality = 78 } = {}) {
  try {
    const out = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .flatten({ background: '#ffffff' }) // PNG-Transparenz -> weiß statt schwarz
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer({ resolveWithObject: true });
    return { buffer: out.data, width: out.info.width, height: out.info.height };
  } catch {
    return null;
  }
}

module.exports = { sanitizeUpload, pdfImage };
