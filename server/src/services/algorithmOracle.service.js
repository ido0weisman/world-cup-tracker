const db             = require('../config/db');
const fifaRankings   = require('../data/fifa_rankings.json');

const MAX_FIFA_POINTS     = 2000;
const DEFAULT_FIFA_POINTS = 1300; // fallback for teams not in the rankings file

// ─── Individual factor helpers ────────────────────────────────────────────────

function getFifaScore(teamName) {
  const points = fifaRankings[teamName] ?? DEFAULT_FIFA_POINTS;
  return points / MAX_FIFA_POINTS; // normalised 0→1
}

// Weighted recent form: last 3 matches, most recent counts most (3-2-1).
// Returns 0→1 where 1 = three consecutive wins.
function getFormScore(teamId) {
  const matches = db.prepare(`
    SELECT
      CASE WHEN home_team_id = ? THEN home_score ELSE away_score END AS goals_for,
      CASE WHEN home_team_id = ? THEN away_score ELSE home_score END AS goals_against
    FROM matches
    WHERE (home_team_id = ? OR away_team_id = ?)
      AND status = 'FINISHED'
    ORDER BY match_date DESC
    LIMIT 3
  `).all(teamId, teamId, teamId, teamId);

  if (!matches.length) return 0.5; // unknown form → neutral

  const weights = [3, 2, 1];
  let weightedScore = 0;
  let totalWeight   = 0;

  matches.forEach((m, i) => {
    const w      = weights[i] ?? 1;
    const result = m.goals_for > m.goals_against ? 1
                 : m.goals_for === m.goals_against ? 0.5
                 : 0;
    weightedScore += result * w;
    totalWeight   += w;
  });

  return totalWeight > 0 ? weightedScore / totalWeight : 0.5;
}

// Goals quality: goals per game (capped at 3 = perfect score),
// discounted slightly by how many goals the team concedes per game.
function getGoalsQualityScore(teamId) {
  const standing = db.prepare(
    'SELECT goals_for, goals_against, played FROM group_standings WHERE team_id = ?'
  ).get(teamId);

  if (!standing || standing.played === 0) return 0.5;

  const goalsPerGame   = standing.goals_for / standing.played;
  const rawScore       = Math.min(goalsPerGame / 3, 1);
  // Slight penalty for leaking goals — a team that scores 3 but concedes 3 is not as strong
  const concedeFactor  = 1 - Math.min((standing.goals_against / (standing.played * 2)), 1) * 0.2;

  return Math.min(rawScore * concedeFactor, 1);
}

// ─── Main computation ─────────────────────────────────────────────────────────

// Computes win probabilities for a match using the given weight profile.
// `match` must include: id, home_team_id, away_team_id, home_team_name, away_team_name.
function computeProbability(match, weightProfile) {
  const { fifaRanking, recentForm, goalsQuality, bookmakerOdds, upsetBoost } = weightProfile;

  // ── Raw factor scores ─────────────────────────────────────────────────────
  const homeFifa  = getFifaScore(match.home_team_name);
  const awayFifa  = getFifaScore(match.away_team_name);
  const homeForm  = getFormScore(match.home_team_id);
  const awayForm  = getFormScore(match.away_team_id);
  const homeGoals = getGoalsQualityScore(match.home_team_id);
  const awayGoals = getGoalsQualityScore(match.away_team_id);

  // ── Bookmaker odds (optional) ─────────────────────────────────────────────
  let homeBookmaker        = 0.5;
  let awayBookmaker        = 0.5;
  let effectiveBookmaker   = bookmakerOdds;

  if (bookmakerOdds > 0) {
    const odds = db.prepare('SELECT home_prob, away_prob FROM match_odds WHERE match_id = ?').get(match.id);
    if (odds) {
      homeBookmaker = odds.home_prob / 100;
      awayBookmaker = odds.away_prob / 100;
    } else {
      // No odds stored yet — redistribute bookmaker weight to the other factors
      effectiveBookmaker = 0;
    }
  }

  // When bookmaker weight is dropped, scale up the other three factors so they
  // still sum to 1.0 (preserving relative proportions between them).
  const redistributed     = bookmakerOdds - effectiveBookmaker;
  const nonBookmakerTotal = fifaRanking + recentForm + goalsQuality;

  const adjFifa  = fifaRanking  + (nonBookmakerTotal > 0 ? redistributed * fifaRanking  / nonBookmakerTotal : 0);
  const adjForm  = recentForm   + (nonBookmakerTotal > 0 ? redistributed * recentForm   / nonBookmakerTotal : 0);
  const adjGoals = goalsQuality + (nonBookmakerTotal > 0 ? redistributed * goalsQuality / nonBookmakerTotal : 0);

  // ── Weighted composite strength ───────────────────────────────────────────
  const homeStrength = homeFifa  * adjFifa
                     + homeForm  * adjForm
                     + homeGoals * adjGoals
                     + homeBookmaker * effectiveBookmaker;

  const awayStrength = awayFifa  * adjFifa
                     + awayForm  * adjForm
                     + awayGoals * adjGoals
                     + awayBookmaker * effectiveBookmaker;

  // ── Probability conversion ────────────────────────────────────────────────
  const total = homeStrength + awayStrength;
  let homeProb = total > 0 ? homeStrength / total : 0.5;

  // ── Upset boost: nudge the favourite or the underdog ─────────────────────
  if (upsetBoost !== 0) {
    // Boost is always applied in the direction of the favourite
    homeProb = homeProb >= 0.5
      ? homeProb + upsetBoost   // home is favourite — boost/shrink them
      : homeProb - upsetBoost;  // away is favourite — boost/shrink them
  }

  // Football is chaotic — clamp to a believable range
  homeProb = Math.min(0.88, Math.max(0.12, homeProb));

  return {
    home_prob: Math.round(homeProb * 100),
    away_prob: Math.round((1 - homeProb) * 100),
  };
}

module.exports = { computeProbability };
