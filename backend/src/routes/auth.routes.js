const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ac = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

// Begrenzt Login-/Registrierungsversuche pro IP (Brute-Force-Schutz). Die
// echte Client-IP kommt über "trust proxy" (siehe app.js) aus dem
// X-Forwarded-For-Header des Reverse-Proxys.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Versuche. Bitte später erneut versuchen.' },
});

router.get('/status', ac.status);
router.post('/register', authLimiter, ac.register);
router.post('/login', authLimiter, ac.login);
router.get('/me', requireAuth, ac.me);
router.put('/password', requireAuth, authLimiter, ac.changePassword);
router.get('/export', requireAuth, ac.exportMe);
router.delete('/me', requireAuth, authLimiter, ac.deleteMe);

module.exports = router;
