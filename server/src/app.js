require('dotenv').config();
const express = require('express');
const cors = require('cors');

const runMigrations = require('./db/migrate');
const { initCacheService } = require('./services/apiCache.service');
const errorHandler = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(cors({ origin: 'http://localhost:5173' })); // Vite's default dev port
app.use(express.json());

// ─── Routes (added phase by phase) ───────────────────────────────────────────
// Placeholder — routes will be mounted here as we build each module.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
