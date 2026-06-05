const jwt = require('jsonwebtoken');

// Protects any route it's applied to.
// On success: attaches the decoded token payload to req.user and calls next().
// On failure: returns 401 immediately — the route handler never runs.
function authGuard(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expect: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authGuard;
