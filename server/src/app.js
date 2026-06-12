require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const runMigrations = require('./db/migrate');
const { initCacheService } = require('./services/apiCache.service');
const { initOracleCron }   = require('./services/groqOracle.service');
const errorHandler = require('./middleware/error.middleware');
const authRoutes     = require('./modules/auth/auth.routes');
const matchesRoutes  = require('./modules/matches/matches.routes');
const groupsRoutes   = require('./modules/groups/groups.routes');
const knockoutRoutes = require('./modules/knockout/knockout.routes');
const betsRoutes     = require('./modules/bets/bets.routes');
const adminRoutes    = require('./modules/bets/admin.routes');
const squadsRoutes   = require('./modules/squads/squads.routes');
const oracleRoutes   = require('./modules/oracle/oracle.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Fly.io terminates TLS at its edge proxy and forwards requests with an
// X-Forwarded-For header. `trust proxy = 1` tells Express to trust exactly
// one proxy hop, so req.ip becomes the real client IP — without this, the
// rate limiter would see every visitor as the proxy's IP and throttle them
// all together. Trusting MORE hops than actually exist would let clients
// spoof their IP via X-Forwarded-For, so the value is deliberately 1, not true.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Protects against bot floods / abusive traffic spikes — caps how many
// requests a single IP can make in a given window. `standardHeaders` exposes
// the limit info via RateLimit-* response headers; `legacyHeaders` (the old
// X-RateLimit-* ones) are disabled since clients don't need both.

// Generous limiter for the whole API — guards against runaway/bot traffic
// without getting in the way of normal browsing.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                 // ~20 requests/minute per IP on average
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP — please try again in a few minutes.' },
});

// Stricter limiter for auth endpoints — these are the prime target for bots
// trying to mass-create accounts or brute-force logins.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // ~1 attempt/minute per IP on average
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts from this IP — please try again in 15 minutes.' },
});

// ─── Global Middleware ────────────────────────────────────────────────────────

// helmet sets ~14 security headers in one call (X-Frame-Options, HSTS,
// X-Content-Type-Options, etc.). CSP is the only directive we customise:
// - styleSrc needs 'unsafe-inline' because Vite injects critical CSS as <style> tags
// - imgSrc must whitelist crests.football-data.org for team badge images
// - connectSrc 'self' covers the SPA's /api/* fetch calls in production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'https://crests.football-data.org', 'https://upload.wikimedia.org'],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      frameSrc:    ["'none'"],
    },
  },
}));
// In dev the Vite server runs on its own origin; in production Express serves
// the build itself (same origin), so this header is effectively unused there.
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth',     authRoutes);
app.use('/api/matches',  matchesRoutes);
app.use('/api/groups',   groupsRoutes);
app.use('/api/knockout', knockoutRoutes);
app.use('/api/bets',    betsRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/squads',  squadsRoutes);
app.use('/api/oracle',  oracleRoutes);

// Any /api request that reached this point matched none of the routers above.
// Without this, the production catch-all below would answer unknown API URLs
// with index.html — confusing for API consumers and for debugging. Express
// matches middleware in registration order, so this MUST sit after all /api
// routers and before the static catch-all.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} /api${req.path}` });
});

// ─── Production: serve the built React app ──────────────────────────────────
// In production Express also serves the Vite build output — one server, one
// origin, no CORS needed for the frontend itself. The catch-all below hands
// any non-API route to React Router so direct URL visits/refreshes work.
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Error Handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  // 1. Run DB migrations (creates tables if they don't exist)
  runMigrations();

  // 2. Fetch initial data and start the 20-min polling cycle
  await initCacheService();

  // 3. Start Oracle cron — fetches daily predictions for today's matches
  initOracleCron();

  // 4. Start listening for requests
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

start();
