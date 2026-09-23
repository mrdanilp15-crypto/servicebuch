const prisma = require('../lib/prisma');

async function getDashboard(req, res, next) {
  try {
    const vehicleWhere =
      req.user.role === 'ADMIN' ? {} : { assignments: { some: { userId: req.user.id } } };

    // select statt include: das Dashboard braucht pro Service-/Kilometerstand-
    // Eintrag nur ein paar Felder, nicht das komplette Objekt (Notizen,
    // Werkstatt, Wiederkehr-Einstellungen, ...) - bei vielen Einträgen/
    // Fahrzeugen spart das spürbar Datenbank-I/O und Payload-Größe.
    const vehicles = await prisma.vehicle.findMany({
      where: vehicleWhere,
      select: {
        id: true,
        licensePlate: true,
        make: true,
        model: true,
        currentMileage: true,
        headerImage: true,
        tags: true,
        serviceEntries: { select: { date: true, cost: true } },
        mileageEntries: { select: { date: true, mileage: true }, orderBy: { date: 'asc' } },
        reminderRules: {
          where: { active: true },
          select: { id: true, type: true, label: true, dueDate: true, dueMileage: true },
        },
      },
    });

    const now = new Date();
    const currentYear = now.getFullYear();

    const costPerYear = {};
    const costPerYearByVehicle = {};
    let totalVehicles = vehicles.length;
    const dueServices = [];
    const warnings = [];
    const mileageDevelopment = {};

    for (const vehicle of vehicles) {
      costPerYearByVehicle[vehicle.id] = {};

      for (const entry of vehicle.serviceEntries) {
        const year = new Date(entry.date).getFullYear();
        costPerYear[year] = (costPerYear[year] || 0) + (entry.cost || 0);
        costPerYearByVehicle[vehicle.id][year] = (costPerYearByVehicle[vehicle.id][year] || 0) + (entry.cost || 0);
      }

      mileageDevelopment[vehicle.id] = {
        vehicleId: vehicle.id,
        label: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
        points: vehicle.mileageEntries.map((m) => ({ date: m.date, mileage: m.mileage })),
      };

      for (const rule of vehicle.reminderRules) {
        const dueSoon =
          (rule.dueDate && new Date(rule.dueDate).getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) ||
          (rule.dueMileage != null && rule.dueMileage - vehicle.currentMileage < 1000);

        if (dueSoon) {
          const item = {
            vehicleId: vehicle.id,
            vehicleLabel: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
            ruleId: rule.id,
            type: rule.type,
            label: rule.label,
            dueDate: rule.dueDate,
            dueMileage: rule.dueMileage,
          };
          dueServices.push(item);

          const overdue =
            (rule.dueDate && new Date(rule.dueDate) < now) ||
            (rule.dueMileage != null && rule.dueMileage <= vehicle.currentMileage);
          if (overdue) warnings.push({ ...item, overdue: true });
        }
      }
    }

    dueServices.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

    res.json({
      totalVehicles,
      vehicles: vehicles.map((v) => ({
        id: v.id,
        licensePlate: v.licensePlate,
        make: v.make,
        model: v.model,
        currentMileage: v.currentMileage,
        headerImage: v.headerImage,
        tags: v.tags ? v.tags.split(',').filter(Boolean) : [],
      })),
      dueServices,
      warnings,
      costPerYear: Object.entries(costPerYear)
        .map(([year, cost]) => ({ year: Number(year), cost: Math.round(cost * 100) / 100 }))
        .sort((a, b) => a.year - b.year),
      currentYearCost: Math.round((costPerYear[currentYear] || 0) * 100) / 100,
      costPerYearByVehicle: Object.fromEntries(
        Object.entries(costPerYearByVehicle).map(([vehicleId, byYear]) => [
          vehicleId,
          {
            costPerYear: Object.entries(byYear)
              .map(([year, cost]) => ({ year: Number(year), cost: Math.round(cost * 100) / 100 }))
              .sort((a, b) => a.year - b.year),
            currentYearCost: Math.round((byYear[currentYear] || 0) * 100) / 100,
          },
        ])
      ),
      mileageDevelopment: Object.values(mileageDevelopment),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
