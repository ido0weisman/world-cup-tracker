// Quick read-only database inspector.
// Run from the `server` folder with:   node check-db.js
//
// Prints table names, row counts for the main tables, and the current
// user list (without password hashes). Doesn't change anything in the DB.

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.resolve(process.env.DB_PATH || './src/db/database.sqlite');
console.log('Opening:', dbPath, '\n');

const db = new DatabaseSync(dbPath, { readOnly: true });

console.log('— Tables —');
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all();
console.log(tables.map(t => t.name).join(', '), '\n');

console.log('— Row counts —');
for (const { name } of tables) {
  const { c } = db.prepare(`SELECT COUNT(*) c FROM "${name}"`).get();
  console.log(`  ${name.padEnd(24)} ${c}`);
}

console.log('\n— Users (no password hashes shown) —');
const users = db.prepare('SELECT id, full_name, email, country, favorite_team, created_at FROM users ORDER BY id').all();
if (users.length === 0) {
  console.log('  (no users)');
} else {
  for (const u of users) {
    console.log(`  #${u.id}  ${u.full_name}  <${u.email}>  country=${u.country ?? '—'}  team=${u.favorite_team ?? '—'}  joined=${u.created_at}`);
  }
}

db.close();
