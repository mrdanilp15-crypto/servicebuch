const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const attachmentRoutes = require('./routes/attachment.routes');
const pushRoutes = require('./routes/push.routes');
const notificationRoutes = require('./routes/notification.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const userRoutes = require('./routes/user.routes');
const legalRoutes = require('./routes/legal.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Läuft hinter Reverse-Proxys (Nginx Proxy Manager -> Next.js -> Backend):
// Ohne "trust proxy" sähe das Backend für ALLE Besucher nur die IP des
// Frontend-Containers - das Rate-Limit (Brute-Force-Schutz beim Login)
// würde dann global statt pro Nutzer zählen, und ein Angreifer könnte den
// Login für alle sperren. Vertraut werden nur private Adressbereiche
// (Docker-/LAN-Proxys), nie beliebige Clients aus dem Internet.
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

app.use(helmet({ crossOriginResourcePolicy: false }));
// Das Frontend ruft die API same-origin über seinen eigenen Server auf (kein
// CORS nötig). CORS wird nur aktiviert, wenn FRONTEND_URL gesetzt ist.
if (process.env.FRONTEND_URL) {
  app.use(cors({ origin: process.env.FRONTEND_URL.split(','), credentials: true }));
}
// Komprimiert JSON/Text-Antworten (z.B. das Dashboard mit vielen
// Service-/Kilometerstand-Einträgen). Bilder/PDFs werden automatisch
// übersprungen (schon komprimierte Formate, keine Doppelarbeit).
app.use(compression());
app.use(express.json({ limit: '2mb' }));
// Zugriffs-Log ohne IP-Adresse und User-Agent (Datensparsamkeit, DSGVO) und
// ohne Health-Check-Rauschen.
app.use(
  morgan(process.env.NODE_ENV === 'production' ? ':method :url :status :res[content-length] - :response-time ms' : 'dev', {
    skip: (req) => req.url === '/api/health',
  })
);

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/legal', legalRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
