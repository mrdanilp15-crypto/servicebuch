// End-to-End-Tests gegen ein echtes Backend (eigener Prozess, frische temporäre
// SQLite-Datenbank, eigenes Upload-Verzeichnis). Ausführen: npm test
//
// Deckt die Kernfunktionen ab: Registrierung/Konten, Rollen und Zugriffsschutz,
// Kilometerstand-Logik (inkl. geschätzter Startwert -> genauer Stand),
// Service-Einträge, Erinnerungen, Tacho-Foto, Dateien, PDF, Datenexport und
// Löschung. Läuft mit "node --test" (Node >= 18), ohne zusätzliche Pakete.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const PORT = 4300 + Math.floor(Math.random() * 500);
const API = `http://127.0.0.1:${PORT}/api`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'servicebuch-test-'));
const uploads = path.join(tmp, 'uploads');
const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(PORT),
  DATABASE_URL: `file:${path.join(tmp, 'test.db').replace(/\\/g, '/')}`,
  DATA_DIR: path.join(tmp, 'data'),
  UPLOAD_DIR: uploads,
  CHECKPOINT_DISABLE: '1',
  REGISTRATION_OPEN: 'false',
};
let server;
const today = new Date().toISOString().slice(0, 10);

async function api(p, { method = 'GET', body, token, form, headers: extra = {} } = {}) {
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + p, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}

const photo = (w, h, color) =>
  sharp({ create: { width: w, height: h, channels: 3, background: color } })
    .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '48/1 8/1 0/1' }, IFD0: { Make: 'TESTPHONE' } })
    .jpeg()
    .toBuffer();

