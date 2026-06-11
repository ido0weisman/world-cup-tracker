/**
 * Seed script -- inserts 10 fictive Israeli users + random group-stage predictions.
 *
 * Run locally:  cd server && node seed-fake-users.js
 * Run on Fly:   fly ssh console  ->  cd /app && node seed-fake-users.js
 *
 * Safe to re-run: uses ON CONFLICT(email) DO NOTHING for users and
 * ON CONFLICT(user_id, group_name) DO NOTHING for predictions.
 */

require('dotenv').config();               // picks up .env when run locally
const bcrypt = require('bcrypt');
const db     = require('./src/config/db');

// ── Fake user data ────────────────────────────────────────────────────────────
const FAKE_PASSWORD = 'FakeUser2026!';   // all seeds share one easy password

const FAKE_USERS = [
  { full_name: 'Yoav Cohen',      email: 'yoav.cohen@example.com',     age: 28, gender: 'male', country: 'Israel', favorite_team: 'Brazil' },
  { full_name: 'Roee Mizrahi',    email: 'roee.mizrahi@example.com',   age: 31, gender: 'male', country: 'Israel', favorite_team: 'France' },
  { full_name: 'Amit Ben-David',  email: 'amit.bendavid@example.com',  age: 35, gender: 'male', country: 'Israel', favorite_team: 'Argentina' },
  { full_name: 'Eyal Goldberg',   email: 'eyal.goldberg@example.com',  age: 29, gender: 'male', country: 'Israel', favorite_team: 'Spain' },
  { full_name: 'Itai Shapiro',    email: 'itai.shapiro@example.com',   age: 27, gender: 'male', country: 'Israel', favorite_team: 'Germany' },
  { full_name: 'Natan Peretz',    email: 'natan.peretz@example.com',   age: 22, gender: 'male', country: 'Israel', favorite_team: 'England' },
  { full_name: 'Uri Katz',        email: 'uri.katz@example.com',       age: 33, gender: 'male', country: 'Israel', favorite_team: 'Netherlands' },
  { full_name: 'Guy Levi',        email: 'guy.levi@example.com',       age: 26, gender: 'male', country: 'Israel', favorite_team: 'Portugal' },
  { full_name: 'Ron Friedman',    email: 'ron.friedman@example.com',   age: 21, gender: 'male', country: 'Israel', favorite_team: 'Morocco' },
  { full_name: 'Tal Shapira',     email: 'tal.shapira@example.com',    age: 30, gender: 'male', country: 'Israel', favorite_team: 'USA' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Seeded pseudo-random shuffle so results are reproducible but look varied
function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(FAKE_PASSWORD, saltRounds);

  // Read all group-stage teams from the live DB, keyed by group
  const teamRows = db.prepare(`
    SELECT t.id, t.name, t.short_code, gs.group_name
    FROM   group_standings gs
    JOIN   teams t ON gs.team_id = t.id
    ORDER  BY gs.group_name, gs.position
  `).all();

  const groups = {};
  for (const row of teamRows) {
    if (!groups[row.group_name]) groups[row.group_name] = [];
    groups[row.group_name].push({ id: row.id, name: row.name });
  }

  const groupNames = Object.keys(groups).sort();
  console.log(`Found ${groupNames.length} groups with ${teamRows.length} total teams.`);
  if (groupNames.length === 0) {
    console.error('No group standings data yet -- run the server first to populate the DB, then re-run this script.');
    process.exit(1);
  }

  const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, age, gender, password_hash, country, favorite_team)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO NOTHING
  `);

  const insertPrediction = db.prepare(`
    INSERT INTO predictions_group (user_id, group_name, team1_id, team2_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, group_name) DO NOTHING
  `);

  let usersCreated = 0;
  let predsCreated = 0;

  for (let i = 0; i < FAKE_USERS.length; i++) {
    const u = FAKE_USERS[i];
    const { lastInsertRowid, changes } = insertUser.run(
      u.full_name, u.email, u.age, u.gender, passwordHash, u.country, u.favorite_team
    );

    if (changes === 0) {
      console.log(`  ${u.full_name}: already exists, skipping predictions.`);
      continue;
    }

    const userId = lastInsertRowid;
    usersCreated++;

    // For each group, pick 2 teams at random (seeded per user+group for reproducibility)
    for (const groupName of groupNames) {
      const teams = groups[groupName];
      if (teams.length < 2) continue;

      const seed = i * 1000 + groupName.charCodeAt(groupName.length - 1);
      const [t1, t2] = shuffle(teams, seed);

      insertPrediction.run(userId, groupName, t1.id, t2.id);
      predsCreated++;
    }

    console.log(`  ${u.full_name}: inserted with ${groupNames.length} group predictions.`);
  }

  console.log(`\nDone. Users created: ${usersCreated}, predictions inserted: ${predsCreated}.`);
  console.log(`Shared password for all fake users: "${FAKE_PASSWORD}"`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
