const { Router } = require('express');
const { setTopScorerResult, getTopScorerResult } = require('../../services/scoring.service');
const { fetchPredictionsForToday } = require('../../services/groqOracle.service');
const db = require('../../config/db');

const router = Router();

// Protects admin endpoints with a static key stored in the .env file.
// Not a full RBAC system — just enough to prevent public access.
function adminGuard(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  next();
}

// GET /api/admin/top-scorer — check the current stored result
router.get('/top-scorer', adminGuard, (req, res, next) => {
  try {
    const result = getTopScorerResult();
    res.json({ result });
  } catch (err) { next(err); }
});

// POST /api/admin/top-scorer — set the actual top scorer once the tournament ends
// Body: { "player_name": "Kylian Mbappé", "team_id": 42 }
router.post('/top-scorer', adminGuard, (req, res, next) => {
  try {
    const { player_name, team_id } = req.body;
    if (!player_name || !team_id) {
      return res.status(400).json({ error: 'player_name and team_id are required.' });
    }
    setTopScorerResult(player_name, team_id);
    res.json({ message: 'Top scorer result saved. Leaderboard will update immediately.' });
  } catch (err) { next(err); }
});

// DELETE /api/admin/user?email=... — delete a single user and all their data
router.delete('/user', adminGuard, (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email query param required.' });

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    db.prepare('DELETE FROM oracle_bets              WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM oracle_profiles          WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM predictions_top_scorer   WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM predictions_knockout     WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM predictions_group        WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM users                    WHERE id      = ?').run(user.id);

    res.json({ message: `User ${email} deleted.` });
  } catch (err) { next(err); }
});

// DELETE /api/admin/users — wipe all users and their predictions
router.delete('/users', adminGuard, (req, res, next) => {
  try {
    db.exec(`
      DELETE FROM predictions_top_scorer;
      DELETE FROM predictions_knockout;
      DELETE FROM predictions_group;
      DELETE FROM users;
    `);
    res.json({ message: 'All users and predictions cleared.' });
  } catch (err) { next(err); }
});

// GET /api/admin/debug-matches — return raw match rows to diagnose oracle issues
router.get('/debug-matches', adminGuard, (req, res, next) => {
  try {
    const rows = db.prepare(
      'SELECT id, match_date, status FROM matches ORDER BY match_date LIMIT 20'
    ).all();
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/admin/oracle-refresh — manually trigger today's Oracle prediction fetch
// Useful right after setting GROQ_API_KEY or to re-run after a Groq failure.
router.post('/oracle-refresh', adminGuard, async (req, res, next) => {
  try {
    await fetchPredictionsForToday();
    res.json({ message: 'Oracle predictions refreshed for today\'s matches.' });
  } catch (err) { next(err); }
});

module.exports = router;
