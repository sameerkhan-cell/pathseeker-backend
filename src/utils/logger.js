/* eslint-disable no-console */
const levels = { debug: 10, info: 20, warn: 30, error: 40 };

function log(level, msg, meta) {
  const ts = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  const line = `[${ts}] ${level.toUpperCase()}: ${msg}${suffix}`;
  if (level === "error") console.error(line);
  else console.log(line);
}

const logger = {
  debug: (msg, meta) => {
    const min = levels[process.env.LOG_LEVEL] ?? levels.debug;
    if (levels.debug >= min) log("debug", msg, meta);
  },
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
};

module.exports = { logger };
