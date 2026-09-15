const { verifyToken } = require('../utils/jwt');
const prisma = require('../lib/prisma');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Nicht authentifiziert.' });

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden.' });

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Nur für Administratoren.' });
  }
  next();
}

// Prüft, dass der eingeloggte Nutzer Zugriff auf das Fahrzeug :vehicleId hat
// (Admins dürfen immer, sonst muss eine VehicleAssignment existieren).
function requireVehicleAccess(minRole = 'VIEWER') {
  const order = { VIEWER: 0, EDITOR: 1, OWNER: 2 };
  return async function (req, res, next) {
    try {
      if (req.user.role === 'ADMIN') return next();

      const vehicleId = req.params.vehicleId || req.params.id || req.body.vehicleId;
      if (!vehicleId) return res.status(400).json({ error: 'vehicleId fehlt.' });

      const assignment = await prisma.vehicleAssignment.findUnique({
        where: { userId_vehicleId: { userId: req.user.id, vehicleId } },
      });

      if (!assignment || order[assignment.role] < order[minRole]) {
        return res.status(403).json({ error: 'Kein Zugriff auf dieses Fahrzeug.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireAuth, requireAdmin, requireVehicleAccess };
