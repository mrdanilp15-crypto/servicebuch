const router = require('express').Router({ mergeParams: true });
const sc = require('../controllers/service.controller');
const uc = require('../controllers/upload.controller');
const upload = require('../middleware/upload');
const pdfRoutes = require('./pdf.routes');

router.get('/', sc.listServices);
router.post('/', sc.createService);
router.get('/:id', sc.getService);
router.put('/:id', sc.updateService);
router.delete('/:id', sc.deleteService);

router.post('/:serviceId/attachments', upload.single('file'), uc.addServiceAttachment);
router.use('/:serviceId/pdf', pdfRoutes);

module.exports = router;
