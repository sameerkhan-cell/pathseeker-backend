// Usage: router.get("/admin-only", authMiddleware, requireRole("ADMIN"), handler)
// Or multiple roles: requireRole("STUDENT", "GRADUATE", "PROFESSIONAL")

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied for your role" });
    }
    return next();
  };
}

module.exports = { requireRole };
