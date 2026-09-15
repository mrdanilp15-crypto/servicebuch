const multer = require('multer');

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 15);

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

// Dateien werden im Speicher gehalten, dann verschlüsselt und manuell
// geschrieben (siehe utils/fileCrypto.js) - so landet nie eine
// unverschlüsselte Datei auf der Platte.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Dateityp nicht erlaubt. Erlaubt: JPEG, PNG, WEBP, HEIC, PDF.'));
    }
    cb(null, true);
  },
});

module.exports = upload;
