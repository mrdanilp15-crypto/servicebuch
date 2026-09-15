const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const pc = require('../controllers/push.controller');

router.get('/public-key', pc.publicKey);
router.post('/subscribe', requireAuth, pc.subscribe);
router.post('/unsubscribe', requireAuth, pc.unsubscribe);

module.exports = router;
