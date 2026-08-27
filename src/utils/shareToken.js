const crypto = require("crypto");
const { env } = require("../config/env");

// Opaque share token: "<userId>.<hmac(userId, secret)>" - verifiable without a
// DB lookup, not guessable without the secret. Simplest "share" per spec.
function makeShareToken(userId) {
  const sig = crypto.createHmac("sha256", env.otpSecretKey).update(`bookmark-share:${userId}`).digest("hex").slice(0, 24);
  return `${userId}.${sig}`;
}

function verifyShareToken(token) {
  if (!/^\d+\.[a-f0-9]{24}$/.test(token)) return null;
  const [userIdStr, sig] = token.split(".");
  const userId = Number(userIdStr);
  const expected = crypto.createHmac("sha256", env.otpSecretKey).update(`bookmark-share:${userId}`).digest("hex").slice(0, 24);
  return sig === expected ? userId : null;
}

module.exports = { makeShareToken, verifyShareToken };
