const router = require('express').Router({ mergeParams: true });
const rc = require('../controllers/reminder.controller');

router.get('/', rc.listReminders);
router.post('/', rc.createReminder);
router.put('/:id', rc.updateReminder);
router.delete('/:id', rc.deleteReminder);

module.exports = router;
