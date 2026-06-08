const authService = require('./auth.service');

// Controllers are intentionally thin — they only handle HTTP concerns.
// All business logic lives in auth.service.js.
// Errors are forwarded to the global error handler via next(err).

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function getMe(req, res, next) {
  try {
    // req.user is attached by the authGuard middleware after verifying the JWT
    const user = authService.getMe(req.user.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

function updateMe(req, res, next) {
  try {
    const user = authService.updateMe(req.user.userId, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe, updateMe };
