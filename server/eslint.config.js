const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // argsIgnorePattern: Express identifies the error handler by its 4-arg
      //   signature, so the unused `next` parameter there is required.
      // ignoreRestSiblings: allows `const { password_hash, ...safe } = user`
      //   — destructuring a key out specifically to EXCLUDE it from the rest.
      'no-unused-vars': ['error', { argsIgnorePattern: '^next$', ignoreRestSiblings: true }],
    },
  },
  {
    // Test files use ESM imports (Vitest transforms them)
    files: ['tests/**/*.js', '*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
];
