const db = require('../../config/db');
const { LOCK, SCORING } = require('../../config/constants');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ─── Lock Helpers ─────────────────────────────────────────────────────────────

// HTTP 423 = Locked — semantically correct for "this resource is currently locked"
function assertGroupStageOpen() {
  if (new Date() > new Date(LOCK.GROUP_STAGE_LOCK_DATE)) {
    throw createError('Group stage betting is now closed.', 423);
  }
}

// Each knockout match locks independently, 1 hour before its own kickoff.
function assertMatchNotLocked(match) {
  const lockTime = new Date(
    new Date(match.match_date).getTime() - LOCK.KNOCKOUT_LOCK_HOURS_BEFORE * 60 * 60 * 1000
  );
  if (new Date() >= lockTime) {
    throw createError(
      `Betting for this match is closed (locks ${LOCK.KNOCKOUT_LOCK_HOURS_BEFORE}h before kickoff).`,
      423
    );
  }
}

// ─── Group Stage Bets ─────────────────────────────────────────────────────────

function submitGroupBet(userId, { group_name, team1_id, team2_id }) {
  assertGroupStageOpen();

  if (!group_name || !team1_id || !team2_id) {
    throw createError('group_name, team1_id, and team2_id are required.', 400);
  }
  if (Number(team1_id) === Number(team2_id)) {
    throw createError('team1_id and team2_id must be different teams.', 400);
  }

  // Verify both teams belong to the given group using group_standings,
  // which is guaranteed to use the same group_name format as the request ("Group A").
  const team1 = db.prepare('SELECT team_id FROM group_standings WHERE team_id = ? AND group_name = ?').get(team1_id, group_name);
  const team2 = db.prepare('SELECT team_id FROM group_standings WHERE team_id = ? AND group_name = ?').get(team2_id, group_name);
  if (!team1 || !team2) {
    throw createError('One or both teams were not found in the specified group.', 404);
  }

  // UPSERT — user can update their pick any time before the lock date
  db.prepare(`
    INSERT INTO predictions_group (user_id, group_name, team1_id, team2_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, group_name) DO UPDATE SET
      team1_id     = excluded.team1_id,
      team2_id     = excluded.team2_id,
      submitted_at = CURRENT_TIMESTAMP
  `).run(userId, group_name, Number(team1_id), Number(team2_id));

  return { message: 'Group bet saved.' };
}

function getGroupBets(userId) {
  const rows = db.prepare(`
    SELECT
      pg.group_name,
      pg.submitted_at,
      t1.id AS team1_id, t1.name AS team1_name, t1.short_code AS team1_code, t1.flag_url AS team1_flag,
      t2.id AS team2_id, t2.name AS team2_name, t2.short_code AS team2_code, t2.flag_url AS team2_flag
    FROM predictions_group pg
    JOIN teams t1 ON pg.team1_id = t1.id
    JOIN teams t2 ON pg.team2_id = t2.id
    WHERE pg.user_id = ?
    ORDER BY pg.group_name ASC
  `).all(userId);

  return rows.map((r) => ({
    group_name:   r.group_name,
    submitted_at: r.submitted_at,
    team1: { id: r.team1_id, name: r.team1_name, short_code: r.team1_code, flag_url: r.team1_flag },
    team2: { id: r.team2_id, name: r.team2_name, short_code: r.team2_code, flag_url: r.team2_flag },
  }));
}

// ─── Knockout Bets ────────────────────────────────────────────────────────────

