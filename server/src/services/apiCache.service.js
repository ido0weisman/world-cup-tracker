const axios = require('axios');
const cron = require('node-cron');
const db = require('../config/db');

const API_BASE = process.env.FOOTBALL_API_BASE_URL;
const API_KEY = process.env.FOOTBALL_API_KEY;
// World Cup 2026 competition ID on football-data.org (2000 = FIFA World Cup)
const WC_COMPETITION_ID = 2000;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'X-Auth-Token': API_KEY },
});

// ─── Core fetch & upsert logic ────────────────────────────────────────────────

async function fetchAndCacheMatches() {
  try {
    const { data } = await apiClient.get(`/competitions/${WC_COMPETITION_ID}/matches`);

    // Persist raw payload so the data survives a server restart
    db.prepare(`
      INSERT INTO api_cache (cache_key, payload, fetched_at)
      VALUES ('matches', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(data));

    upsertMatches(data.matches);
    console.log(`[Cache] Matches updated at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Cache] Failed to fetch matches:', err.message);
  }
}

async function fetchAndCacheStandings() {
  try {
    const { data } = await apiClient.get(`/competitions/${WC_COMPETITION_ID}/standings`);

    db.prepare(`
      INSERT INTO api_cache (cache_key, payload, fetched_at)
      VALUES ('standings', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(data));

    upsertStandings(data.standings);
    console.log(`[Cache] Standings updated at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Cache] Failed to fetch standings:', err.message);
  }
}

// ─── Upsert helpers ───────────────────────────────────────────────────────────

// node:sqlite has no built-in .transaction() helper, so we wrap batches
// in explicit BEGIN/COMMIT blocks for atomicity and performance.
function runInTransaction(fn) {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function upsertMatches(matches) {
  const upsertTeam = db.prepare(`
    INSERT INTO teams (name, short_code, flag_url, group_name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(short_code) DO UPDATE SET
      name       = excluded.name,
      flag_url   = excluded.flag_url,
      group_name = excluded.group_name
  `);

  const upsertMatch = db.prepare(`
    INSERT INTO matches (external_id, home_team_id, away_team_id, home_score, away_score, match_date, stadium, city, stage, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(external_id) DO UPDATE SET
      home_score   = excluded.home_score,
      away_score   = excluded.away_score,
      status       = excluded.status,
      home_team_id = excluded.home_team_id,
      away_team_id = excluded.away_team_id,
      updated_at   = CURRENT_TIMESTAMP
  `);

  const getTeamId = db.prepare(`SELECT id FROM teams WHERE short_code = ?`);

  runInTransaction(() => {
    for (const m of matches) {
      if (m.homeTeam?.tla) {
        upsertTeam.run(m.homeTeam.name, m.homeTeam.tla, m.homeTeam.crest || null, m.group || 'KNOCKOUT');
      }
      if (m.awayTeam?.tla) {
        upsertTeam.run(m.awayTeam.name, m.awayTeam.tla, m.awayTeam.crest || null, m.group || 'KNOCKOUT');
      }

      const homeId = m.homeTeam?.tla ? getTeamId.get(m.homeTeam.tla)?.id : null;
      const awayId = m.awayTeam?.tla ? getTeamId.get(m.awayTeam.tla)?.id : null;

      upsertMatch.run(
        String(m.id),
        homeId,
        awayId,
        m.score?.fullTime?.home ?? null,
        m.score?.fullTime?.away ?? null,
        m.utcDate,
        m.venue || null,
        m.area?.name || null,
        normalizeStage(m.stage),
        m.status
      );
    }
  });
}

function upsertStandings(standings) {
  const upsert = db.prepare(`
    INSERT INTO group_standings (group_name, team_id, played, won, drawn, lost, goals_for, goals_against, points, position, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(group_name, team_id) DO UPDATE SET
      played        = excluded.played,
      won           = excluded.won,
      drawn         = excluded.drawn,
      lost          = excluded.lost,
      goals_for     = excluded.goals_for,
      goals_against = excluded.goals_against,
      points        = excluded.points,
      position      = excluded.position,
      updated_at    = CURRENT_TIMESTAMP
  `);

  const getTeamId = db.prepare(`SELECT id FROM teams WHERE short_code = ?`);

  runInTransaction(() => {
    for (const group of standings) {
      const groupName = group.group;
      for (const entry of group.table) {
        const teamId = getTeamId.get(entry.team.tla)?.id;
        if (!teamId) continue;
        upsert.run(
          groupName,
          teamId,
          entry.playedGames,
          entry.won,
          entry.draw,
          entry.lost,
          entry.goalsFor,
          entry.goalsAgainst,
          entry.points,
          entry.position
        );
      }
    }
  });
}

// ─── Stage normalizer ─────────────────────────────────────────────────────────

function normalizeStage(apiStage) {
  const map = {
    'GROUP_STAGE':    'GROUP',
    'ROUND_OF_32':    'R32',
    'LAST_16':        'R16',
    'QUARTER_FINALS': 'QF',
    'SEMI_FINALS':    'SF',
    'FINAL':          'FINAL',
  };
  return map[apiStage] || apiStage;
}

// ─── Startup + scheduler ──────────────────────────────────────────────────────

async function initCacheService() {
  console.log('[Cache] Running initial data fetch...');
  await Promise.all([fetchAndCacheMatches(), fetchAndCacheStandings()]);

  // Refresh every 20 minutes regardless of how many users are active
  cron.schedule('*/20 * * * *', async () => {
    await Promise.all([fetchAndCacheMatches(), fetchAndCacheStandings()]);
  });

  console.log('[Cache] Scheduler started. Refreshing every 20 minutes.');
}

module.exports = { initCacheService };