before(async () => {
  execSync('npx prisma migrate deploy', { cwd: ROOT, env, stdio: 'ignore' });
  server = spawn(process.execPath, ['src/index.js'], { cwd: ROOT, env, stdio: 'ignore' });
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${API}/health`)).ok) return;
    } catch {
      // Server startet noch
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Backend ist nicht gestartet.');
});

after(async () => {
  // Erst warten, bis der Server beendet ist (unter Windows hält er sonst die DB-Datei offen).
  if (server && server.exitCode === null) {
    await new Promise((resolve) => {
      server.once('exit', resolve);
      server.kill();
    });
  }
  try {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    // Aufräumen ist nur Kosmetik - ein Fehler darf den Testlauf nicht rot färben.
  }
});

const ctx = {};

test('erste Registrierung wird Admin, danach ist sie geschlossen', async () => {
  assert.equal((await api('/auth/status')).data.registrationOpen, true);
  const r = await api('/auth/register', { method: 'POST', body: { name: 'Admin', email: 'Admin@Test.de', password: 'Geheim1234' } });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'ADMIN');
  assert.equal(r.data.user.email, 'admin@test.de');
  ctx.admin = r.data.token;
  assert.equal((await api('/auth/status')).data.registrationOpen, false);
  const second = await api('/auth/register', { method: 'POST', body: { name: 'X', email: 'x@test.de', password: 'Geheim1234' } });
  assert.equal(second.status, 403);
});

test('Admin legt Nutzer an, Login ist unabhängig von der Schreibweise', async () => {
  const r = await api('/users', { method: 'POST', token: ctx.admin, body: { name: 'Vera', email: 'Vera@Test.de', password: 'Passwort123!' } });
  assert.equal(r.status, 201);
  ctx.viewerId = r.data.id;
  const login = await api('/auth/login', { method: 'POST', body: { email: 'VERA@test.de', password: 'Passwort123!' } });
  assert.equal(login.status, 200);
  ctx.viewer = login.data.token;
  assert.equal((await api('/auth/login', { method: 'POST', body: { email: 'vera@test.de', password: 'falsch' } })).status, 401);
});

test('Kilometerstand: geschätzter Startwert wird durch genaueren Eintrag ersetzt', async () => {
  let r = await api('/vehicles', { method: 'POST', token: ctx.admin, body: { licensePlate: 'kün-ab 12', make: 'Škoda', model: 'Test', currentMileage: 200000 } });
  assert.equal(r.status, 201);
  assert.equal(r.data.licensePlate, 'KÜN-AB 12');
  ctx.vid = r.data.id;
  const cur = async () => (await api(`/vehicles/${ctx.vid}`, { token: ctx.admin })).data.currentMileage;

  const list = (await api(`/vehicles/${ctx.vid}/mileage`, { token: ctx.admin })).data;
  assert.equal(list.length, 1);
  assert.equal(list[0].source, 'INITIAL');

  r = await api(`/vehicles/${ctx.vid}/mileage`, { method: 'POST', token: ctx.admin, body: { mileage: 199380, date: today } });
  assert.equal(r.status, 201);
  assert.equal(await cur(), 199380, 'aktueller Stand muss auf den genaueren Wert sinken');

  // Ein älterer Eintrag ändert den aktuellen Stand nicht, löschen/ändern stimmt ihn weiter.
  r = await api(`/vehicles/${ctx.vid}/mileage`, { method: 'POST', token: ctx.admin, body: { mileage: 150000, date: '2020-01-01' } });
  assert.equal(await cur(), 199380);
  const put = await api(`/vehicles/${ctx.vid}/mileage/${r.data.id}`, { method: 'PUT', token: ctx.admin, body: { mileage: 151000, date: '2020-02-01' } });
  assert.equal(put.data.mileage, 151000);
  assert.equal((await api(`/vehicles/${ctx.vid}/mileage/${r.data.id}`, { method: 'DELETE', token: ctx.admin })).status, 200);
  assert.equal(await cur(), 199380);

  // Fahrzeugdaten-Bearbeitung mit neuem Kilometerstand legt einen Verlaufseintrag an.
  r = await api(`/vehicles/${ctx.vid}`, { method: 'PUT', token: ctx.admin, body: { model: 'Test2', currentMileage: 199000, year: '', vin: '' } });
  assert.equal(r.status, 200);
  assert.equal(await cur(), 199000);
  assert.equal((await api(`/vehicles/${ctx.vid}`, { method: 'PUT', token: ctx.admin, body: { model: 'Test3' } })).status, 200);
  assert.equal(await cur(), 199000, 'Teil-Update darf den Stand nicht ändern');
});

test('Erinnerung rechnet ab dem aktuellen Kilometerstand', async () => {
  let r = await api(`/vehicles/${ctx.vid}/reminders`, { method: 'POST', token: ctx.admin, body: { type: 'OEL', label: 'Öl', intervalKm: 10000, intervalMonths: 12, fromNow: true } });
  assert.equal(r.status, 201);
  assert.equal(r.data.dueMileage, 199000 + 10000);
  const expected = new Date();
  expected.setUTCFullYear(expected.getUTCFullYear() + 1);
  assert.equal(r.data.dueDate.slice(0, 7), expected.toISOString().slice(0, 7));
  r = await api(`/vehicles/${ctx.vid}/reminders`, { method: 'POST', token: ctx.admin, body: { type: 'CUSTOM', label: 'x' } });
  assert.equal(r.status, 400);
});

test('Service-Einträge: Kilometerstand folgt Datum, Bearbeiten/Löschen zieht mit', async () => {
  const cur = async () => (await api(`/vehicles/${ctx.vid}`, { token: ctx.admin })).data.currentMileage;
  let r = await api(`/vehicles/${ctx.vid}/services`, {
    method: 'POST',
    token: ctx.admin,
    body: { date: today, mileage: 199500, type: 'Ölwechsel', cost: 99, recurring: true, recurringIntervalKm: 15000, recurringIntervalMonths: 12 },
  });
  assert.equal(r.status, 201);
  const sid = r.data.id;
  assert.equal(await cur(), 199500);

  r = await api(`/vehicles/${ctx.vid}/services`, { method: 'POST', token: ctx.admin, body: { date: '2021-05-05', mileage: 120000, type: 'Inspektion', cost: 10 } });
  const oldSid = r.data.id;
  assert.equal(await cur(), 199500, 'alter Service darf den aktuellen Stand nicht senken');

  await api(`/vehicles/${ctx.vid}/services/${sid}`, { method: 'PUT', token: ctx.admin, body: { mileage: 199400 } });
  assert.equal(await cur(), 199400);
  const linked = (await api(`/vehicles/${ctx.vid}/mileage`, { token: ctx.admin })).data.find((e) => e.serviceEntryId === sid);
  assert.ok(linked);
  assert.equal((await api(`/vehicles/${ctx.vid}/mileage/${linked.id}`, { method: 'DELETE', token: ctx.admin })).status, 400);

  assert.equal((await api(`/vehicles/${ctx.vid}/services`, { method: 'POST', token: ctx.admin, body: { date: today, mileage: 1, type: 'x', cost: -5 } })).data.error.includes('negativ'), true);

  assert.equal((await api(`/vehicles/${ctx.vid}/services/${sid}`, { method: 'DELETE', token: ctx.admin })).status, 204);
  assert.equal(await cur(), 199000);
  await api(`/vehicles/${ctx.vid}/services/${oldSid}`, { method: 'DELETE', token: ctx.admin });
});

test('Tacho-Foto: ansehbar, EXIF entfernt, beim Löschen weg', async () => {
  const fd = new FormData();
  fd.append('photo', new Blob([await photo(3000, 2000, '#334155')], { type: 'image/jpeg' }), 'tacho.jpg');
  fd.append('mileage', '199450');
  fd.append('date', today);
  let r = await api(`/vehicles/${ctx.vid}/mileage/photo`, { method: 'POST', token: ctx.admin, form: fd });
  assert.equal(r.status, 201);
  const att = r.data.attachment.id;
  const entry = r.data.entry.id;
  r = await api(`/attachments/${att}`, { token: ctx.admin });
  assert.equal(r.status, 200);
  const meta = await sharp(r.data).metadata();
  assert.ok(!meta.exif, 'EXIF/GPS muss entfernt sein');
  assert.ok(Math.max(meta.width, meta.height) <= 2560);
  assert.equal((await api(`/vehicles/${ctx.vid}/mileage/${entry}`, { method: 'DELETE', token: ctx.admin })).status, 200);
  assert.equal((await api(`/attachments/${att}`, { token: ctx.admin })).status, 404);
});

test('Rollen: Betrachter liest, Fremde sehen nichts, Dateien sind geschützt', async () => {
  // Service mit PDF-Rechnung
  let r = await api(`/vehicles/${ctx.vid}/services`, { method: 'POST', token: ctx.admin, body: { date: '2025-01-01', mileage: 100, type: 'TÜV', cost: 50 } });
  const sid = r.data.id;
  const fd = new FormData();
  fd.append('file', new Blob([Buffer.from('%PDF-1.4\n%%EOF')], { type: 'application/pdf' }), 'Rechnung Müller.pdf');
  r = await api(`/vehicles/${ctx.vid}/services/${sid}/attachments`, { method: 'POST', token: ctx.admin, form: fd });
  assert.equal(r.status, 201);
  assert.equal(r.data.originalName, 'Rechnung Müller.pdf', 'Umlaute im Dateinamen müssen erhalten bleiben');
  const att = r.data.id;

  assert.equal((await api(`/vehicles/${ctx.vid}`, { token: ctx.viewer })).status, 403);
  assert.equal((await api(`/attachments/${att}`, { token: ctx.viewer })).status, 404);
  assert.equal((await api('/users', { token: ctx.viewer })).status, 403);

  await api(`/vehicles/${ctx.vid}/assign`, { method: 'POST', token: ctx.admin, body: { userId: ctx.viewerId, role: 'VIEWER' } });
  assert.equal((await api(`/vehicles/${ctx.vid}/services`, { token: ctx.viewer })).status, 200);
  assert.equal((await api(`/attachments/${att}`, { token: ctx.viewer })).status, 200);
  assert.equal((await api(`/vehicles/${ctx.vid}/pdf`, { token: ctx.viewer })).status, 200);
  assert.equal((await api(`/vehicles/${ctx.vid}/services`, { method: 'POST', token: ctx.viewer, body: { date: today, mileage: 1, type: 'x' } })).status, 403);
  assert.equal((await api(`/vehicles/${ctx.vid}/mileage`, { method: 'POST', token: ctx.viewer, body: { mileage: 5 } })).status, 403);
  assert.equal((await api(`/attachments/${att}`, { method: 'DELETE', token: ctx.viewer })).status, 404);

  // Eintrag eines anderen Fahrzeugs lässt sich nicht über dieses Fahrzeug ändern
  const other = await api('/vehicles', { method: 'POST', token: ctx.admin, body: { licensePlate: 'X-1', make: 'A', model: 'B' } });
  const otherSvc = await api(`/vehicles/${other.data.id}/services`, { method: 'POST', token: ctx.admin, body: { date: today, mileage: 1, type: 'x' } });
  await api(`/vehicles/${ctx.vid}/assign`, { method: 'POST', token: ctx.admin, body: { userId: ctx.viewerId, role: 'EDITOR' } });
  assert.equal((await api(`/vehicles/${ctx.vid}/services/${otherSvc.data.id}`, { method: 'PUT', token: ctx.viewer, body: { cost: 1 } })).status, 404);
  assert.equal((await api(`/vehicles/${ctx.vid}/services/${otherSvc.data.id}/pdf`, { token: ctx.viewer })).status, 404);
});

test('Service-Eintrag benachrichtigt die anderen Zugeordneten (abwählbar)', async () => {
  const notes = async (token) => (await api('/notifications', { token })).data.filter((n) => n.type === 'SERVICE_DONE');
  const base = (await notes(ctx.viewer)).length;
  let r = await api(`/vehicles/${ctx.vid}/services`, { method: 'POST', token: ctx.admin, body: { date: today, mileage: 500, type: 'Ölwechsel', cost: 1 } });
  assert.equal(r.status, 201);
  const after = await notes(ctx.viewer);
  assert.equal(after.length, base + 1);
  assert.match(after[0].title, /Ölwechsel ist erledigt/);
  assert.equal((await notes(ctx.admin)).length, 0, 'der Ersteller wird nicht selbst benachrichtigt');

  r = await api(`/vehicles/${ctx.vid}/services`, { method: 'POST', token: ctx.admin, body: { date: today, mileage: 501, type: 'Reifen', cost: 1, notify: false } });
  assert.equal(r.status, 201);
  assert.equal((await notes(ctx.viewer)).length, base + 1, 'mit notify:false keine Meldung');

  // Nachträglich (erneut) senden, mit eigener Nachricht
  r = await api(`/vehicles/${ctx.vid}/services/${r.data.id}/notify`, { method: 'POST', token: ctx.admin, body: { message: 'Bitte Druck prüfen' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.sent, 1);
  const last = await notes(ctx.viewer);
  assert.equal(last.length, base + 2);
  assert.match(last[0].body, /Bitte Druck prüfen/);
});

test('Admin ohne Zuordnung kann Service anlegen und Benachrichtigungen senden', async () => {
  // Fahrzeug gehört nur dem anderen Nutzer; der Admin ist nicht zugeordnet.
  const own = await api('/vehicles', { method: 'POST', token: ctx.viewer, body: { licensePlate: 'OWN-1', make: 'A', model: 'B' } });
  assert.equal(own.status, 201);
  const vid = own.data.id;
  const svc = await api(`/vehicles/${vid}/services`, { method: 'POST', token: ctx.admin, body: { date: today, mileage: 10, type: 'Inspektion' } });
  assert.equal(svc.status, 201);
  const mine = (await api('/notifications', { token: ctx.viewer })).data.filter((n) => n.vehicleId === vid);
  assert.equal(mine.length, 1, 'Besitzer wird vom Admin-Eintrag benachrichtigt');
  const again = await api(`/vehicles/${vid}/services/${svc.data.id}/notify`, { method: 'POST', token: ctx.admin, body: {} });
  assert.equal(again.status, 200);
  assert.equal(again.data.sent, 1);
});

test('Letzter Admin/Besitzer ist geschützt', async () => {
  const me = (await api('/auth/me', { token: ctx.admin })).data.user;
  assert.equal((await api(`/users/${me.id}/role`, { method: 'PUT', token: ctx.admin, body: { role: 'USER' } })).status, 400);
  assert.equal((await api(`/users/${me.id}`, { method: 'DELETE', token: ctx.admin })).status, 400);
  assert.equal((await api(`/vehicles/${ctx.vid}/assign/${me.id}`, { method: 'DELETE', token: ctx.admin })).status, 400);
});

test('PDF und Dashboard', async () => {
  const pdf = await api(`/vehicles/${ctx.vid}/pdf`, { token: ctx.admin });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.data.subarray(0, 4).toString(), '%PDF');
  assert.match(pdf.headers.get('content-disposition'), /filename\*=UTF-8''Servicebuch_K%C3%9CN-AB12/);
  const dash = (await api('/dashboard', { token: ctx.admin })).data;
  assert.ok(dash.vehicles.find((v) => v.id === ctx.vid));
});

test('Passwortwechsel macht alte Tokens ungültig; Export enthält keine Hashes', async () => {
  let r = await api('/auth/password', { method: 'PUT', token: ctx.viewer, body: { currentPassword: 'falsch', newPassword: 'Neues-Passwort1' } });
  assert.equal(r.status, 400);
  r = await api('/auth/password', { method: 'PUT', token: ctx.viewer, body: { currentPassword: 'Passwort123!', newPassword: 'Neues-Passwort1' } });
  assert.equal(r.status, 200);
  assert.equal((await api('/auth/me', { token: ctx.viewer })).status, 401);
  ctx.viewer = r.data.token;
  assert.equal((await api('/auth/me', { token: ctx.viewer })).status, 200);
  const exp = await api('/auth/export', { token: ctx.viewer });
  assert.equal(exp.status, 200);
  assert.ok(!JSON.stringify(exp.data).includes('$argon2'));
});

test('Löschen entfernt auch die Dateien auf der Platte', async () => {
  const before = fs.readdirSync(uploads).length;
  assert.ok(before > 0);
  assert.equal((await api(`/vehicles/${ctx.vid}`, { method: 'DELETE', token: ctx.admin })).status, 204);
  assert.equal(fs.readdirSync(uploads).length, 0);
  // Konto löschen
  assert.equal((await api('/auth/me', { method: 'DELETE', token: ctx.viewer, body: { password: 'Neues-Passwort1' } })).status, 204);
  assert.equal((await api('/auth/me', { token: ctx.viewer })).status, 401);
});

test('Rate-Limit zählt pro Client-IP (X-Forwarded-For)', async () => {
  const attempt = (ip) =>
    fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ email: 'nobody@test.de', password: 'x' }),
    }).then((r) => r.status);
  let last;
  for (let i = 0; i < 22; i += 1) last = await attempt('203.0.113.7');
  assert.equal(last, 429);
  assert.equal(await attempt('203.0.113.8'), 401);
});
