const { verifyToken } = require("../utils/jwt");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

function optionalAuthMiddleware(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme === "Bearer" && token) {
    try {
      const payload = verifyToken(token);
      req.user = { id: payload.sub, role: payload.role, email: payload.email };
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  return next();
}

module.exports = { authMiddleware, optionalAuthMiddleware };
