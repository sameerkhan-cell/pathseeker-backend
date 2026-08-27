const nodemailer = require("nodemailer");
const { env } = require("../config/env");
const { logger } = require("./logger");

let transporter = null;

if (env.smtp.host) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

/**
 * Sends an email. If SMTP is not configured (dev), logs the content and
 * returns { delivered: false } so callers can surface the OTP in dev mode.
 */
async function sendMail(to, subject, text) {
  if (!transporter) {
    logger.warn(`[DEV MAIL] to=${to} subject="${subject}" body=${text}`);
    return { delivered: false };
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, text });
  return { delivered: true };
}

module.exports = { sendMail };
