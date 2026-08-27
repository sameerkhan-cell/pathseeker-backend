const path = require("path");
const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { paginationMeta } = require("../../utils/pagination");
const { trackRecentlyViewed, UPLOAD_ROOT } = require("../../utils/recentlyViewed");
const fs = require("fs");

function serializeTags(r) {
  return { ...r, tags: r.tags ? JSON.parse(r.tags) : [] };
}
function tagsToDb(data) {
  const db = { ...data };
  if (data.tags !== undefined) db.tags = JSON.stringify(data.tags);
  return db;
}

// ================= Admin =================

// Multipart bodies deliver nested values as strings - normalize before use
function normalizeMultipartBody(body) {
  const b = { ...body };
  ["tags"].forEach((k) => {
    if (typeof b[k] === "string" && b[k] !== "") {
      try { b[k] = JSON.parse(b[k]); } catch { /* leave as-is */ }
    } else if (b[k] === "") {
      delete b[k];
    }
  });
  return b;
}

// POST /api/admin/resources - multipart: file + metadata fields
const createResource = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "File is required (field name 'file')" });
  }
  const resource = await prisma.resource.create({
    data: { ...tagsToDb(normalizeMultipartBody(req.body)), fileUrl: `/uploads/resources/${req.file.filename}` },
  });
  res.status(201).json({
    success: true,
    message: "Resource created",
    data: { resource: serializeTags(resource), originalName: req.file.originalname },
  });
});

const updateResource = asyncHandler(async (req, res) => {
  const existing = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, message: "Resource not found" });

  const data = tagsToDb(normalizeMultipartBody(req.body));
  // Optional replacement file upload
  let newFileUrl;
  if (req.file) {
    newFileUrl = `/uploads/resources/${req.file.filename}`;
    data.fileUrl = newFileUrl;

    const oldPath = path.join(UPLOAD_ROOT, "resources", path.basename(existing.fileUrl));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const resource = await prisma.resource.update({ where: { id: existing.id }, data });
  res.json({
    success: true,
    message: "Resource updated",
    data: { resource: serializeTags(resource), ...(newFileUrl && { fileReplaced: true }) },
  });
});

// Soft delete: hide from public listings, keep file + history intact
const deleteResource = asyncHandler(async (req, res) => {
  const existing = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, message: "Resource not found" });
  await prisma.resource.update({ where: { id: existing.id }, data: { isActive: false } });
  res.json({ success: true, message: "Resource deactivated (soft-deleted)" });
});

// ================= Public =================

const listResources = asyncHandler(async (req, res) => {
  const where = { isActive: true };
  if (req.query.type) where.type = req.query.type;
  if (req.query.audience) where.audience = { contains: req.query.audience };
  if (req.query.tag) where.tags = { contains: `"${req.query.tag}"` };
  if (req.query.search) {
    where.OR = [{ title: { contains: req.query.search } }, { description: { contains: req.query.search } }];
  }

  const [items, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.resource.count({ where }),
  ]);

  res.json({
    success: true,
    data: { items: items.map(serializeTags), pagination: paginationMeta(req.query.page, req.query.limit, total) },
  });
});

const getResourceById = asyncHandler(async (req, res) => {
  const resource = await prisma.resource.findFirst({ where: { id: req.params.id, isActive: true } });
  if (!resource) return res.status(404).json({ success: false, message: "Resource not found" });

  await trackRecentlyViewed(Number(req.user.id), "RESOURCE", { resourceId: resource.id });
  res.json({ success: true, data: { resource: serializeTags(resource) } });
});

// POST /api/resources/:id/download - atomic increment, then return the URL
const downloadResource = asyncHandler(async (req, res) => {
  const resource = await prisma.resource.findFirst({ where: { id: req.params.id, isActive: true } });
  if (!resource) return res.status(404).json({ success: false, message: "Resource not found" });

  // Atomic increment - no read-then-write race
  const updated = await prisma.resource.update({
    where: { id: resource.id },
    data: { downloadCount: { increment: 1 } },
  });

  res.json({
    success: true,
    message: "Download started",
    data: { fileUrl: updated.fileUrl, downloadCount: updated.downloadCount },
  });
});

module.exports = { createResource, updateResource, deleteResource, listResources, getResourceById, downloadResource };