function submitKnockoutBet(userId, { match_id, predicted_winner_id }) {
  if (!match_id || !predicted_winner_id) {
    throw createError('match_id and predicted_winner_id are required.', 400);
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
  if (!match) throw createError('Match not found.', 404);
  if (match.stage === 'GROUP') throw createError('Cannot bet on a group stage match here.', 400);

  assertMatchNotLocked(match);

  // Winner must be one of the two teams playing
  const winnerId = Number(predicted_winner_id);
  if (winnerId !== match.home_team_id && winnerId !== match.away_team_id) {
    throw createError('predicted_winner_id must be one of the two teams in this match.', 400);
  }

  db.prepare(`
    INSERT INTO predictions_knockout (user_id, match_id, predicted_winner_id)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, match_id) DO UPDATE SET
      predicted_winner_id = excluded.predicted_winner_id,
      submitted_at        = CURRENT_TIMESTAMP
  `).run(userId, Number(match_id), winnerId);

  return { message: 'Knockout bet saved.' };
}

function getKnockoutBets(userId) {
  const rows = db.prepare(`
    SELECT
      pk.match_id,
      pk.is_correct,
      pk.submitted_at,
      m.match_date, m.stage, m.status,
      ht.name  AS home_team_name,  ht.short_code  AS home_team_code,
      awt.name AS away_team_name,  awt.short_code AS away_team_code,
      wt.id    AS predicted_winner_id,
      wt.name  AS predicted_winner_name, wt.short_code AS predicted_winner_code
    FROM predictions_knockout pk
    JOIN matches m  ON pk.match_id = m.id
    LEFT JOIN teams ht  ON m.home_team_id = ht.id
    LEFT JOIN teams awt ON m.away_team_id = awt.id
    LEFT JOIN teams wt  ON pk.predicted_winner_id = wt.id
    WHERE pk.user_id = ?
    ORDER BY m.match_date ASC
  `).all(userId);

  return rows.map((r) => ({
    match_id:     r.match_id,
    match_date:   r.match_date,
    stage:        r.stage,
    status:       r.status,
    is_correct:   r.is_correct,
    submitted_at: r.submitted_at,
    home_team:       { name: r.home_team_name,       short_code: r.home_team_code },
    away_team:       { name: r.away_team_name,       short_code: r.away_team_code },
    predicted_winner: { id: r.predicted_winner_id, name: r.predicted_winner_name, short_code: r.predicted_winner_code },
  }));
}

// ─── Top Scorer Bet ───────────────────────────────────────────────────────────

function submitTopScorerBet(userId, { team_id, player_name }) {
  assertGroupStageOpen();

  if (!team_id || !player_name || player_name.trim().length === 0) {
    throw createError('team_id and player_name are required.', 400);
  }

  const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(team_id);
  if (!team) throw createError('Team not found.', 404);

  db.prepare(`
    INSERT INTO predictions_top_scorer (user_id, team_id, player_name)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      team_id      = excluded.team_id,
      player_name  = excluded.player_name,
      submitted_at = CURRENT_TIMESTAMP
  `).run(userId, Number(team_id), player_name.trim());

  return { message: 'Top scorer bet saved.' };
}

function getTopScorerBet(userId) {
  const row = db.prepare(`
    SELECT pts.player_name, pts.submitted_at,
           t.id AS team_id, t.name AS team_name, t.short_code AS team_code, t.flag_url AS team_flag
    FROM predictions_top_scorer pts
    JOIN teams t ON pts.team_id = t.id
    WHERE pts.user_id = ?
  `).get(userId);

  if (!row) return null;

  return {
    player_name:  row.player_name,
    submitted_at: row.submitted_at,
    team: { id: row.team_id, name: row.team_name, short_code: row.team_code, flag_url: row.team_flag },
  };
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

// All 3 point sources are computed live from source data — no pre-aggregated totals.
// Group points update as standings change; knockout points update as matches finish;
// top scorer points appear once the admin sets the tournament result.
function getLeaderboard() {
  const rows = db.prepare(`
    SELECT
      u.id,
      u.full_name,
      u.favorite_team,
      COALESCE(ko.knockout_points,  0) AS knockout_points,
      COALESCE(gp.group_points,     0) AS group_points,
      COALESCE(ts.top_scorer_points,0) AS top_scorer_points,
      COALESCE(ko.knockout_points,  0)
        + COALESCE(gp.group_points, 0)
        + COALESCE(ts.top_scorer_points, 0) AS total_points
    FROM users u

    -- Knockout: stage-weighted points for each correct prediction
    LEFT JOIN (
      SELECT pk.user_id,
        SUM(CASE WHEN pk.is_correct = 1 THEN
          CASE m.stage
            WHEN 'R32'   THEN ${SCORING.R32_WINNER}
            WHEN 'R16'   THEN ${SCORING.R16_WINNER}
            WHEN 'QF'    THEN ${SCORING.QF_WINNER}
            WHEN 'SF'    THEN ${SCORING.SF_WINNER}
            WHEN 'FINAL' THEN ${SCORING.FINAL_WINNER}
            ELSE 0
          END
        ELSE 0 END) AS knockout_points
      FROM predictions_knockout pk
      JOIN matches m ON pk.match_id = m.id
      GROUP BY pk.user_id
    ) ko ON u.id = ko.user_id

    -- Group: 5pts per predicted team currently sitting in position 1 or 2.
    -- Only counts groups where at least one match has been played — prevents
    -- pre-tournament seedings from awarding phantom points before kickoff.
    LEFT JOIN (
      SELECT pg.user_id,
        SUM(
          CASE WHEN gs1.position <= 2 THEN ${SCORING.GROUP_ADVANCE_PER_TEAM} ELSE 0 END +
          CASE WHEN gs2.position <= 2 THEN ${SCORING.GROUP_ADVANCE_PER_TEAM} ELSE 0 END
        ) AS group_points
      FROM predictions_group pg
      JOIN group_standings gs1 ON pg.team1_id = gs1.team_id AND pg.group_name = gs1.group_name
      JOIN group_standings gs2 ON pg.team2_id = gs2.team_id AND pg.group_name = gs2.group_name
      WHERE EXISTS (
        SELECT 1 FROM group_standings gs_check
        WHERE gs_check.group_name = pg.group_name AND gs_check.played > 0
      )
      GROUP BY pg.user_id
    ) gp ON u.id = gp.user_id

    -- Top scorer: 20pts if player_name (case-insensitive) and team both match the stored result
    LEFT JOIN (
      SELECT pts.user_id, ${SCORING.TOP_SCORER} AS top_scorer_points
      FROM predictions_top_scorer pts
      JOIN tournament_results tr_name ON tr_name.result_key = 'top_scorer_name'
        AND LOWER(pts.player_name) = LOWER(tr_name.result_value)
      JOIN tournament_results tr_team ON tr_team.result_key = 'top_scorer_team_id'
        AND pts.team_id = CAST(tr_team.result_value AS INTEGER)
    ) ts ON u.id = ts.user_id

    ORDER BY total_points DESC, u.full_name ASC
    LIMIT 25
  `).all();

  return rows.map((row, index) => ({ rank: index + 1, ...row }));
}

module.exports = {
  submitGroupBet,
  getGroupBets,
  submitKnockoutBet,
  getKnockoutBets,
  submitTopScorerBet,
  getTopScorerBet,
  getLeaderboard,
};
