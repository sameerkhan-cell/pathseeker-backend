const authService = require("./auth.service");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { prisma } = require("../../config/db");
const { env } = require("../../config/env");

const devOtp = (res, code) => {
  if (env.isProd || code === null) return {};
  return { devCode: code };
};

const register = asyncHandler(async (req, res) => {
  const { user, devCode } = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: "Registration successful. Please verify your email with the OTP sent.",
    data: { user },
    ...devOtp(res, devCode),
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body);
  res.json({ success: true, message: "Email verified successfully" });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.json({ success: true, message: "Login successful", data });
});

const adminLogin = asyncHandler(async (req, res) => {
  const data = await authService.adminLogin(req.body);
  res.json({ success: true, message: "Admin login successful", data });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { devCode } = await authService.forgotPassword(req.body);
  res.json({
    success: true,
    message: "If that email exists, a reset code has been sent",
    ...devOtp(res, devCode),
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.json({ success: true, message: "Password reset successful" });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.user.id) },
    select: { id: true, name: true, email: true, role: true, isEmailVerified: true },
  });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.json({ success: true, data: { user } });
});

module.exports = { register, verifyEmail, login, adminLogin, forgotPassword, resetPassword, me };
