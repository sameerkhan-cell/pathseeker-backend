const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const { authMiddleware } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./profile.controller");
const v = require("./profile.validation");

const { env } = require("../../config/env");

// On Vercel Serverless, only /tmp is writable. On local, use project uploads.
const IS_VERCEL = process.env.VERCEL === "1";
const UPLOAD_ROOT = IS_VERCEL ? "/tmp/uploads" : path.join(__dirname, "../../../uploads");
const RESUME_DIR = path.join(UPLOAD_ROOT, "resumes");

// DO NOT mkdirSync here at module load — Vercel filesystem is read-only.
// Create lazily inside multer destination callback instead.

const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx"]);
const MAX_SIZE_BYTES = env.maxFileSizeMb * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Lazy creation — only runs on actual upload request
    try {
      if (!fs.existsSync(RESUME_DIR)) fs.mkdirSync(RESUME_DIR, { recursive: true });
      cb(null, RESUME_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Never trust client filename for storage; keep only a sanitized extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `u${req.user.id}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    const err = new Error("Only PDF, DOC and DOCX files are allowed");
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

const uploader = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE_BYTES } });

// Wraps multer errors into clean 4xx responses instead of hitting the 500 handler
function multerUpload(req, res, next) {
  uploader.single("resume")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: `File exceeds the ${env.maxFileSizeMb}MB limit` });
    }
    return res.status(err.status || 400).json({ success: false, message: err.message || "Upload failed" });
  });
}

const router = express.Router();

// Every route derives identity from the JWT - no client-supplied ids anywhere
router.use(authMiddleware);

router.get("/me", controller.getMyProfile);
router.put("/me", validate(v.updateProfileSchema), controller.updateMyProfile);
router.post("/resume", authMiddleware, multerUpload, controller.uploadResume);
router.delete("/resume", controller.deleteResume);

module.exports = router;
