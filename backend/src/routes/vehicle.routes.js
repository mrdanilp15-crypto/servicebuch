const router = require('express').Router();
const { requireAuth, requireVehicleAccess, viewerForReadEditorForWrite } = require('../middleware/auth');
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

// Verschachtelte Ressourcen pro Fahrzeug. Lesende Zugriffe (GET) erfordern
// mindestens die Rolle VIEWER, schreibende (POST/PUT/DELETE) mindestens
// EDITOR - ein reiner Betrachter sieht also Services, Kilometerstände und
// Erinnerungen, kann sie aber nicht ändern.
const access = requireVehicleAccess(viewerForReadEditorForWrite);
router.use('/:vehicleId/reminders', access, reminderRoutes);
router.use('/:vehicleId/mileage', access, mileageRoutes);
router.use('/:vehicleId/services', access, serviceRoutes);
router.use('/:vehicleId/uploads', requireVehicleAccess('EDITOR'), uploadRoutes);
router.use('/:vehicleId/pdf', requireVehicleAccess('VIEWER'), pdfRoutes);

module.exports = router;
