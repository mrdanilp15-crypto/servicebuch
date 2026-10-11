const argon2 = require('argon2');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { passwordField, emailField } = require('./auth.controller');
const { countAdmins, deleteUserAndData } = require('../services/account.service');

// Admins sehen alle Nutzer. Alle anderen sehen die Liste nur, wenn sie
// mindestens ein Fahrzeug besitzen (nur dann brauchen sie sie, um jemanden
// zuzuweisen) - und dann ohne Rolle/Anlagedatum. Sonst könnte jedes Konto
// alle E-Mail-Adressen der Instanz auslesen.
async function listUsers(req, res, next) {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin) {
      const ownsVehicle = await prisma.vehicleAssignment.count({ where: { userId: req.user.id, role: 'OWNER' } });
      if (!ownsVehicle) return res.status(403).json({ error: 'Kein Zugriff auf die Benutzerliste.' });
    }
    const users = await prisma.user.findMany({
      select: isAdmin
        ? { id: true, email: true, name: true, role: true, createdAt: true }
        : { id: true, email: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name fehlt.').max(100),
  email: emailField,
  password: passwordField,
  role: z.enum(['ADMIN', 'USER']).default('USER'),
});

// Admin legt ein Konto an (die Selbstregistrierung ist nach dem ersten
// Konto geschlossen, siehe auth.controller.js).
async function createUser(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    if (await prisma.user.findUnique({ where: { email: data.email } })) {
      return res.status(409).json({ error: 'E-Mail bereits registriert.' });
    }
    const user = await prisma.user.create({
      data: { ...data, password: await argon2.hash(data.password, { type: argon2.argon2id }) },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

const roleSchema = z.object({ role: z.enum(['ADMIN', 'USER']) });

async function updateRole(req, res, next) {
  try {
    const data = roleSchema.parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    if (target.role === 'ADMIN' && data.role !== 'ADMIN' && (await countAdmins()) <= 1) {
      return res.status(400).json({ error: 'Es muss mindestens ein Administrator übrig bleiben.' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: data.role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// Passwort-Reset durch den Admin (es gibt keinen E-Mail-Versand). Macht alle
// bestehenden Logins des Nutzers ungültig.
async function resetPassword(req, res, next) {
  try {
    const { password } = z.object({ password: passwordField }).parse(req.body);
    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        password: await argon2.hash(password, { type: argon2.argon2id }),
        tokenVersion: { increment: 1 },
      },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Den eigenen Account löschst du unter "Mein Konto".' });
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    if (target.role === 'ADMIN' && (await countAdmins()) <= 1) {
      return res.status(400).json({ error: 'Der letzte Administrator kann nicht gelöscht werden.' });
    }
    await deleteUserAndData(target.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateRole, resetPassword, deleteUser };
