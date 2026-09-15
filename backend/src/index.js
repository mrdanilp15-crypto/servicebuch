require('dotenv').config();
const app = require('./app');
const { startScheduler } = require('./jobs/scheduler');
const { ensureUploadDir } = require('./services/storage.service');

const PORT = process.env.PORT || 4000;

async function main() {
  await ensureUploadDir();
  startScheduler();
  app.listen(PORT, () => {
    console.log(`Servicebuch API läuft auf http://localhost:${PORT}`);
  });
}

main();
