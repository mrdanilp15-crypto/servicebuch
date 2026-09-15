const router = require('express').Router({ mergeParams: true });
const upload = require('../middleware/upload');
const uc = require('../controllers/upload.controller');

router.post('/header', upload.single('image'), uc.setHeaderImage);
router.post('/gallery', upload.array('images', 20), uc.addGalleryImages);
router.delete('/gallery/:imageId', uc.deleteGalleryImage);

module.exports = router;
