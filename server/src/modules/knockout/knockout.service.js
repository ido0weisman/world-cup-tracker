const db = require('../../config/db');

function formatMatch(row) {
  return {
    id:         row.id,
    match_date: row.match_date,
    stadium:    row.stadium,
    city:       row.city,
    stage:      row.stage,
    status:     row.status,
    home_score: row.home_score,
    away_score: row.away_score,
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
  const bracket = { R32: [], R16: [], QF: [], SF: [], FINAL: [] };

  for (const row of rows) {
    if (bracket[row.stage] !== undefined) {
      bracket[row.stage].push(formatMatch(row));
    }
  }

  return bracket;
}

module.exports = { getKnockoutBracket };
