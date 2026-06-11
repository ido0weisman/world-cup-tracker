const cron                   = require('node-cron');
const db                     = require('../config/db');
const { computeProbability } = require('./algorithmOracle.service');
const { DEFAULT_WEIGHT_PROFILE } = require('./oracleWeights.service');

// Asks Groq (Llama 3.3) to predict the win probability for a single match.
// Low temperature keeps responses structured and consistent.
async function fetchGroqPrediction(match) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const prompt =
    `You are a football analyst for the 2026 FIFA World Cup.\n` +
    `Predict win probabilities for this match. Consider team quality, current form, and head-to-head history.\n` +
    `Respond ONLY with valid JSON in this exact format: {"home_prob": <integer>, "away_prob": <integer>}\n` +
    `The two numbers must sum to exactly 100. No extra text, no explanation -- just JSON.\n\n` +
    `Match: ${match.home_team_name} vs ${match.away_team_name}\n` +
    `Stage: ${match.stage}\n` +
    `Date: ${match.match_date}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens:  60,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API responded with status ${response.status}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from Groq');

  const parsed = JSON.parse(content);

  if (typeof parsed.home_prob !== 'number' || typeof parsed.away_prob !== 'number') {
    throw new Error(`Unexpected Groq response shape: ${content}`);
  }

  // Normalize so they always sum to exactly 100.
  // Guard against division-by-zero if Groq returns two zeros.
  const total = parsed.home_prob + parsed.away_prob;
  if (total <= 0) throw new Error(`Groq returned zero-sum probabilities: ${content}`);

  return {
    home_prob: Math.round((parsed.home_prob / total) * 100),
    away_prob: Math.round((parsed.away_prob / total) * 100),
  };
}

// Computes algorithm predictions (default weights) and fetches Groq predictions
// for all scheduled matches today, then upserts both into oracle_predictions.
// Safe to call multiple times -- ON CONFLICT overwrites stale rows.
async function fetchPredictionsForToday() {
  const today = new Date().toISOString().split('T')[0];

  // Exclude FINISHED and in-progress matches -- no point predicting a result
  // that is already known, and overwriting snapshots after the fact could corrupt scoring.
  const matches = db.prepare(`
    SELECT m.id, m.match_date, m.stage,
           ht.id   AS home_team_id,  ht.name  AS home_team_name,
           awt.id  AS away_team_id,  awt.name AS away_team_name
    FROM   matches m
    JOIN   teams ht  ON m.home_team_id  = ht.id
    JOIN   teams awt ON m.away_team_id = awt.id
    WHERE  DATE(m.match_date) = ? AND m.status IN ('TIMED', 'SCHEDULED')
  `).all(today);

  if (!matches.length) {
    console.log('[Oracle] No matches found for today -- skipping prediction fetch.');
    return;
  }

  const upsert = db.prepare(`
    INSERT INTO oracle_predictions
      (match_id, algorithm_home_prob, algorithm_away_prob, ai_home_prob, ai_away_prob, fetched_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(match_id) DO UPDATE SET
      algorithm_home_prob = excluded.algorithm_home_prob,
      algorithm_away_prob = excluded.algorithm_away_prob,
      ai_home_prob        = excluded.ai_home_prob,
      ai_away_prob        = excluded.ai_away_prob,
      fetched_at          = CURRENT_TIMESTAMP
  `);

  for (const match of matches) {
    const algoPred = computeProbability(match, DEFAULT_WEIGHT_PROFILE);

    let aiPred = null;
    try {
      aiPred = await fetchGroqPrediction(match);
    } catch (err) {
      console.warn(`[Oracle] Groq failed for match #${match.id} (${match.home_team_name} vs ${match.away_team_name}): ${err.message}`);
    }

    upsert.run(
      match.id,
      algoPred.home_prob,
      algoPred.away_prob,
      aiPred?.home_prob ?? null,
      aiPred?.away_prob ?? null
    );
  }

  console.log(`[Oracle] Predictions stored for ${matches.length} match(es).`);
}

// Schedules the daily fetch at 06:00 UTC -- 10 hours before the earliest WC 2026
// kickoff (16:00 UTC). This guarantees predictions are ready before any match
// goes LIVE that day, regardless of time zone or schedule changes.
function initOracleCron() {
  cron.schedule('0 6 * * *', () => {
    console.log('[Oracle] Running scheduled daily prediction fetch...');
    fetchPredictionsForToday().catch(err =>
      console.error('[Oracle] Scheduled fetch failed:', err.message)
    );
  });

  fetchPredictionsForToday().catch(err =>
    console.error('[Oracle] Startup fetch failed:', err.message)
  );

  console.log('[Oracle] Cron scheduled -- daily predictions at 06:00 UTC.');
}

module.exports = { initOracleCron, fetchPredictionsForToday };
