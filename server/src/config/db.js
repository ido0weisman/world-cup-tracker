// node:sqlite is built into Node.js 22+ — no npm install needed, no native compilation.
// DatabaseSync gives us the same synchronous, low-ceremony API as better-sqlite3.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.env.DB_PATH || './src/db/database.sqlite');

// Ensure the directory exists before SQLite tries to create the file
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

// WAL mode gives better read/write concurrency than the default rollback journal.
// foreign_keys = ON enforces referential integrity at the DB level.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

module.exports = db;
