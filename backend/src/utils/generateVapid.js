// Einmalig ausführen: npm run vapid:generate
// Erzeugt ein VAPID Schlüsselpaar für Web Push und gibt es auf der Konsole aus.
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('\nDiese Werte in backend/.env eintragen (und den Public Key auch im Frontend, s. README).');
