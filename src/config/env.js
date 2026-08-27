require("dotenv").config();

const required = (key, fallback) => {
  const val = process.env[key] ?? fallback;
  if (val === undefined || val === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "5000", 10),
  databaseUrl: required("DATABASE_URL"),
  // No hardcoded fallbacks - missing secrets must fail startup loudly
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  otpSecretKey: required("OTP_SECRET_KEY"),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "pathseeker@localhost",
  },
  clientOrigin: process.env.NODE_ENV === "production"
    ? required("CLIENT_ORIGIN")
    : process.env.CLIENT_ORIGIN || "http://localhost:5173",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || "5", 10),
};

module.exports = { env };
