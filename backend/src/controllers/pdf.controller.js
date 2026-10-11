const prisma = require('../lib/prisma');
const { contentDisposition } = require('../utils/http');
const { renderVehiclePdf, renderServiceEntryPdf } = require('../services/pdf.service');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sendPdf(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', contentDisposition('attachment', filename));
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(buffer);
}

// Dateiname aus dem Kennzeichen, ohne Zeichen, die in Dateinamen Probleme machen.
function plateSlug(plate) {
  return String(plate).replace(/[\s/\\:*?"<>|]+/g, '');
}

async function exportVehiclePdf(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.vehicleId },
      include: {
        serviceEntries: { orderBy: { date: 'desc' }, include: { attachments: { orderBy: { createdAt: 'asc' } } } },
        mileageEntries: { select: { date: true, mileage: true } },
        reminderRules: { where: { active: true } },
      },
    });
    if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden.' });

    const headerAttachment = vehicle.headerImage
      ? await prisma.attachment.findUnique({ where: { id: vehicle.headerImage } })
      : null;

    const pdf = await renderVehiclePdf(vehicle, vehicle.serviceEntries, {
      mileageEntries: vehicle.mileageEntries,
      reminders: vehicle.reminderRules,
      headerAttachment,
      withImages: req.query.images !== 'false',
    });
    sendPdf(res, pdf, `Servicebuch_${plateSlug(vehicle.licensePlate)}_${today()}.pdf`);
  } catch (err) {
    next(err);
  }
}

async function exportServicePdf(req, res, next) {
  try {
    const { vehicleId, serviceId } = req.params;
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    // Der Eintrag muss zu genau diesem Fahrzeug gehören (sonst könnte man
    // über ein berechtigtes Fahrzeug fremde Einträge als PDF abrufen).
    const entry = await prisma.serviceEntry.findFirst({
      where: { id: serviceId, vehicleId },
      include: { attachments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!vehicle || !entry) return res.status(404).json({ error: 'Nicht gefunden.' });

    const pdf = await renderServiceEntryPdf(vehicle, entry, { withImages: req.query.images !== 'false' });
    sendPdf(res, pdf, `Service_${plateSlug(vehicle.licensePlate)}_${entry.date.toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    next(err);
  }
}

module.exports = { exportVehiclePdf, exportServicePdf };
