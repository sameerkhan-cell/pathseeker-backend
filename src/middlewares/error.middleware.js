const { env } = require("../config/env");
const { logger } = require("../utils/logger");

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  // Prisma known errors -> safe messages
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.code === "P2002") {
    status = 409;
    message = "A record with this value already exists";
  } else if (err.code === "P2025") {
    status = 404;
    message = "Record not found";
  } else if (err.code === "P1001" || err.code === "P1002") {
    status = 503;
    message = "Database unavailable";
  }

  // Never leak internals/stack in production responses
  if (status >= 500) {
    logger.error(err.stack || err.message);
    if (env.isProd) {
      message = "Internal server error";
    }
  }

  res.status(status).json({
    success: false,
    message,
    ...(env.isProd ? {} : { stack: err.stack }),
  });
}

// Async wrapper so thrown/rejected errors reach the central handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { notFoundHandler, errorHandler, asyncHandler };
