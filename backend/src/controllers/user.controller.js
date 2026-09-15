const { z } = require('zod');
const prisma = require('../lib/prisma');

async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

const roleSchema = z.object({ role: z.enum(['ADMIN', 'USER']) });

async function updateRole(req, res, next) {
  try {
    const data = roleSchema.parse(req.body);
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

async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Eigenen Account kann man nicht löschen.' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, updateRole, deleteUser };
