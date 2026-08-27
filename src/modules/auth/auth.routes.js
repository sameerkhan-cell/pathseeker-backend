const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("./auth.controller");
const { validate } = require("../../middlewares/validate.middleware");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const v = require("./auth.validation");

// Brute-force protection on all auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

const router = express.Router();

router.post("/register", authLimiter, validate(v.registerSchema), controller.register);
router.post("/verify-email", authLimiter, validate(v.verifyEmailSchema), controller.verifyEmail);
router.post("/login", authLimiter, validate(v.loginSchema), controller.login);
router.post("/admin/login", authLimiter, validate(v.loginSchema), controller.adminLogin);
router.post("/forgot-password", authLimiter, validate(v.forgotPasswordSchema), controller.forgotPassword);
router.post("/reset-password", authLimiter, validate(v.resetPasswordSchema), controller.resetPassword);
router.get("/me", authMiddleware, controller.me);

module.exports = router;
