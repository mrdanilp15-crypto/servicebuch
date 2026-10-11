const { verifyToken } = require('../utils/jwt');
const prisma = require('../lib/prisma');

const ROLE_ORDER = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Nicht authentifiziert.' });

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden.' });

    // Nach einer Passwortänderung/einem Reset wird tokenVersion hochgezählt -
    // ältere Tokens (ohne/mit kleinerer Version) sind dann ungültig.
    if ((payload.v || 0) !== user.tokenVersion) {
      return res.status(401).json({ error: 'Sitzung abgelaufen. Bitte neu anmelden.' });
    }

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

// Prüft, ob der Nutzer auf ein Fahrzeug mindestens mit der Rolle minRole
// zugreifen darf (Admins dürfen immer). Gibt true/false zurück.
async function hasVehicleAccess(user, vehicleId, minRole = 'VIEWER') {
  if (user.role === 'ADMIN') return true;
  if (!vehicleId) return false;
  const assignment = await prisma.vehicleAssignment.findUnique({
    where: { userId_vehicleId: { userId: user.id, vehicleId } },
  });
  return !!assignment && ROLE_ORDER[assignment.role] >= ROLE_ORDER[minRole];
}

// Prüft, dass der eingeloggte Nutzer Zugriff auf das Fahrzeug :vehicleId hat.
// minRole kann eine feste Rolle sein oder - für verschachtelte Ressourcen -
// eine Funktion (req) => Rolle, damit Lesen (GET) und Schreiben unterschiedlich
// streng geprüft werden können.
function requireVehicleAccess(minRole = 'VIEWER') {
  return async function (req, res, next) {
    try {
      const vehicleId = req.params.vehicleId || req.params.id;
      const needed = typeof minRole === 'function' ? minRole(req) : minRole;
      if (!(await hasVehicleAccess(req.user, vehicleId, needed))) {
        return res.status(403).json({ error: 'Kein Zugriff auf dieses Fahrzeug.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Lesende Zugriffe (GET/HEAD) genügen mit VIEWER, alles andere erfordert
// mindestens EDITOR.
const viewerForReadEditorForWrite = (req) => (['GET', 'HEAD'].includes(req.method) ? 'VIEWER' : 'EDITOR');

module.exports = {
  requireAuth,
  requireAdmin,
  requireVehicleAccess,
  hasVehicleAccess,
  viewerForReadEditorForWrite,
};
