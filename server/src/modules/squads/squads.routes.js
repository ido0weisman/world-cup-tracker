const { Router } = require('express');
const db = require('../../config/db');

const router = Router();

// Position display order and labels
const POSITION_ORDER = ['Goalkeeper', 'Defence', 'Midfield', 'Offence'];

// GET /api/squads/:teamCode  — returns squad for a team by its 3-letter code (e.g. FRA)
router.get('/:teamCode', (req, res, next) => {
  try {
    const cache = db.prepare("SELECT payload FROM api_cache WHERE cache_key = 'team_squads'").get();
    if (!cache) return res.json({ players: [] });

    const data = JSON.parse(cache.payload);
    const team = data.teams?.find(
      t => t.tla?.toUpperCase() === req.params.teamCode.toUpperCase()
    );

    if (!team || !team.squad?.length) {
      return res.json({ players: [] });
    }

    const players = team.squad
      .map(p => ({
        id:       p.id,
        name:     p.name,
        position: p.position ?? 'Unknown',
      }))
      .sort((a, b) => {
        const ai = POSITION_ORDER.indexOf(a.position);
        const bi = POSITION_ORDER.indexOf(b.position);
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.name.localeCompare(b.name);
      });

    res.json({ players });
  } catch (err) { next(err); }
});

module.exports = router;
