const fs = require("fs");
const path = require("path");
const { asyncHandler } = require("../../middlewares/error.middleware");
const service = require("./profile.service");

// GET /api/profile/me
const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await service.getOrCreateProfile(Number(req.user.id));
  res.json({ success: true, data: { profile } });
});

// PUT /api/profile/me
const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await service.updateProfile(Number(req.user.id), req.body);
  console.log(`[profile] user ${req.user.id} updated fields: ${Object.keys(req.body).join(", ")}`);
  res.json({ success: true, message: "Profile updated", data: { profile } });
});

// POST /api/profile/resume (multer middleware runs first)
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded (field name must be 'resume')" });
  }
  const fileUrl = `/uploads/resumes/${req.file.filename}`;
  await service.setResumeUrl(Number(req.user.id), fileUrl);
  res.status(201).json({
    success: true,
    message: "Resume uploaded",
    data: { resumeUrl: fileUrl, originalName: req.file.originalname, size: req.file.size },
  });
});

// DELETE /api/profile/resume - removes the actual file from storage + clears DB field
const deleteResume = asyncHandler(async (req, res) => {
  const profile = await service.getRawProfile(Number(req.user.id));

  if (profile?.resumeUrl) {
    // basename() prevents path traversal via a tampered resumeUrl value
    const filePath = path.join(__dirname, "../../../uploads", "resumes", path.basename(profile.resumeUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await service.setResumeUrl(Number(req.user.id), null);
  res.json({ success: true, message: "Resume deleted" });
});

module.exports = { getMyProfile, updateMyProfile, uploadResume, deleteResume };
