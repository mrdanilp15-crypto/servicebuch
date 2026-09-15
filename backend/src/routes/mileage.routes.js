const router = require('express').Router({ mergeParams: true });
const upload = require('../middleware/upload');
const mc = require('../controllers/mileage.controller');

router.get('/', mc.listMileage);
router.post('/', mc.addMileage);
router.post('/photo', upload.single('photo'), mc.addMileagePhoto);

module.exports = router;
