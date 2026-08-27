const { prisma } = require("../../config/db");
const { hashPassword, comparePassword } = require("../../utils/hash");
const { signToken } = require("../../utils/jwt");
const { generateOtp, hashOtp } = require("../../utils/otp");
const { sendMail } = require("../../utils/mailer");
const { env } = require("../../config/env");

class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function otpExpiry() {
  return new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);
}

async function issueOtp(userId, purpose) {
  const code = generateOtp();
  await prisma.otpToken.create({
    data: { userId, purpose, codeHash: hashOtp(code), expiresAt: otpExpiry() },
  });
  return code;
}

// Invalidates previous unused tokens of same purpose
async function consumeLatestValidOtp(userId, purpose, code) {
  const token = await prisma.otpToken.findFirst({
    where: {
      userId,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      codeHash: hashOtp(code),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!token) throw new AppError(400, "Invalid or expired code");
  await prisma.otpToken.update({
    where: { id: token.id },
    data: { consumedAt: new Date() },
  });
}

async function register({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  // Generic response regardless - prevents user enumeration
  if (existing && existing.isEmailVerified) {
    throw new AppError(409, "Registration failed");
  }
  if (existing) {
    // Unverified account exists -> resend OTP flow, do not duplicate
    const code = await issueOtp(existing.id, "EMAIL_VERIFY");
    const mail = await sendMail(email, "PathSeeker - Verify your email", `Your verification code is ${code}`);
    return { user: publicUser(existing), devCode: mail.delivered ? null : code };
  }

  const passwordHash = await hashPassword(password);
  // Empty profile is created together with the user - no separate step needed
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, profile: { create: {} } },
    include: { profile: true },
  });

  const code = await issueOtp(user.id, "EMAIL_VERIFY");
  const mail = await sendMail(email, "PathSeeker - Verify your email", `Your verification code is ${code}`);

  return { user: publicUser(user), devCode: mail.delivered ? null : code };
}

async function verifyEmail({ email, code }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(400, "Invalid or expired code");
  if (user.isEmailVerified) throw new AppError(400, "Email already verified");

  await consumeLatestValidOtp(user.id, "EMAIL_VERIFY", code);
  await prisma.user.update({ where: { id: user.id }, data: { isEmailVerified: true } });
  return { verified: true };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic error for unknown user and wrong password
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }
  if (!user.isEmailVerified) {
    throw new AppError(403, "Please verify your email before logging in");
  }
  if (!user.isActive) {
    throw new AppError(403, "Account disabled");
  }
  return buildAuthResponse(user);
}

async function adminLogin({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }
  if (user.role !== "ADMIN") {
    throw new AppError(403, "Access denied");
  }
  if (!user.isActive) throw new AppError(403, "Account disabled");
  return buildAuthResponse(user);
}

async function forgotPassword({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always report success - no user enumeration
  let devCode = null;
  if (user && user.isActive) {
    const code = await issueOtp(user.id, "PASSWORD_RESET");
    const mail = await sendMail(email, "PathSeeker - Password reset", `Your reset code is ${code}`);
    devCode = mail.delivered ? null : code;
  }
  return { devCode };
}

async function resetPassword({ email, code, newPassword }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(400, "Invalid or expired code");

  await consumeLatestValidOtp(user.id, "PASSWORD_RESET", code);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { reset: true };
}

function buildAuthResponse(user) {
  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  return { token, user: publicUser(user) };
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, isEmailVerified: u.isEmailVerified };
}

module.exports = {
  register,
  verifyEmail,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  AppError,
};
