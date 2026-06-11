// Global error handler -- must be registered LAST in app.js (after all routes).
// Express identifies it as an error handler because it has 4 parameters (err, req, res, next).
//
// Two categories of errors flow through here:
//   1. Operational -- thrown deliberately via createError() with a statusCode.
//      Their messages are written for users, so we pass them through as-is.
//   2. Unknown -- anything without a statusCode (raw SQLite errors, TypeErrors).
//      These can contain internal details (queries, file paths, stack frames),
//      so the client only ever sees a generic message; the details go to the log.
function errorHandler(err, req, res, next) {
  const isOperational = Boolean(err.statusCode);
  const statusCode = isOperational ? err.statusCode : 500;

  // Log in every environment -- production most of all (`fly logs` reads stdout).
  // Operational errors are expected (bad input, locked bets), so a one-liner is
  // enough; unknown errors get the full stack for debugging.
  if (isOperational) {
    console.warn(`[WARN] ${req.method} ${req.path} -> ${statusCode} ${err.message}`);
  } else {
    console.error(`[ERROR] ${req.method} ${req.path} ->`, err);
  }

  res.status(statusCode).json({
    error: isOperational ? err.message : 'Internal Server Error',
  });
}

module.exports = errorHandler;
