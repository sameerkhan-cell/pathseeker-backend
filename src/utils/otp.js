const crypto = require("crypto");
const { env } = require("../config/env");

// 6-digit numeric OTP
function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

// Hash with pepper before storing - raw OTP never hits the DB
function hashOtp(code) {
  return crypto.createHash("sha256").update(`${code}:${env.otpSecretKey}`).digest("hex");
}

module.exports = { generateOtp, hashOtp };
