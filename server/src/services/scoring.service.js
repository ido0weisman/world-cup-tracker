const db = require('../config/db');

// ─── Knockout Scoring ─────────────────────────────────────────────────────────

// Called after every cache refresh.
// Finds all FINISHED knockout matches with a known winner and marks every
// prediction for that match as correct (1) or incorrect (0).
// Only touches predictions where is_correct IS NULL — already-scored rows
// are left alone so a re-run never overwrites correct data.
function scoreKnockoutPredictions() {
  const finishedMatches = db.prepare(`
    SELECT id, winner_team_id
    FROM matches
    WHERE stage != 'GROUP'
      AND status = 'FINISHED'
      AND winner_team_id IS NOT NULL
  `).all();

  if (finishedMatches.length === 0) return;

  const scoreMatch = db.prepare(`
    UPDATE predictions_knockout
    SET is_correct = CASE WHEN predicted_winner_id = ? THEN 1 ELSE 0 END
    WHERE match_id = ? AND is_correct IS NULL
  `);

  for (const match of finishedMatches) {
    const changes = scoreMatch.run(match.winner_team_id, match.id).changes;
    if (changes > 0) {
      console.log(`[Scoring] Scored ${changes} prediction(s) for match #${match.id}`);
    }
  }
}

// ─── Top Scorer Result ────────────────────────────────────────────────────────

// Called by the admin endpoint once the tournament ends and the top scorer
// is officially confirmed. Stores the result so the leaderboard can award points.
function setTopScorerResult(playerName, teamId) {
  const upsert = db.prepare(`
    INSERT INTO tournament_results (result_key, result_value)
    VALUES (?, ?)
    ON CONFLICT(result_key) DO UPDATE SET result_value = excluded.result_value, set_at = CURRENT_TIMESTAMP
  `);

  db.exec('BEGIN');
  try {
    upsert.run('top_scorer_name',    playerName.trim());
    upsert.run('top_scorer_team_id', String(teamId));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  console.log(`[Scoring] Top scorer result set: ${playerName} (team #${teamId})`);
}

function getTopScorerResult() {
  const name   = db.prepare("SELECT result_value FROM tournament_results WHERE result_key = 'top_scorer_name'").get();
  const teamId = db.prepare("SELECT result_value FROM tournament_results WHERE result_key = 'top_scorer_team_id'").get();

  if (!name || !teamId) return null;
  return { player_name: name.result_value, team_id: Number(teamId.result_value) };
}

module.exports = { scoreKnockoutPredictions, setTopScorerResult, getTopScorerResult };
