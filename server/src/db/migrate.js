const db = require('../config/db');

// Runs all CREATE TABLE IF NOT EXISTS statements inside a single transaction.
// SQLite guarantees atomicity: either all tables are created or none are.
// Safe to call on every server start — all statements are idempotent.
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

  // ── V2 additions: ALTER TABLE is not transactional in SQLite so we run
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
  // normalizing it to 'R32' (a mapping bug in apiCache.service — now fixed).
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

  console.log('[DB] Migrations complete.');
}

module.exports = runMigrations;
