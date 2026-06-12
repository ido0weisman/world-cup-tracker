const db = require('../config/db');
const { SCORING } = require('../config/constants');

// ─── Oracle Point Tiers ───────────────────────────────────────────────────────

// Base points per stage for Oracle bets — group matches score like R32.
const ORACLE_STAGE_BASE = {
  GROUP: SCORING.R32_WINNER,
  R32:   SCORING.R32_WINNER,
  R16:   SCORING.R16_WINNER,
  QF:    SCORING.QF_WINNER,
  SF:    SCORING.SF_WINNER,
  FINAL: SCORING.FINAL_WINNER,
};

// Computes the exact points a correct Oracle bet earns, per side.
// This is THE definition — both the scorer (below) and the prediction
// endpoint use it, so what the UI promises is always what gets awarded.
// aiConfidence = max(home_prob, away_prob), or null when no AI prediction.
function getOraclePointTiers(stage, aiConfidence) {
  const base = ORACLE_STAGE_BASE[stage] ?? SCORING.R32_WINNER;

  if (aiConfidence == null) {
    return { base, with_ai: base, against_ai: base, is_high_confidence: false };
  }

  const high = aiConfidence >= SCORING.ORACLE_CONFIDENCE_HIGH;
  return {
    base,
    with_ai:    Math.round(base * (high ? SCORING.ORACLE_HIGH_WITH_AI    : SCORING.ORACLE_LOW_WITH_AI)),
    against_ai: Math.round(base * (high ? SCORING.ORACLE_HIGH_AGAINST_AI : SCORING.ORACLE_LOW_AGAINST_AI)),
    is_high_confidence: high,
  };
}

// Called after every cache refresh.
// Finds all FINISHED knockout matches with a known winner and marks every
// prediction for that match as correct (1) or incorrect (0).
// Only touches predictions where is_correct IS NULL -- already-scored rows
// are left alone so a re-run never overwrites correct data.
function scoreKnockoutPredictions() {
  // The EXISTS guard keeps this proportional to PENDING work — without it,
  // every 20-min refresh would rescan every finished match of the tournament.
  const finishedMatches = db.prepare(`
    SELECT id, winner_team_id
    FROM matches m
    WHERE stage != 'GROUP'
      AND status = 'FINISHED'
      AND winner_team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM predictions_knockout pk
        WHERE pk.match_id = m.id AND pk.is_correct IS NULL
      )
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

// Called alongside scoreKnockoutPredictions after each cache refresh.
// For every finished match with a known winner, finds all unscored oracle_bets
// and awards points based on correctness + AI confidence at bet time.
function scoreOracleBets() {
  // Same EXISTS guard as scoreKnockoutPredictions — only matches that still
  // have unscored oracle bets are worth visiting.
  const finishedMatches = db.prepare(`
    SELECT m.id, m.winner_team_id, m.home_team_id, m.away_team_id, m.stage,
           m.home_score, m.away_score
    FROM matches m
    WHERE m.status = 'FINISHED'
      AND (m.winner_team_id IS NOT NULL OR m.home_score IS NOT NULL)
      AND EXISTS (
        SELECT 1 FROM oracle_bets ob
        WHERE ob.match_id = m.id AND ob.is_correct IS NULL
      )
  `).all();

  if (!finishedMatches.length) return;

  for (const match of finishedMatches) {
    let actualWinnerId = match.winner_team_id;
    if (!actualWinnerId && match.home_score != null && match.away_score != null) {
      if (match.home_score > match.away_score)      actualWinnerId = match.home_team_id;
      else if (match.away_score > match.home_score) actualWinnerId = match.away_team_id;
      // draw -> actualWinnerId stays null -> all oracle bets on this match = incorrect
    }

    const unscoredBets = db.prepare(`
      SELECT * FROM oracle_bets WHERE match_id = ? AND is_correct IS NULL
    `).all(match.id);

    for (const bet of unscoredBets) {
      const isCorrect = actualWinnerId != null && bet.picked_winner_id === actualWinnerId ? 1 : 0;

      let pointsAwarded = 0;
      if (isCorrect) {
        // Points depend on AI confidence, not oracle agreement.
        // Confidence = max(home_prob, away_prob) — snapshotted on the bet at
        // submit time, so the tiers here match what the UI showed back then.
        const hasAI        = bet.ai_home_prob != null;
        const aiConfidence = hasAI ? Math.max(bet.ai_home_prob, bet.ai_away_prob) : null;
        const tiers        = getOraclePointTiers(match.stage, aiConfidence);

        const aiPickedHome   = hasAI && bet.ai_home_prob > bet.ai_away_prob;
        const userPickedHome = bet.picked_winner_id === match.home_team_id;
        const agreedWithAI   = hasAI && aiPickedHome === userPickedHome;

        pointsAwarded = !hasAI ? tiers.base
                      : agreedWithAI ? tiers.with_ai
                      : tiers.against_ai;
      }

      db.prepare(`
        UPDATE oracle_bets SET is_correct = ?, points_awarded = ? WHERE id = ?
      `).run(isCorrect, pointsAwarded, bet.id);
    }
  }
}

module.exports = {
  scoreKnockoutPredictions,
  setTopScorerResult,
  getTopScorerResult,
  scoreOracleBets,
  getOraclePointTiers,
};
