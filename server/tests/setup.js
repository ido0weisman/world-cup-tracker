import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// config/db.js opens the SQLite file at import time, so the env must be set
// BEFORE any test imports an app module. Each test worker gets its own
// throwaway database — tests never touch the real dev DB and can run in
// parallel without interfering with each other.
process.env.DB_PATH   = join(mkdtempSync(join(tmpdir(), 'wc2026-test-')), 'test.sqlite');
process.env.JWT_SECRET = 'test-only-secret';
