const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const nc = require('../controllers/notification.controller');

router.use(requireAuth);
router.get('/', nc.listNotifications);
router.post('/:id/read', nc.markRead);
router.post('/read-all', nc.markAllRead);
router.post('/check', nc.runCheck);

module.exports = router;
