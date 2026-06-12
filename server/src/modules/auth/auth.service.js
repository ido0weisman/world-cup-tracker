const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const createError = require('../../utils/createError');

const SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';

// Never send password_hash to the client.
function sanitizeUser(user) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// Runs before any DB work so we fail fast on bad input.
function validateRegistration({ full_name, email, age, gender, password, country, favorite_team }) {
  if (!full_name || full_name.trim().length === 0) {
    throw createError('Full name is required.', 400);
  }
  if (full_name.trim().length > 100) {
    throw createError('Full name must be 100 characters or fewer.', 400);
  }
  // RFC 5321 caps the full email address at 254 characters.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError('A valid email address is required.', 400);
  }
  if (email.length > 254) {
    throw createError('Email address must be 254 characters or fewer.', 400);
  }
  const numAge = Number(age);
  if (!age || !Number.isInteger(numAge) || numAge < 1 || numAge > 120) {
    throw createError('Age must be a whole number between 1 and 120.', 400);
  }
  if (!gender || !['male', 'female'].includes(gender.toLowerCase())) {
    throw createError('Gender must be "male" or "female".', 400);
  }
  // Max 72 chars matches bcrypt's hard byte limit — anything beyond is silently truncated,
  // so a long password and its first 72 chars would hash identically. Cap it here.
  if (!password || password.length < 8 || password.length > 72) {
    throw createError('Password must be between 8 and 72 characters.', 400);
  }
  if (country && country.length > 100) {
    throw createError('Country must be 100 characters or fewer.', 400);
  }
  if (favorite_team && favorite_team.length > 100) {
    throw createError('Favourite team must be 100 characters or fewer.', 400);
  }
}

async function register({ full_name, email, age, gender, favorite_team, country, password }) {
  validateRegistration({ full_name, email, age, gender, password, country, favorite_team });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    throw createError('An account with this email already exists.', 409);
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  let lastInsertRowid;
  try {
    ({ lastInsertRowid } = db.prepare(`
      INSERT INTO users (full_name, email, age, gender, favorite_team, country, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      full_name.trim(),
      email.toLowerCase(),
      Number(age),
      gender.toLowerCase(),
      favorite_team || null,
      country || null,
      password_hash
    ));
  } catch (err) {
    // The SELECT above is a fast path, but two concurrent registrations can both
    // pass it and then race to INSERT. The UNIQUE constraint on email is the
    // real guard — catch it here and return 409 rather than letting a raw 500 leak.
    if (err.code === 'ERR_SQLITE_ERROR' && err.message.includes('UNIQUE constraint failed')) {
      throw createError('An account with this email already exists.', 409);
    }
    throw err;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
  const token = signToken(user);

  // Return the token immediately so the client is logged in right after registering.
  return { token, user: sanitizeUser(user) };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw createError('Email and password are required.', 400);
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

  // Use a generic message for both "user not found" and "wrong password".
  // Specific messages would allow attackers to enumerate valid emails.
  if (!user) {
    throw createError('Invalid email or password.', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw createError('Invalid email or password.', 401);
  }

  const token = signToken(user);
  return { token, user: sanitizeUser(user) };
}

function getMe(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw createError('User not found.', 404);
  }
  return sanitizeUser(user);
}

// Lets a user update the two preferences that can change after signup:
// their country (used to localize match kickoff times) and favourite team.
// Both are optional/nullable — sending an empty value clears the field.
function updateMe(userId, { country, favorite_team }) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw createError('User not found.', 404);
  }

  db.prepare(`
    UPDATE users SET country = ?, favorite_team = ? WHERE id = ?
  `).run(
    country?.trim() || null,
    favorite_team?.trim() || null,
    userId
  );

  return sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId));
}

module.exports = { register, login, getMe, updateMe };
