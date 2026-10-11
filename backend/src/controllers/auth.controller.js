const argon2 = require('argon2');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { signToken } = require('../utils/jwt');
const { exportUserData, deleteUserAndData, countAdmins } = require('../services/account.service');

const emailField = z.string().trim().toLowerCase().email('Bitte eine gültige E-Mail-Adresse angeben.').max(200);
// Obergrenze schützt vor absichtlich riesigen Passwörtern (Argon2 wäre dann
// ein einfacher Hebel, den Server auszulasten).
const passwordField = z
  .string()
  .min(8, 'Passwort muss mindestens 8 Zeichen haben.')
  .max(128, 'Passwort darf höchstens 128 Zeichen haben.');

const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  name: z.string().trim().min(1, 'Name fehlt.').max(100),
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(128),
});

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function issueToken(user) {
  return signToken({ sub: user.id, role: user.role, v: user.tokenVersion });
}

// Registrierung ist nur offen, solange noch kein Konto existiert (der erste
// Nutzer wird Admin) - danach legt der Admin weitere Konten an. Wer die
// offene Selbstregistrierung bewusst will, setzt REGISTRATION_OPEN=true.
// Hintergrund: Die App ist oft per Domain im Internet erreichbar; ohne diese
// Sperre könnte sich jeder, der die Adresse kennt, ein Konto anlegen.
async function isRegistrationOpen() {
  if (process.env.REGISTRATION_OPEN === 'true') return true;
  return (await prisma.user.count()) === 0;
}

async function status(req, res, next) {
  try {
    res.json({ registrationOpen: await isRegistrationOpen() });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    if (!(await isRegistrationOpen())) {
      return res.status(403).json({
        error: 'Die Registrierung ist geschlossen. Neue Konten legt ein Administrator an.',
      });
    }
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: 'E-Mail bereits registriert.' });

    // Erster Benutzer im System wird automatisch Admin.
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'USER';

    const hash = await argon2.hash(data.password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: { email: data.email, password: hash, name: data.name, role },
    });

    res.status(201).json({ token: issueToken(user), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

// Wird für unbekannte E-Mail-Adressen verifiziert, damit Login-Antworten
// gleich lange dauern und man so nicht herausfinden kann, welche Adressen
// registriert sind.
let dummyHashPromise;
function dummyHash() {
  if (!dummyHashPromise) dummyHashPromise = argon2.hash('timing-equalizer', { type: argon2.argon2id });
  return dummyHashPromise;
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    const valid = await argon2.verify(user ? user.password : await dummyHash(), data.password).catch(() => false);
    if (!user || !valid) return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });

    res.json({ token: issueToken(user), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordField,
});

// Passwort ändern: alle bisherigen Logins (auch auf anderen Geräten) werden
// ungültig, das aktuelle Gerät erhält direkt ein neues Token.
async function changePassword(req, res, next) {
  try {
    const data = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await argon2.verify(user.password, data.currentPassword))) {
      return res.status(400).json({ error: 'Das aktuelle Passwort ist falsch.' });
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await argon2.hash(data.newPassword, { type: argon2.argon2id }),
        tokenVersion: { increment: 1 },
      },
    });
    res.json({ token: issueToken(updated), user: toPublicUser(updated) });
  } catch (err) {
    next(err);
  }
}

// Auskunft / Datenübertragbarkeit (Art. 15, 20 DSGVO).
async function exportMe(req, res, next) {
  try {
    const data = await exportUserData(req.user.id);
    res.setHeader('Content-Disposition', 'attachment; filename="servicebuch-datenexport.json"');
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// Löschung (Art. 17 DSGVO). Zur Sicherheit muss das Passwort erneut bestätigt
// werden. Der einzige Admin kann sich nicht selbst löschen, sonst wäre die
// Instanz danach nicht mehr verwaltbar.
async function deleteMe(req, res, next) {
  try {
    const { password } = z.object({ password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await argon2.verify(user.password, password))) {
      return res.status(400).json({ error: 'Das Passwort ist falsch.' });
    }
    if (user.role === 'ADMIN' && (await countAdmins()) <= 1) {
      return res.status(400).json({
        error: 'Du bist der einzige Administrator. Ernenne zuerst einen anderen Nutzer zum Admin.',
      });
    }
    await deleteUserAndData(user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, status, changePassword, exportMe, deleteMe, passwordField, emailField };
