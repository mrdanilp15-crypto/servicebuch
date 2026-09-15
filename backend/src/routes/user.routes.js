const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const uc = require('../controllers/user.controller');

router.use(requireAuth);
// Jeder eingeloggte Nutzer darf die Liste sehen, um Fahrzeuge zuzuweisen.
router.get('/', uc.listUsers);
router.put('/:id/role', requireAdmin, uc.updateRole);
router.delete('/:id', requireAdmin, uc.deleteUser);

module.exports = router;
