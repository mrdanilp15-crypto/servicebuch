const fs = require('fs/promises');
const path = require('path');
const { v4: uuid } = require('uuid');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

// Schreibt einen bereits verschlüsselten Buffer unter einem zufälligen
// Dateinamen auf die Platte und gibt den Dateinamen zurück.
async function saveEncryptedFile(encryptedBuffer, ext = '.bin') {
  await ensureUploadDir();
  const fileName = `${uuid()}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), encryptedBuffer);
  return fileName;
}

async function readEncryptedFile(fileName) {
  return fs.readFile(path.join(UPLOAD_DIR, fileName));
}

async function deleteFile(fileName) {
  try {
    await fs.unlink(path.join(UPLOAD_DIR, fileName));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

module.exports = { UPLOAD_DIR, ensureUploadDir, saveEncryptedFile, readEncryptedFile, deleteFile };
