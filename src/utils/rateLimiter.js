const rateLimit = require("express-rate-limit");

// General write-endpoint protection: generous enough for normal use,
// tight enough to stop spam/scraping. Auth routes keep their own strict limit.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please slow down" },
});

module.exports = { writeLimiter };
