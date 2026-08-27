const { app } = require("./app");
const { env } = require("./config/env");
const { logger } = require("./utils/logger");
const { prisma } = require("./config/db");

// ─── Fail-fast DB connectivity check ───────────────────────────────────────
// Probe the database BEFORE accepting HTTP traffic. If Prisma cannot connect
// (e.g. MySQL service not running, wrong port) we log a clear error and exit
// immediately, instead of silently starting and letting every request timeout.
async function startServer() {
  try {
    await prisma.$queryRaw`SELECT 1+1 AS probe`;
    logger.info("✅ Database connection verified (127.0.0.1:3307)");
  } catch (err) {
    logger.error(
      `❌ Cannot reach database — server will NOT start.\n` +
      `   DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^@]+@/, ":***@")}\n` +
      `   Error: ${err.message}\n\n` +
      `   Fix: ensure MySQL/MariaDB is running on port 3307, then restart the server.`
    );
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info(`PathSeeker backend listening on http://localhost:${env.port}`);
  });

  process.on("unhandledRejection", (err) => {
    logger.error(`Unhandled rejection: ${err.stack || err.message}`);
    server.close(() => process.exit(1));
  });

  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught exception: ${err.stack || err.message}`);
    process.exit(1);
  });
}

startServer();
