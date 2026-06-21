import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import db from '../src/config/db.js';
import runMigrations from '../src/db/migrate.js';
import { upsertMatches, upsertStandings } from '../src/services/apiCache.service.js';

// Regression tests for the two root causes behind the "Atlantic Division" /
// duplicate-team bug: (1) teams keyed on the API's tla, which can drift
// across records for the same team, and (2) group_name written verbatim
// from the API with no validation. Both are covered against minimal
// fixture payloads shaped like the real football-data.org responses.

function buildMatchFixture({ id, group, homeTla, awayTla }) {
  return {
    id,
    group,
    status: 'TIMED',
    stage: 'GROUP_STAGE',
    utcDate: '2026-06-20T16:00:00Z',
    venue: null,
    area: { name: 'USA' },
    score: { winner: null, fullTime: { home: null, away: null } },
    homeTeam: { id: 9001, tla: homeTla, name: 'Curacao', crest: null },
    awayTeam: { id: 9002, tla: awayTla, name: 'Test Opponent', crest: null },
  };
}

beforeAll(() => {
  runMigrations();
});

// Each test starts from a clean slate so dedup/whitelist assertions aren't
// affected by rows left behind by a previous test in the same file.
beforeEach(() => {
  db.exec('DELETE FROM group_standings; DELETE FROM matches; DELETE FROM teams;');
});

describe('upsertMatches - team identity', () => {
  it('does not create a duplicate row when tla drifts for the same external id', () => {
    upsertMatches([buildMatchFixture({ id: 1, group: 'GROUP_E', homeTla: 'CUW', awayTla: 'OPP' })]);
    // Simulates a later 20-min sync where the API returns a different tla
    // for the same team -- this is the exact condition that used to create
    // a second "Curacao" row and pushed a group to 5 teams.
    upsertMatches([buildMatchFixture({ id: 1, group: 'GROUP_E', homeTla: 'CUR', awayTla: 'OPP' })]);

    const rows = db.prepare('SELECT * FROM teams WHERE external_id = 9001').all();
    expect(rows).toHaveLength(1);
    expect(rows[0].short_code).toBe('CUR'); // overwritten in place, not duplicated
  });
});

describe('upsertMatches - group_name whitelist', () => {
  it('keeps a valid group name as-is', () => {
    upsertMatches([buildMatchFixture({ id: 2, group: 'GROUP_E', homeTla: 'CUW', awayTla: 'OPP' })]);
    const team = db.prepare('SELECT group_name FROM teams WHERE external_id = 9001').get();
    expect(team.group_name).toBe('GROUP_E');
  });

  it('falls back to UNKNOWN for a malformed group name instead of storing it', () => {
    upsertMatches([buildMatchFixture({ id: 3, group: 'Atlantic Division', homeTla: 'CUW', awayTla: 'OPP' })]);
    const team = db.prepare('SELECT group_name FROM teams WHERE external_id = 9001').get();
    expect(team.group_name).toBe('UNKNOWN');
  });

  it('labels knockout matches (no group at all) as KNOCKOUT', () => {
    upsertMatches([buildMatchFixture({ id: 4, group: undefined, homeTla: 'CUW', awayTla: 'OPP' })]);
    const team = db.prepare('SELECT group_name FROM teams WHERE external_id = 9001').get();
    expect(team.group_name).toBe('KNOCKOUT');
  });
});

// Shared across describe blocks that need a standings table entry --
// hoisted to module scope rather than redefined per-block.
const standingsEntry = (overrides = {}) => ({
  team: { id: 9001 },
  playedGames: 1,
  won: 1,
  draw: 0,
  lost: 0,
  goalsFor: 2,
  goalsAgainst: 0,
  points: 3,
  position: 1,
  ...overrides,
});

describe('upsertStandings - group_name whitelist', () => {
  // upsertStandings only resolves teams that already exist (teams are created
  // by upsertMatches), so seed one via the matches fixture first.
  beforeEach(() => {
    upsertMatches([buildMatchFixture({ id: 5, group: 'GROUP_E', homeTla: 'CUW', awayTla: 'OPP' })]);
  });

  it('keeps a valid standings group name as-is', () => {
    upsertStandings([{ group: 'Group E', table: [standingsEntry()] }]);
    const row = db.prepare('SELECT group_name FROM group_standings WHERE team_id = (SELECT id FROM teams WHERE external_id = 9001)').get();
    expect(row.group_name).toBe('Group E');
  });

  it('falls back to UNKNOWN for a malformed standings group name', () => {
    upsertStandings([{ group: 'Atlantic Division', table: [standingsEntry()] }]);
    const row = db.prepare('SELECT group_name FROM group_standings WHERE team_id = (SELECT id FROM teams WHERE external_id = 9001)').get();
    expect(row.group_name).toBe('UNKNOWN');
  });
});

// V7 covers data that got corrupted before the whitelist existed -- the
// whitelist above only stops *new* bad writes, so this checks the migration
// itself retroactively purges rows already sitting in the DB with a
// malformed group_name (the exact shape of the live "Atlantic Division" bug).
describe('runMigrations - V7 cleanup of pre-existing invalid group_standings rows', () => {
  beforeEach(() => {
    upsertMatches([buildMatchFixture({ id: 6, group: 'GROUP_E', homeTla: 'CUW', awayTla: 'OPP' })]);
  });

  it('deletes rows with a group_name outside the canonical whitelist', () => {
    const teamId = db.prepare('SELECT id FROM teams WHERE external_id = 9001').get().id;
    // Bypasses upsertStandings to simulate a row written before the
    // whitelist existed, since upsertStandings itself would now reject this.
    db.prepare(`
      INSERT INTO group_standings (group_name, team_id, played, won, drawn, lost, goals_for, goals_against, points, position)
      VALUES ('Atlantic Division', ?, 1, 1, 0, 0, 2, 0, 3, 1)
    `).run(teamId);

    runMigrations();

    const row = db.prepare('SELECT * FROM group_standings WHERE group_name = ?').get('Atlantic Division');
    expect(row).toBeUndefined();
  });

  it('leaves rows with a valid group_name untouched', () => {
    upsertStandings([{ group: 'Group E', table: [standingsEntry()] }]);

    runMigrations();

    const row = db.prepare('SELECT group_name FROM group_standings WHERE team_id = (SELECT id FROM teams WHERE external_id = 9001)').get();
    expect(row.group_name).toBe('Group E');
  });
});
