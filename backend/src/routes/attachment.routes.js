const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { serveAttachment, deleteAttachment } = require('../controllers/upload.controller');

router.use(requireAuth);
router.get('/:id', serveAttachment);
router.delete('/:id', deleteAttachment);

module.exports = router;
