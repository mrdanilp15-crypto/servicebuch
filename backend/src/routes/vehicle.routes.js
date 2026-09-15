const router = require('express').Router();
const { requireAuth, requireVehicleAccess } = require('../middleware/auth');
const vc = require('../controllers/vehicle.controller');
const reminderRoutes = require('./reminder.routes');
const mileageRoutes = require('./mileage.routes');
const serviceRoutes = require('./service.routes');
const uploadRoutes = require('./upload.routes');
const pdfRoutes = require('./pdf.routes');

router.use(requireAuth);

router.get('/', vc.listVehicles);
router.post('/', vc.createVehicle);
router.get('/:id', requireVehicleAccess('VIEWER'), vc.getVehicle);
router.put('/:id', requireVehicleAccess('EDITOR'), vc.updateVehicle);
router.delete('/:id', requireVehicleAccess('OWNER'), vc.deleteVehicle);
router.post('/:id/assign', requireVehicleAccess('OWNER'), vc.assignUser);
router.delete('/:id/assign/:userId', requireVehicleAccess('OWNER'), vc.unassignUser);

// Verschachtelte Ressourcen pro Fahrzeug.
// Hinweis: aus Einfachheitsgründen wird pro Unterressource ein einheitliches
// Mindest-Zugriffslevel geprüft (nicht pro HTTP-Methode). Lesender Zugriff
// (PDF-Export) erfordert VIEWER, schreibender Zugriff (Service-Einträge,
// Kilometerstände, Erinnerungen, Uploads) erfordert mindestens EDITOR.
router.use('/:vehicleId/reminders', requireVehicleAccess('EDITOR'), reminderRoutes);
router.use('/:vehicleId/mileage', requireVehicleAccess('EDITOR'), mileageRoutes);
router.use('/:vehicleId/services', requireVehicleAccess('EDITOR'), serviceRoutes);
router.use('/:vehicleId/uploads', requireVehicleAccess('EDITOR'), uploadRoutes);
router.use('/:vehicleId/pdf', requireVehicleAccess('VIEWER'), pdfRoutes);

module.exports = router;
