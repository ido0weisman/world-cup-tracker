import { describe, it, expect, beforeAll } from 'vitest';
import runMigrations from '../src/db/migrate.js';
import { register, login } from '../src/modules/auth/auth.service.js';

// Integration tests against a real (throwaway) SQLite database — setup.js
// points DB_PATH at a temp file, so this exercises the actual SQL paths,
// bcrypt hashing, and JWT signing end to end.

const VALID_USER = {
  full_name: 'Test User',
  email:     'test@example.com',
  age:       25,
  gender:    'male',
  password:  'supersecret1',
};

beforeAll(() => {
  runMigrations();
});

describe('register', () => {
  it('creates a user and returns a token + sanitized user', async () => {
    const { token, user } = await register(VALID_USER);

    expect(token).toBeTypeOf('string');
    expect(user.email).toBe('test@example.com');
    // The hash must NEVER leave the service layer
    expect(user).not.toHaveProperty('password_hash');
  });

  it('rejects a duplicate email with 409', async () => {
    await expect(register(VALID_USER)).rejects.toMatchObject({ statusCode: 409 });
  });

  it.each([
    ['missing full name',  { ...VALID_USER, email: 'a@b.com', full_name: '   ' }],
    ['invalid email',      { ...VALID_USER, email: 'not-an-email' }],
    ['age out of range',   { ...VALID_USER, email: 'b@c.com', age: 999 }],
    ['invalid gender',     { ...VALID_USER, email: 'c@d.com', gender: 'other' }],
    ['password too short', { ...VALID_USER, email: 'd@e.com', password: 'short' }],
  ])('rejects %s with 400', async (_label, payload) => {
    await expect(register(payload)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('login', () => {
  it('returns a token for correct credentials', async () => {
    const { token, user } = await login({ email: VALID_USER.email, password: VALID_USER.password });
    expect(token).toBeTypeOf('string');
    expect(user).not.toHaveProperty('password_hash');
  });

  it('is case-insensitive on email', async () => {
    const { user } = await login({ email: 'TEST@EXAMPLE.COM', password: VALID_USER.password });
    expect(user.email).toBe('test@example.com');
  });

  it('rejects a wrong password with 401 and a generic message', async () => {
    await expect(login({ email: VALID_USER.email, password: 'wrongpass1' }))
      .rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password.' });
  });

  it('rejects an unknown email with the SAME message (no user enumeration)', async () => {
    await expect(login({ email: 'ghost@example.com', password: 'whatever1' }))
      .rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password.' });
  });
});
