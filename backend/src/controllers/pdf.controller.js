const prisma = require('../lib/prisma');
const { renderVehiclePdf, renderServiceEntryPdf } = require('../services/pdf.service');

async function exportVehiclePdf(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden.' });

    const serviceEntries = await prisma.serviceEntry.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { date: 'desc' },
      include: { attachments: true },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="servicebuch-${vehicle.licensePlate.replace(/\s+/g, '')}.pdf"`
    );
    await renderVehiclePdf(vehicle, serviceEntries, res, { withImages: req.query.images !== 'false' });
  } catch (err) {
    next(err);
  }
}

async function exportServicePdf(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.vehicleId } });
    const entry = await prisma.serviceEntry.findUnique({
      where: { id: req.params.serviceId },
      include: { attachments: true },
    });
    if (!vehicle || !entry) return res.status(404).json({ error: 'Nicht gefunden.' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="service-${entry.id.slice(0, 8)}.pdf"`);
    await renderServiceEntryPdf(vehicle, entry, res, { withImages: req.query.images !== 'false' });
  } catch (err) {
    next(err);
  }
}

module.exports = { exportVehiclePdf, exportServicePdf };
