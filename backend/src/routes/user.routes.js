const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const uc = require('../controllers/user.controller');

router.use(requireAuth);
// Admins sehen alle Nutzer, Fahrzeug-Besitzer eine reduzierte Liste (zum Zuweisen).
router.get('/', uc.listUsers);
router.post('/', requireAdmin, uc.createUser);
router.put('/:id/role', requireAdmin, uc.updateRole);
router.put('/:id/password', requireAdmin, uc.resetPassword);
router.delete('/:id', requireAdmin, uc.deleteUser);

module.exports = router;
