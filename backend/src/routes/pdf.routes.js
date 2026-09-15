const router = require('express').Router({ mergeParams: true });
const { exportVehiclePdf, exportServicePdf } = require('../controllers/pdf.controller');

// Mounted at /api/vehicles/:vehicleId/pdf UND /api/vehicles/:vehicleId/services/:serviceId/pdf
router.get('/', (req, res, next) => {
  if (req.params.serviceId) return exportServicePdf(req, res, next);
  return exportVehiclePdf(req, res, next);
});

module.exports = router;
