require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const runMigrations = require('./db/migrate');
const { initCacheService } = require('./services/apiCache.service');
const errorHandler = require('./middleware/error.middleware');
const authRoutes     = require('./modules/auth/auth.routes');
const matchesRoutes  = require('./modules/matches/matches.routes');
const groupsRoutes   = require('./modules/groups/groups.routes');
const knockoutRoutes = require('./modules/knockout/knockout.routes');
const betsRoutes     = require('./modules/bets/bets.routes');
const adminRoutes    = require('./modules/bets/admin.routes');
const squadsRoutes   = require('./modules/squads/squads.routes');

const app = express();
const PORT = process.env.PORT || 5000;

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

app.use(cors({ origin: 'http://localhost:5173' })); // Vite's default dev port
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

  // 3. Start listening for requests
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

start();
