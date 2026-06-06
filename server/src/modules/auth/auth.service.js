const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

const SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Creates an error with an HTTP status code attached.
// The global error handler reads err.statusCode to set the response status.
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Never send password_hash to the client — strip it here once, not at every call site.
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

// ─── Validation ───────────────────────────────────────────────────────────────

// Runs before any DB work so we fail fast on bad input.
function validateRegistration({ full_name, email, age, gender, password }) {
  if (!full_name || full_name.trim().length === 0) {
    throw createError('Full name is required.', 400);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError('A valid email address is required.', 400);
  }
  if (!age || !Number.isInteger(Number(age)) || Number(age) <= 0) {
    throw createError('Age must be a positive integer.', 400);
  }
  if (!gender || !['male', 'female'].includes(gender.toLowerCase())) {
    throw createError('Gender must be "male" or "female".', 400);
  }
  if (!password || password.length < 6 || password.length > 12) {
    throw createError('Password must be between 6 and 12 characters.', 400);
  }
}

// ─── Service Functions ────────────────────────────────────────────────────────

async function register({ full_name, email, age, gender, favorite_team, country, password }) {
  validateRegistration({ full_name, email, age, gender, password });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    throw createError('An account with this email already exists.', 409);
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const { lastInsertRowid } = db.prepare(`
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
  );

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
  // Specific messages would let attackers enumerate valid emails.
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

module.exports = { register, login, getMe };
