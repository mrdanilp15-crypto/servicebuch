const { z } = require('zod');
const prisma = require('../lib/prisma');

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

function publicKey(req, res) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

async function subscribe(req, res, next) {
  try {
    const data = subSchema.parse(req.body);
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: { userId: req.user.id, p256dh: data.keys.p256dh, auth: data.keys.auth },
      create: {
        userId: req.user.id,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
      },
    });
    res.status(201).json({ id: sub.id });
  } catch (err) {
    next(err);
  }
}

async function unsubscribe(req, res, next) {
  try {
    await prisma.pushSubscription
      .delete({ where: { endpoint: req.body.endpoint } })
      .catch(() => {});
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { publicKey, subscribe, unsubscribe };
