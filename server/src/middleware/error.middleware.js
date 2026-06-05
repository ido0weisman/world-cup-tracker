// Global error handler — must be registered LAST in app.js (after all routes).
// Express identifies it as an error handler because it has 4 parameters (err, req, res, next).
// Any route can trigger it by calling next(error) or throwing inside an async wrapper.
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Only log the full stack in development to keep production logs clean.
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.path} →`, err);
  }

  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
