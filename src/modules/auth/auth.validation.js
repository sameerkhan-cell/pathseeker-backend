const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

const registerSchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  role: z.enum(["STUDENT", "GRADUATE", "PROFESSIONAL"], {
    errorMap: () => ({ message: "Role must be STUDENT, GRADUATE or PROFESSIONAL" }),
  }),
});

const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});

const verifyEmailSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be a 6-digit OTP"),
});

const forgotPasswordSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email(),
});

const resetPasswordSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be a 6-digit OTP"),
  newPassword: passwordSchema,
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};





