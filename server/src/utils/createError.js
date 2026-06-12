// Creates an Error carrying an HTTP status code — the contract between
// business logic and the global error handler. Any error with a statusCode
// is treated as "operational": its message is safe to show the client.
// Errors WITHOUT a statusCode are treated as unexpected and masked as a
// generic 500, so never attach one to an error you don't control.
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = createError;
