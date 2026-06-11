const db = require('../config/db');

// Runs all CREATE TABLE IF NOT EXISTS statements inside a single transaction.
// SQLite guarantees atomicity: either all tables are created or none are.
// Safe to call on every server start -- all statements are idempotent.
function runMigrations() {
  db.exec(`
    BEGIN;

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER  PRIMARY KEY AUTOINCREMENT,
      full_name     TEXT     NOT NULL,
      email         TEXT     NOT NULL UNIQUE,
      age           INTEGER  NOT NULL,
      gender        TEXT     NOT NULL,
      password_hash TEXT     NOT NULL,
      favorite_team TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
      id         INTEGER  PRIMARY KEY AUTOINCREMENT,
      name       TEXT     NOT NULL,
      short_code TEXT     NOT NULL UNIQUE,
      flag_url   TEXT,
      group_name TEXT     NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id           INTEGER  PRIMARY KEY AUTOINCREMENT,
      external_id  TEXT     NOT NULL UNIQUE,
      home_team_id INTEGER  REFERENCES teams(id),
      away_team_id INTEGER  REFERENCES teams(id),
      home_score   INTEGER,
      away_score   INTEGER,
      match_date   DATETIME NOT NULL,
      stadium      TEXT,
      city         TEXT,
      stage        TEXT     NOT NULL,
      status       TEXT     NOT NULL DEFAULT 'SCHEDULED',
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_standings (
      id            INTEGER  PRIMARY KEY AUTOINCREMENT,
      group_name    TEXT     NOT NULL,
      team_id       INTEGER  NOT NULL REFERENCES teams(id),
      played        INTEGER  DEFAULT 0,
      won           INTEGER  DEFAULT 0,
      drawn         INTEGER  DEFAULT 0,
      lost          INTEGER  DEFAULT 0,
      goals_for     INTEGER  DEFAULT 0,
      goals_against INTEGER  DEFAULT 0,
      points        INTEGER  DEFAULT 0,
      position      INTEGER,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_name, team_id)
    );

    CREATE TABLE IF NOT EXISTS api_cache (
      id         INTEGER  PRIMARY KEY AUTOINCREMENT,
      cache_key  TEXT     NOT NULL UNIQUE,
      payload    TEXT     NOT NULL,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS predictions_group (
      id           INTEGER  PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER  NOT NULL REFERENCES users(id),
      group_name   TEXT     NOT NULL,
      team1_id     INTEGER  NOT NULL REFERENCES teams(id),
      team2_id     INTEGER  NOT NULL REFERENCES teams(id),
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, group_name)
    );

    CREATE TABLE IF NOT EXISTS predictions_knockout (
      id                  INTEGER  PRIMARY KEY AUTOINCREMENT,
      user_id             INTEGER  NOT NULL REFERENCES users(id),
      match_id            INTEGER  NOT NULL REFERENCES matches(id),
      predicted_winner_id INTEGER  NOT NULL REFERENCES teams(id),
      is_correct          INTEGER,
      submitted_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS predictions_top_scorer (
      id           INTEGER  PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER  NOT NULL REFERENCES users(id) UNIQUE,
      team_id      INTEGER  NOT NULL REFERENCES teams(id),
      player_name  TEXT     NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    COMMIT;
  `);

  // V2 additions: ALTER TABLE is not transactional in SQLite so we run
  // these separately, guarded by a PRAGMA column check to stay idempotent.
  const matchCols = db.prepare('PRAGMA table_info(matches)').all().map(c => c.name);
  if (!matchCols.includes('winner_team_id')) {
    db.exec('ALTER TABLE matches ADD COLUMN winner_team_id INTEGER REFERENCES teams(id)');
  }

  const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!userCols.includes('country')) {
    db.exec('ALTER TABLE users ADD COLUMN country TEXT');
  }

  // V3 fix: earlier runs stored the raw API stage code 'LAST_32' instead of
  // normalizing it to 'R32' (a mapping bug in apiCache.service -- now fixed).
  // Normalize any rows written before the fix so the bracket displays correctly.
  db.exec(`UPDATE matches SET stage = 'R32' WHERE stage = 'LAST_32'`);

  // Stores open-ended tournament outcomes (e.g. actual top scorer).
  // Using a key-value structure keeps it flexible for future result types.
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_results (
      result_key   TEXT NOT NULL UNIQUE,
      result_value TEXT NOT NULL,
      set_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // V4 additions: match_odds + Oracle Duel tables.
  // Each table is created with IF NOT EXISTS so this is safe to run repeatedly.
  db.exec(`
    -- Optional bookmaker odds per match -- populated by The Odds API integration.
    -- The algorithm Oracle uses these when available; falls back gracefully if absent.
    CREATE TABLE IF NOT EXISTS match_odds (
      match_id    INTEGER  PRIMARY KEY REFERENCES matches(id),
      home_prob   REAL     NOT NULL,
      away_prob   REAL     NOT NULL,
      fetched_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Stores the user's current Oracle card choices (3 cards = 1 profile).
    -- INSERT OR REPLACE means rebuilding overwrites the previous setup cleanly.
    CREATE TABLE IF NOT EXISTS oracle_profiles (
      user_id       INTEGER  PRIMARY KEY REFERENCES users(id),
      strength_card TEXT     NOT NULL,
      market_card   TEXT     NOT NULL,
      upset_card    TEXT     NOT NULL,
      oracle_name   TEXT     NOT NULL,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Stores both Oracle predictions per match, fetched once daily.
    -- algorithm_* is computed by our own service; ai_* comes from Groq.
    -- ai columns are nullable -- if Groq is unavailable that day, the page
    -- still works using only the algorithm prediction.
    CREATE TABLE IF NOT EXISTS oracle_predictions (
      match_id             INTEGER  PRIMARY KEY REFERENCES matches(id),
      algorithm_home_prob  REAL     NOT NULL,
      algorithm_away_prob  REAL     NOT NULL,
      ai_home_prob         REAL,
      ai_away_prob         REAL,
      fetched_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Stores each user's Oracle bet with a snapshot of the Oracle probabilities
    -- at the time of betting -- so changing your Oracle later doesn't affect
    -- how past bets were scored.
    CREATE TABLE IF NOT EXISTS oracle_bets (
      id                   INTEGER  PRIMARY KEY AUTOINCREMENT,
      user_id              INTEGER  NOT NULL REFERENCES users(id),
      match_id             INTEGER  NOT NULL REFERENCES matches(id),
      picked_winner_id     INTEGER  NOT NULL REFERENCES teams(id),
      sided_with           TEXT     NOT NULL CHECK(sided_with IN ('with_ai','against_ai','no_ai')),
      algorithm_home_prob  REAL     NOT NULL,
      algorithm_away_prob  REAL     NOT NULL,
      ai_home_prob         REAL,
      ai_away_prob         REAL,
      is_correct           INTEGER,
      points_awarded       INTEGER  DEFAULT 0,
      submitted_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, match_id)
    );
  `);

  // V5 fix: oracle_bets CHECK constraint rebuild.
  // The table was originally created with CHECK(sided_with IN ('algorithm','ai',
  // 'both','neither')), but the app writes 'with_ai' / 'against_ai' / 'no_ai' --
  // so every insert violated the constraint. SQLite cannot ALTER a CHECK
  // constraint, so the standard fix is a table rebuild: create the corrected
  // table, copy the rows across, drop the old table, rename. We detect the
  // stale schema by inspecting sqlite_master, which makes this idempotent.
  const oracleBetsSchema = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'oracle_bets'"
  ).get();

  if (oracleBetsSchema?.sql.includes("'neither'")) {
    // SQLite's documented table-rebuild procedure requires foreign_keys OFF
    // for the duration -- and the pragma is a no-op inside a transaction,
    // so it must be toggled outside the BEGIN/COMMIT block.
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(`
      BEGIN;

      CREATE TABLE oracle_bets_v5 (
        id                   INTEGER  PRIMARY KEY AUTOINCREMENT,
        user_id              INTEGER  NOT NULL REFERENCES users(id),
        match_id             INTEGER  NOT NULL REFERENCES matches(id),
        picked_winner_id     INTEGER  NOT NULL REFERENCES teams(id),
        sided_with           TEXT     NOT NULL CHECK(sided_with IN ('with_ai','against_ai','no_ai')),
        algorithm_home_prob  REAL     NOT NULL,
        algorithm_away_prob  REAL     NOT NULL,
        ai_home_prob         REAL,
        ai_away_prob         REAL,
        is_correct           INTEGER,
        points_awarded       INTEGER  DEFAULT 0,
        submitted_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, match_id)
      );

      -- Translate any rows written under the old value set to the new
      -- AI-relative semantics: siding with the AI ('ai', 'both') maps to
      -- 'with_ai'; everything else means the user went against it.
      INSERT INTO oracle_bets_v5
        (id, user_id, match_id, picked_winner_id, sided_with,
         algorithm_home_prob, algorithm_away_prob, ai_home_prob, ai_away_prob,
         is_correct, points_awarded, submitted_at)
      SELECT
        id, user_id, match_id, picked_winner_id,
        CASE
          WHEN sided_with IN ('with_ai', 'against_ai', 'no_ai') THEN sided_with
          WHEN sided_with IN ('ai', 'both')                     THEN 'with_ai'
          ELSE 'against_ai'
        END,
        algorithm_home_prob, algorithm_away_prob, ai_home_prob, ai_away_prob,
        is_correct, points_awarded, submitted_at
      FROM oracle_bets;

      DROP TABLE oracle_bets;
      ALTER TABLE oracle_bets_v5 RENAME TO oracle_bets;

      COMMIT;
    `);
    db.exec('PRAGMA foreign_keys = ON');
    console.log('[DB] V5: rebuilt oracle_bets with corrected sided_with constraint.');
  }

  console.log('[DB] Migrations complete.');
}

module.exports = runMigrations;
