const { Router } = require('express');
const { setTopScorerResult, getTopScorerResult } = require('../../services/scoring.service');

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

module.exports = router;
