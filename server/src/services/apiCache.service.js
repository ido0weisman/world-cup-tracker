const axios = require('axios');
const cron = require('node-cron');
const db = require('../config/db');
const { scoreKnockoutPredictions, scoreOracleBets } = require('./scoring.service');
const { VALID_MATCH_GROUP_NAMES, VALID_STANDINGS_GROUP_NAMES } = require('../config/constants');

const API_BASE = process.env.FOOTBALL_API_BASE_URL;
const API_KEY = process.env.FOOTBALL_API_KEY;
const WC_COMPETITION_ID = 2000;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'X-Auth-Token': API_KEY },
});

// football-data.org returns some teams under their full formal names, which
// are too long for the compact group-table layout. Rather than truncate at
// render time, we shorten known long outliers right when they are cached --
// this keeps the data layer as the single source of truth and survives the
// 20-min refresh.
const TEAM_NAME_OVERRIDES = {
  'Bosnia and Herzegovina': 'Bosnia',
  'Bosnia-Herzegovina':     'Bosnia',
  'Cape Verde Islands':     'Cape Verde',
};

function shortenTeamName(name) {
  return TEAM_NAME_OVERRIDES[name] || name;
}

// football-data.org's documented `group` enum is GROUP_A..GROUP_L (matches)
// or Group A..Group L (standings) -- nothing else. Without this check, a
// malformed value in a single API response gets written straight into the
// DB and rendered as a real group (this is how "Atlantic Division" happened).
// Falling back to a sentinel instead of throwing keeps the 20-min cron
// resilient to one bad payload, while the warning makes the anomaly visible.
function assertValidGroupName(rawGroupName, validNames, context) {
  if (validNames.has(rawGroupName)) return rawGroupName;
  console.warn(`[Cache] Rejected unrecognized group name "${rawGroupName}" from ${context}; using UNKNOWN.`);
  return 'UNKNOWN';
}

async function fetchAndCacheMatches() {
  try {
    const { data } = await apiClient.get(`/competitions/${WC_COMPETITION_ID}/matches`);

    db.prepare(`
      INSERT INTO api_cache (cache_key, payload, fetched_at)
      VALUES ('matches', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(data));

    upsertMatches(data.matches);
    scoreKnockoutPredictions();
    scoreOracleBets();
    console.log(`[Cache] Matches updated at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Cache] Failed to fetch matches:', err.message);
  }
}

async function fetchAndCacheTeamSquads() {
  try {
    const { data } = await apiClient.get(`/competitions/${WC_COMPETITION_ID}/teams`);
    db.prepare(`
      INSERT INTO api_cache (cache_key, payload, fetched_at)
      VALUES ('team_squads', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(data));
    console.log('[Cache] Team squads updated');
  } catch (err) {
    console.error('[Cache] Failed to fetch team squads:', err.message);
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
  // Keyed on external_id (the API's numeric team id) rather than short_code --
  // football-data.org has been observed returning a different tla for the
  // same team across different match records (e.g. Curacao as both 'CUW'
  // and 'CUR'), which under a short_code key created a second row for a
  // team that already existed. external_id doesn't drift, so short_code is
  // now just a display column that gets overwritten on conflict like name.
  const upsertTeam = db.prepare(`
    INSERT INTO teams (name, short_code, flag_url, group_name, external_id)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(external_id) DO UPDATE SET
      name       = excluded.name,
      short_code = excluded.short_code,
      flag_url   = excluded.flag_url,
      group_name = excluded.group_name
  `);

  const upsertMatch = db.prepare(`
    INSERT INTO matches (external_id, home_team_id, away_team_id, home_score, away_score, match_date, stadium, city, stage, status, winner_team_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(external_id) DO UPDATE SET
      home_score     = excluded.home_score,
      away_score     = excluded.away_score,
      status         = excluded.status,
      home_team_id   = excluded.home_team_id,
      away_team_id   = excluded.away_team_id,
      winner_team_id = excluded.winner_team_id,
      updated_at     = CURRENT_TIMESTAMP
  `);

  const getTeamId = db.prepare(`SELECT id FROM teams WHERE external_id = ?`);

  runInTransaction(() => {
    for (const m of matches) {
      // Knockout matches carry no group at all -- only validate when the API
      // actually claims one, otherwise this would warn on every knockout match.
      const groupName = m.group ? assertValidGroupName(m.group, VALID_MATCH_GROUP_NAMES, '/matches') : 'KNOCKOUT';

      // Both id and tla are required: id is the stable identity we key on,
      // tla is still needed for the short_code display column (NOT NULL).
      if (m.homeTeam?.id && m.homeTeam?.tla) {
        upsertTeam.run(shortenTeamName(m.homeTeam.name), m.homeTeam.tla, m.homeTeam.crest || null, groupName, m.homeTeam.id);
      }
      if (m.awayTeam?.id && m.awayTeam?.tla) {
        upsertTeam.run(shortenTeamName(m.awayTeam.name), m.awayTeam.tla, m.awayTeam.crest || null, groupName, m.awayTeam.id);
      }

      const homeId = m.homeTeam?.id ? getTeamId.get(m.homeTeam.id)?.id : null;
      const awayId = m.awayTeam?.id ? getTeamId.get(m.awayTeam.id)?.id : null;

      // Determine the knockout winner from the API's score.winner field.
      // "HOME_TEAM" / "AWAY_TEAM" covers normal time, extra time, and penalties.
      let winnerId = null;
      if (m.status === 'FINISHED' && m.stage !== 'GROUP_STAGE') {
        if (m.score?.winner === 'HOME_TEAM') winnerId = homeId;
        else if (m.score?.winner === 'AWAY_TEAM') winnerId = awayId;
      }

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
        m.status,
        winnerId
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

  // Keyed on external_id, same reasoning as upsertMatches -- the standings
  // payload's team.tla isn't guaranteed to match the tla seen in /matches.
  const getTeamId = db.prepare(`SELECT id FROM teams WHERE external_id = ?`);

  runInTransaction(() => {
    for (const group of standings) {
      const groupName = assertValidGroupName(group.group, VALID_STANDINGS_GROUP_NAMES, '/standings');
      for (const entry of group.table) {
        const teamId = getTeamId.get(entry.team.id)?.id;
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

function normalizeStage(apiStage) {
  const map = {
    'GROUP_STAGE':    'GROUP',
    'LAST_32':        'R32',
    'ROUND_OF_32':    'R32',
    'LAST_16':        'R16',
    'ROUND_OF_16':    'R16',
    'QUARTER_FINALS': 'QF',
    'SEMI_FINALS':    'SF',
    'THIRD_PLACE':    'THIRD_PLACE',
    'FINAL':          'FINAL',
  };
  return map[apiStage] || apiStage;
}

async function initCacheService() {
  console.log('[Cache] Running initial data fetch...');
  await Promise.all([fetchAndCacheMatches(), fetchAndCacheStandings(), fetchAndCacheTeamSquads()]);

  cron.schedule('*/20 * * * *', async () => {
    await Promise.all([fetchAndCacheMatches(), fetchAndCacheStandings()]);
  });

  console.log('[Cache] Scheduler started. Refreshing every 20 minutes.');
}

// upsertMatches/upsertStandings are exported alongside the public
// initCacheService so tests can exercise the sync logic directly with
// fixture payloads, without making a real network call.
module.exports = { initCacheService, upsertMatches, upsertStandings };
