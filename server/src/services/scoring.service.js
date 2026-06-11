const db = require('../config/db');
const { SCORING } = require('../config/constants');

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

// ─── Oracle Bet Scoring ───────────────────────────────────────────────────────

// Called alongside scoreKnockoutPredictions after each cache refresh.
// For every finished match with a known winner, finds all unscored oracle_bets
// and awards points based on correctness + which Oracle the user sided with.
function scoreOracleBets() {
  const finishedMatches = db.prepare(`
    SELECT m.id, m.winner_team_id, m.home_team_id, m.away_team_id, m.stage,
           m.home_score, m.away_score
    FROM matches m
    WHERE m.status = 'FINISHED'
      AND (m.winner_team_id IS NOT NULL OR m.home_score IS NOT NULL)
  `).all();

  if (!finishedMatches.length) return;

  for (const match of finishedMatches) {
    // Determine the actual winner (knockout has winner_team_id; group stage uses scores)
    let actualWinnerId = match.winner_team_id;
    if (!actualWinnerId && match.home_score != null && match.away_score != null) {
      if (match.home_score > match.away_score)      actualWinnerId = match.home_team_id;
      else if (match.away_score > match.home_score) actualWinnerId = match.away_team_id;
      // draw → actualWinnerId stays null → all oracle bets on this match = incorrect
    }

    const unscoredBets = db.prepare(`
      SELECT * FROM oracle_bets WHERE match_id = ? AND is_correct IS NULL
    `).all(match.id);

    for (const bet of unscoredBets) {
      const isCorrect = actualWinnerId != null && bet.picked_winner_id === actualWinnerId ? 1 : 0;

      let pointsAwarded = 0;
      if (isCorrect) {
        // Determine base points from match stage
        // Oracle base points per stage — Group/R32 use 5 (gives clean 6/7/10 with ×1.2/1.4/2.0).
        // R16+ use their stage value so oracle scales with match importance.
        const stagePoints = {
          GROUP: 5, R32: 5,
          R16: SCORING.R16_WINNER, QF: SCORING.QF_WINNER,
          SF: SCORING.SF_WINNER,   FINAL: SCORING.FINAL_WINNER,
        }[match.stage] ?? 5;

        // Apply Oracle multiplier based on what the user sided with
        const algoPickedHome = bet.algorithm_home_prob > bet.algorithm_away_prob;
        const aiPickedHome   = bet.ai_home_prob != null && bet.ai_home_prob > bet.ai_away_prob;
        const userPickedHome = bet.picked_winner_id === match.home_team_id;
        const algoWasRight   = algoPickedHome === userPickedHome;
        const aiWasRight     = bet.ai_home_prob != null && aiPickedHome === userPickedHome;

        let multiplier = 1.0;
        if (bet.sided_with === 'neither') {
          multiplier = SCORING.ORACLE_DEFY_BOTH;
        } else if (bet.sided_with === 'both') {
          multiplier = SCORING.ORACLE_BOTH_AGREED;
        } else if (bet.sided_with === 'algorithm' && algoWasRight) {
          multiplier = SCORING.ORACLE_WITH_WINNER;
        } else if (bet.sided_with === 'ai' && aiWasRight) {
          multiplier = SCORING.ORACLE_WITH_WINNER;
        }

        pointsAwarded = Math.round(stagePoints * multiplier);
      }

      db.prepare(`
        UPDATE oracle_bets SET is_correct = ?, points_awarded = ? WHER