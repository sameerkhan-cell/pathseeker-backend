const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const service = require("./careers.service");

// GET /api/admin/careers - includes inactive (for the admin table)
const adminListCareers = asyncHandler(async (req, res) => {
  const result = await service.listCareers(req.query, { includeInactive: true });
  res.json({ success: true, data: result });
});

// POST /api/admin/careers
const createCareer = asyncHandler(async (req, res) => {
  const career = await prisma.career.create({ data: service.toDbShape(req.body) });
  res.status(201).json({
    success: true,
    message: "Career created",
    data: { career: service.serialize(career) },
  });
});

// PUT /api/admin/careers/:id
const updateCareer = asyncHandler(async (req, res) => {
  const existing = await prisma.career.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Career not found" });
  }
  const career = await prisma.career.update({
    where: { id: existing.id },
    data: service.toDbShape(req.body),
  });
  res.json({
    success: true,
    message: "Career updated",
    data: { career: service.serialize(career) },
  });
});

// DELETE /api/admin/careers/:id - soft delete
const deleteCareer = asyncHandler(async (req, res) => {
  const existing = await prisma.career.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Career not found" });
  }
  await prisma.career.update({ where: { id: existing.id }, data: { isActive: false } });
  res.json({ success: true, message: "Career deactivated (soft-deleted)" });
});

// POST /api/admin/careers/:id/restore - bring a soft-deleted career back
const restoreCareer = asyncHandler(async (req, res) => {
  const existing = await prisma.career.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Career not found" });
  }
  await prisma.career.update({ where: { id: existing.id }, data: { isActive: true } });
  res.json({ success: true, message: "Career restored" });
});

module.exports = { adminListCareers, createCareer, updateCareer, deleteCareer, restoreCareer };
