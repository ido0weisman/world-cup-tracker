const db = require('../../config/db');

// Converts flat JOIN rows into a grouped structure:
// [ { group_name: 'Group A', standings: [...] }, ... ]
function groupRows(rows) {
  const map = {};

  for (const row of rows) {
    if (!map[row.group_name]) {
      map[row.group_name] = [];
    }
    map[row.group_name].push({
      position:      row.position,
      played:        row.played,
      won:           row.won,
      drawn:         row.drawn,
      lost:          row.lost,
      goals_for:     row.goals_for,
      goals_against: row.goals_against,
      goal_diff:     row.goals_for - row.goals_against,
      points:        row.points,
      team: {
        id:         row.team_id,
        name:       row.team_name,
        short_code: row.team_code,
        flag_url:   row.team_flag,
      },
    });
  }

  return Object.entries(map).map(([group_name, standings]) => ({
    group_name,
    standings,
  }));
}

function getAllGroups() {
  const rows = db.prepare(`
    SELECT
      gs.*,
      t.name       AS team_name,
      t.short_code AS team_code,
      t.flag_url   AS team_flag
    FROM group_standings gs
    JOIN teams t ON gs.team_id = t.id
    ORDER BY gs.group_name ASC, gs.points DESC, (gs.goals_for - gs.goals_against) DESC, gs.goals_for DESC
  `).all();

  return groupRows(rows);
}

function getGroupByName(name) {
  // football-data.org stores groups as "Group A", "Group B", etc.
  // Extract just the letter so callers can use either 'A' or 'Group A'.
  const letter = name.replace(/group\s*/i, '').trim().toUpperCase();
  const groupName = `Group ${letter}`;

  const rows = db.prepare(`
    SELECT
      gs.*,
      t.name       AS team_name,
      t.short_code AS team_code,
      t.flag_url   AS team_flag
    FROM group_standings gs
    JOIN teams t ON gs.team_id = t.id
    WHERE gs.group_name = ?
    ORDER BY gs.points DESC, (gs.goals_for - gs.goals_against) DESC, gs.goals_for DESC
  `).all(groupName);

  if (rows.length === 0) {
    const err = new Error(`Group "${name}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  return groupRows(rows)[0];
}

module.exports = { getAllGroups, getGroupByName };
