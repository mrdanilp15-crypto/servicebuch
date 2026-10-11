const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET ist nicht gesetzt. Bitte .env prüfen (siehe .env.example).');
}

// Algorithmus explizit festlegen (und beim Prüfen erzwingen), damit nie ein
// anderes Verfahren akzeptiert wird.
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken };
