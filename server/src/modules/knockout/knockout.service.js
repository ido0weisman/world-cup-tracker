const db = require('../../config/db');
const { getMatchLockInfo } = require('../../utils/matchLock');

function formatMatch(row) {
  return {
    id:         row.id,
    match_date: row.match_date,
    // lock_time + is_locked — computed server-side so the betting page
    // doesn't re-derive the lock rule from its own constants
    ...getMatchLockInfo(row.match_date),
    stadium:    row.stadium,
    city:       row.city,
    stage:      row.stage,
    status:     row.status,
    home_score: row.home_score,
    away_score: row.away_score,
    // Bracket slots aren't filled until the previous round finishes — return
    // null (not an empty-but-truthy object) so the frontend can render a
    // proper "TBD" / "not yet determined" state instead of a blank card.
    home_team: row.home_team_id ? {
      name:       row.home_team_name,
      short_code: row.home_team_code,
      flag_url:   row.home_team_flag,
    } : null,
    away_team: row.away_team_id ? {
      name:       row.away_team_name,
      short_code: row.away_team_code,
      flag_url:   row.away_team_flag,
    } : null,
  };
}

function getKnockoutBracket() {
  const rows = db.prepare(`
    SELECT
      m.*,
      ht.name       AS home_team_name,
      ht.short_code AS home_team_code,
      ht.flag_url   AS home_team_flag,
      awt.name       AS away_team_name,
      awt.short_code AS away_team_code,
      awt.flag_url   AS away_team_flag
    FROM matches m
    LEFT JOIN teams ht  ON m.home_team_id = ht.id
    LEFT JOIN teams awt ON m.away_team_id = awt.id
    WHERE m.stage != 'GROUP'
    ORDER BY m.match_date ASC
  `).all();

  // Organise matches by stage so the frontend can render each round separately.
  // Stages are ordered from earliest to latest for easy iteration.
  // NOTE: THIRD_PLACE is intentionally excluded from the bracket and the
  // predictions game — it isn't part of the road to the title, so including
  // it would clutter the bracket UI and the scoring rules for little value.
  // Rows with that stage are silently skipped by the bucket check below.
  const bracket = { R32: [], R16: [], QF: [], SF: [], FINAL: [] };

  for (const row of rows) {
    if (bracket[row.stage] !== undefined) {
      bracket[row.stage].push(formatMatch(row));
    }
  }

  return bracket;
}

module.exports = { getKnockoutBracket };
