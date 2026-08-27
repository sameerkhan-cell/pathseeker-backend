require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "5000", 10),
  databaseUrl: process.env.DATABASE_URL || "mysql://root:@127.0.0.1:3307/pathseeker",
  jwtSecret: process.env.JWT_SECRET || "super_secret_pathseeker_key_2026",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  otpSecretKey: process.env.OTP_SECRET_KEY || "pathseeker_otp_secret_key_2026",
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "pathseeker@localhost",
  },
  clientOrigin: process.env.CLIENT_ORIGIN || "*",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || "5", 10),
};

module.exports = { env };
