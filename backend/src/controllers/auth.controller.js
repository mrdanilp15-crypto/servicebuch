const argon2 = require('argon2');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { signToken } = require('../utils/jwt');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben.'),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

async function register(req, res, next) {
  try {
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

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });

    const valid = await argon2.verify(user.password, data.password);
    if (!valid) return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
