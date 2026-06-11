const db                     = require('../../config/db');
const { buildWeightProfile, generateOracleName } = require('../../services/oracleWeights.service');
const { computeProbability } = require('../../services/algorithmOracle.service');
const { LOCK }               = require('../../config/constants');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function assertMatchNotLocked(match) {
  const lockTime = new Date(
    new Date(match.match_date).getTime() - LOCK.KNOCKOUT_LOCK_HOURS_BEFORE * 60 * 60 * 1000
  );
  if (new Date() >= lockTime) {
    throw createError('Oracle predictions are closed for this match.', 423);
  }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function getOracleProfile(userId) {
  return db.prepare('SELECT * FROM oracle_profiles WHERE user_id = ?').get(userId) ?? null;
}

function saveOracleProfile(userId, { strength_card, market_card, upset_card }) {
  const VALID = {
    strength_card: ['legacy', 'hot', 'goals'],
    market_card:   ['trust_market', 'balanced', 'ignore_market'],
    upset_card:    ['favorites', 'upsets', 'neutral'],
  };

  if (!VALID.strength_card.includes(strength_card)) throw createError('Invalid strength_card.', 400);
  if (!VALID.market_card.includes(market_card))     throw createError('Invalid market_card.', 400);
  if (!VALID.upset_card.includes(upset_card))       throw createError('Invalid upset_card.', 400);

  const oracleName = generateOracleName(strength_card, market_card, upset_card);

  db.prepare(`
    INSERT INTO oracle_profiles (user_id, strength_card, market_card, upset_card, oracle_name, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      strength_card = excluded.strength_card,
      market_card   = excluded.market_card,
      upset_card    = excluded.upset_card,
      oracle_name   = excluded.oracle_name,
      updated_at    = CURRENT_TIMESTAMP
  `).run(userId, strength_card, market_card, upset_card, oracleName);

  return { oracle_name: oracleName };
}

// ─── Predictions ──────────────────────────────────────────────────────────────

function getOraclePrediction(matchId, userId) {
  const match = db.prepare(`
    SELECT m.*, ht.name AS home_team_name, awt.name AS away_team_name
    FROM   matches m
    JOIN   teams ht  ON m.home_team_id  = ht.id
    JOIN   teams awt ON m.away_team_id = awt.id
    WHERE  m.id = ?
  `).get(matchId);

  if (!match) throw createError('Match not found.', 404);

  // Groq AI prediction — retrieved from the daily-fetched table
  const stored = db.prepare('SELECT * FROM oracle_predictions WHERE match_id = ?').get(matchId);

  // Algorithm prediction — personalised if user has built an Oracle, else use stored default
  let algorithmPred;
  if (userId) {
    const profile = getOracleProfile(userId);
    if (profile) {
      const weights = buildWeightProfile(profile.strength_card, profile.market_card, profile.upset_card);
      algorithmPred = computeProbability(match, weights);
    }
  }

  if (!algorithmPred && stored) {
    algorithmPred = { home_prob: stored.algorithm_home_prob, away_prob: stored.algorithm_away_prob };
  }

  algorithmPred = algorithmPred ?? { home_prob: 50, away_prob: 50 };

  const aiPred = stored?.ai_home_prob != null
    ? { home_prob: stored.ai_home_prob, away_prob: stored.ai_away_prob }
    : null;

  return { match_id: matchId, algorithm: algorithmPred, ai: aiPred };
}

// Returns Oracle predictions for all of today's scheduled matches.
function getTodayPredictions(userId) {
  const today = new Date().toISOString().split('T')[0];

  const matches = db.prepare(`
    SELECT m.id, m.match_date, m.stage, m.status,
           ht.id AS home_team_id,  ht.name AS home_team_name,
           ht.flag_url AS home_flag,
           awt.id AS away_team_id, awt.name AS away_team_name,
           awt.flag_url AS away_flag
    FROM   matches m
    JOIN   teams ht  ON m.home_team_id  = ht.id
    JOIN   teams awt ON m.away_team_id = awt.id
    WHERE  DATE(m.match_date) = ?
    ORDER  BY m.match_date ASC
  `).all(today);

  return matches.map(m => ({
    match:      m,
    prediction: getOraclePrediction(m.id, userId),
  }));
}

// ─── Betting ──────────────────────────────────────────────────────────────────

function submitOracleBet(userId, { match_id, picked_winner_id, sided_with }) {
  const VALID_SIDES = ['algorithm', 'ai', 'both', 'neither'];

  if (!match_id || !picked_winner_id || !sided_with) {
    throw createError('match_id, picked_winner_id, and sided_with are required.', 400);
  }
  if (!VALID_SIDES.includes(sided_with)) {
    throw createError('Invalid sided_with value.', 400);
  }

  const match = db.prepare(`
    SELECT m.*, ht.name AS home_team_name, awt.name AS away_team_name
    FROM   matches m
    JOIN   teams ht  ON m.home_team_id  = ht.id
    JOIN   teams awt ON m.away_team_id = awt.id
    WHERE  m.id = ?
  `).get(match_id);

  if (!match) throw createError('Match not found.', 404);
  assertMatchNotLocked(match);

  const winnerId = Number(picked_winner_id);
  if (winnerId !== match.home_team_id && winnerId !== match.away_team_id) {
    throw createError('picked_winner_id must be one of the two teams in this match.', 400);
  }

  // Snapshot both predictions at the time of betting so scoring is always
  // based on what was shown to the user, even if predictions refresh later.
  const prediction = getOraclePrediction(Number(match_id), userId);

  db.prepare(`
    INSERT INTO oracle_bets
      (user_id, match_id, picked_winner_id, sided_with,
       algorithm_home_prob, algorithm_away_prob, ai_home_prob, ai_away_prob)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, match_id) DO UPDATE SET
      picked_winner_id    = excluded.picked_winner_id,
      sided_with          = excluded.sided_with,
      algorithm_home_prob = excluded.algorithm_home_prob,
      algorithm_away_prob = excluded.algorithm_away_prob,
      ai_home_prob        = excluded.ai_home_prob,
      ai_away_prob        = excluded.ai_away_prob,
      submitted_at        = CURRENT_TIMESTAMP
  `).run(
    userId,
    Number(match_id),
    winnerId,
    sided_with,
    prediction.algorithm.home_prob,
    prediction.algorithm.away_prob,
    prediction.ai?.home_prob ?? null,
    prediction.ai?.away_prob ?? null
  );

  return { message: 'Oracle bet saved.' };
}

function getOracleBet(userId, matchId) {
  return db.prepare('SELECT * FROM oracle_bets WHERE user_id = ? AND match_id = ?')
    .get(userId, matchId) ?? null;
}

// ─── Accuracy ─────────────────────────────────────────────────────────────────

// Compares stored predictions against actual match results for all finished
// matches that have oracle_predictions rows. Both algorithm and AI are scored
// independently — if the match had no winner (group stage draw) it counts
// as a loss for both Oracles.
function getOracleAccuracy() {
  const algoStats = db.prepare(`
    SELECT
      COUNT(CASE WHEN
        (op.algorithm_home_prob > op.algorithm_away_prob AND m.home_team_id = m.winner_team_id) OR
        (op.algorithm_away_prob > op.algorithm_home_prob AND m.away_team_id = m.winner_team_id)
        THEN 1 END) AS wins,
      COUNT(*) AS total
    FROM oracle_predictions op
    JOIN matches m ON op.match_id = m.id
    WHERE m.status = 'FINISHED'
  `).get();

  const aiStats = db.prepare(`
    SELECT
      COUNT(CASE WHEN
        (op.ai_home_prob > op.ai_away_prob AND m.home_team_id = m.winner_team_id) OR
        (op.ai_away_prob > op.ai_home_prob AND m.away_team_id = m.winner_team_id)
        THEN 1 END) AS wins,
      COUNT(*) AS total
    FROM oracle_predictions op
    JOIN matches m ON op.match_id = m.id
    WHERE m.status = 'FINISHED' AND op.ai_home_prob IS NOT NULL
  `).get();

  const toRecord = ({ wins, total }) => ({
    wins:   wins   ?? 0,
    losses: (total ?? 0) - (wins ?? 0),
    total:  total  ?? 0,
  });

  return { algorithm: toRecord(algoStats), ai: toRecord(aiStats) };
}

module.exports = {
  getOracleProfile,
  saveOracleProfile,
  getOraclePrediction,
  getTodayPredictions,
  submitOracleBet,
  getOracleBet,
  getOracleAccuracy,
};
