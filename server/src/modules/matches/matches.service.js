const db = require('../../config/db');

// Reshapes a flat DB row (with prefixed columns from the JOIN) into a
// clean nested object that the frontend can consume directly.
function formatMatch(row) {
  return {
    id:          row.id,
    external_id: row.external_id,
    match_date:  row.match_date,
    stadium:     row.stadium,
    city:        row.city,
    stage:       row.stage,
    status:      row.status,
    home_score:  row.home_score,
    away_score:  row.away_score,
    home_team: {
      name:       row.home_team_name,
      short_code: row.home_team_code,
      flag_url:   row.home_team_flag,
    },
    away_team: {
      name:       row.away_team_name,
      short_code: row.away_team_code,
      flag_url:   row.away_team_flag,
    },
  };
}

// Reusable base query — both today and week endpoints select the same columns.
const MATCH_SELECT = `
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
`;

function getMatchesToday() {
  // date('now') returns today's UTC date — matches the UTC dates stored in the DB.
  const rows = db.prepare(`
    ${MATCH_SELECT}
    WHERE date(m.match_date) = date('now')
    ORDER BY m.match_date ASC
  `).all();

  return rows.map(formatMatch);
}

function getMatchesThisWeek() {
  const rows = db.prepare(`
    ${MATCH_SELECT}
    WHERE date(m.match_date) BETWEEN date('now') AND date('now', '+7 days')
    ORDER BY m.match_date ASC
  `).all();

  return rows.map(formatMatch);
}

// Returns every match in the tournament (all 104 games), oldest first —
// used by the "show all matches" view so visitors can browse the full schedule.
function getAllMatches() {
  const rows = db.prepare(`
    ${MATCH_SELECT}
    ORDER BY m.match_date ASC
  `).all();

  return rows.map(formatMatch);
}

module.exports = { getMatchesToday, getMatchesThisWeek, getAllMatches };
