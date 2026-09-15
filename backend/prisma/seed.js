// Beispieldaten für lokale Entwicklung / Demo. Ausführen mit: npm run seed
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await argon2.hash('Admin1234!', { type: argon2.argon2id });
  const userPassword = await argon2.hash('User1234!', { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@servicebuch.local' },
    update: {},
    create: {
      email: 'admin@servicebuch.local',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@servicebuch.local' },
    update: {},
    create: {
      email: 'user@servicebuch.local',
      password: userPassword,
      name: 'Max Mustermann',
      role: 'USER',
    },
  });

  const golf = await prisma.vehicle.create({
    data: {
      licensePlate: 'M-AB 1234',
      make: 'Volkswagen',
      model: 'Golf VIII',
      year: 2021,
      vin: 'WVWZZZAUZLW123456',
      tags: 'Privat',
      currentMileage: 48250,
      assignments: { create: [{ userId: admin.id, role: 'OWNER' }, { userId: user.id, role: 'EDITOR' }] },
    },
  });

  const transporter = await prisma.vehicle.create({
    data: {
      licensePlate: 'M-XY 987',
      make: 'Mercedes-Benz',
      model: 'Sprinter',
      year: 2019,
      vin: 'WDB9066331P123456',
      tags: 'Firma',
      currentMileage: 132400,
      assignments: { create: [{ userId: admin.id, role: 'OWNER' }] },
    },
  });

  await prisma.mileageEntry.createMany({
    data: [
      { vehicleId: golf.id, date: new Date('2023-01-15'), mileage: 32000, source: 'MANUAL' },
      { vehicleId: golf.id, date: new Date('2023-07-10'), mileage: 39500, source: 'MANUAL' },
      { vehicleId: golf.id, date: new Date('2024-02-01'), mileage: 44800, source: 'MANUAL' },
      { vehicleId: golf.id, date: new Date('2024-09-20'), mileage: 48250, source: 'MANUAL' },
    ],
  });

  await prisma.serviceEntry.create({
    data: {
      vehicleId: golf.id,
      date: new Date('2024-02-01'),
      mileage: 44800,
      type: 'Ölwechsel',
      workshop: 'Autohaus Müller GmbH',
      cost: 189.9,
      notes: 'Öl + Filter, 5W-30 Longlife',
      important: false,
      recurring: true,
      recurringIntervalMonths: 12,
      recurringIntervalKm: 15000,
    },
  });

  await prisma.serviceEntry.create({
    data: {
      vehicleId: golf.id,
      date: new Date('2023-11-05'),
      mileage: 41200,
      type: 'Bremsen erneuert',
      workshop: 'Bosch Car Service',
      cost: 540,
      notes: 'Bremsscheiben und -beläge vorne',
      important: true,
    },
  });

  await prisma.reminderRule.create({
    data: {
      vehicleId: golf.id,
      type: 'TUEV',
      label: 'Hauptuntersuchung (TÜV)',
      dueDate: new Date('2026-11-30'),
    },
  });

  await prisma.reminderRule.create({
    data: {
      vehicleId: golf.id,
      type: 'REIFEN',
      label: 'Reifenwechsel auf Winterreifen',
      dueDate: new Date('2026-10-15'),
    },
  });

  await prisma.reminderRule.create({
    data: {
      vehicleId: transporter.id,
      type: 'OEL',
      label: 'Ölwechsel Sprinter',
      dueMileage: 135000,
    },
  });

  console.log('Seed abgeschlossen.');
  console.log('Login Admin: admin@servicebuch.local / Admin1234!');
  console.log('Login User:  user@servicebuch.local  / User1234!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
