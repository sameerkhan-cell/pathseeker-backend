const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const { env } = require("../config/env");

// On Vercel Serverless, only /tmp is writable. On local, use the project uploads folder.
const IS_VERCEL = process.env.VERCEL === "1";
const UPLOAD_ROOT = IS_VERCEL
  ? "/tmp/uploads"
  : path.join(__dirname, "../../uploads");

/**
 * Shared uploader factory (Phase 4 pattern).
 * - randomized filenames (client filename never trusted)
 * - extension allowlist
 * - size cap from env.maxFileSizeMb
 * - lazy directory creation (only on actual upload, not at module load time)
 */
function makeUploader({ subdir, allowExts }) {
  const dir = path.join(UPLOAD_ROOT, subdir);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      // Create dir lazily — safe on Vercel /tmp and local
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `u${req.user?.id ?? "anon"}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  });

  const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowExts.includes(ext)) {
      const err = new Error(`Only ${allowExts.join(", ")} files are allowed`);
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  };

  const limits = { fileSize: env.maxFileSizeMb * 1024 * 1024 };
  const raw = multer({ storage, fileFilter, limits });

  // Wraps multer errors into clean 4xx responses
  return (req, res, next) => {
    raw.single("file")(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: `File exceeds the ${env.maxFileSizeMb}MB limit` });
      }
      return res.status(err.status || 400).json({ success: false, message: err.message || "Upload failed" });
    });
  };
}

module.exports = { makeUploader, UPLOAD_ROOT };
