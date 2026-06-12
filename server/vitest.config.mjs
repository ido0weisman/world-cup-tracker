import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Runs before each test file — must set DB_PATH before any app module
    // (and therefore config/db.js) gets imported.
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
  },
});
