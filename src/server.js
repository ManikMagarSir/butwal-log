require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.disable('x-powered-by');

// Security headers, tuned for plain-HTTP LAN (no TLS terminator on this network).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      // Deliberately no upgrade-insecure-requests: it rewrites every same-origin
      // CSS/JS fetch to https://, which fails on a plain-HTTP LAN and breaks
      // the whole UI. Re-add only behind an HTTPS deployment.
      // (helmet enables it by default, so it must be nulled out explicitly.)
      upgradeInsecureRequests: null,
    },
  },
  // Plain-HTTP LAN origins are not trustworthy origins, so COOP same-origin and
  // Origin-Agent-Cluster only emit console errors here. Re-enable behind HTTPS.
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  // No Permissions-Policy header: the app uses no camera/mic/geolocation, and
  // the default list trips "unrecognized feature" console errors. Revisit if a
  // feature needing an explicit policy is ever added.
  permissionsPolicy: false,
}));

// CORS: same-origin only by default (frontend is served by this server).
// Extra origins only via explicit ALLOWED_ORIGINS allowlist. Never '*' with credentials.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
if (allowedOrigins.length) {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
}

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// General API limiter (auth endpoints have their own stricter limiter).
// Single-instance deployment: in-memory counters are correct here. If the app
// is ever scaled behind a load balancer, back this with a shared store.
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth'));
const dclogsRouter = require('./routes/dclogs');
const gensetsRouter = require('./routes/gensets');
app.use('/api/dclogs', dclogsRouter);
app.use('/api/dc', dclogsRouter); // singular alias
app.use('/api/gensets', gensetsRouter);
app.use('/api/genset', gensetsRouter); // singular alias
app.use('/api/users', require('./routes/users'));
app.use('/api/export', require('./routes/export'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next({ status: 404, message: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Generic errors to clients; internals to the server log only.
// eslint-disable-next-line
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(`[500] ${req.method} ${req.path}:`, err.message);
  res.status(status).json({ error: status >= 500 ? 'Server error' : (err.message || 'Request failed') });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

if (require.main === module) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me-to-a-long-random-string') {
    console.warn('WARNING: set JWT_SECRET in .env');
  }
  connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/logbook')
    .then(() => app.listen(PORT, HOST, () => console.log(`Logbook on ${HOST}:${PORT}`)))
    .catch((e) => {
      console.error('DB failed:', e.message);
      process.exit(1);
    });
}

module.exports = app;
