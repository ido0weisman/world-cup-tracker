require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(cors({ origin: 'http://localhost:5173' })); // Vite's default dev port
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',     authRoutes);
app.use('/api/matches',  matchesRoutes);
app.use('/api/groups',   groupsRoutes);
app.use('/api/knockout', knockoutRoutes);
app.use('/api/bets',    betsRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/squads',  squadsRoutes);

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
