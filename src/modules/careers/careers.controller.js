const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { paginationMeta } = require("../../utils/pagination");
const service = require("./careers.service");

// ---------- Public (any logged-in user) ----------

// NOTE: Public (no-auth) trending endpoint — controller only, route wired separately
const getTrendingCareers = asyncHandler(async (_req, res) => {
  const careers = await service.getTrendingCareers();
  res.json({ success: true, data: { careers } });
});

const listCareers = asyncHandler(async (req, res) => {
  const result = await service.listCareers(req.query, { includeInactive: false });
  res.json({ success: true, data: result });
});

const getCareerById = asyncHandler(async (req, res) => {
  const career = await service.getCareerById(Number(req.params.id), Number(req.user.id), {
    includeInactive: false,
  });
  if (!career) {
    return res.status(404).json({ success: false, message: "Career not found" });
  }
  res.json({ success: true, data: { career } });
});

// ---------- Saved filters ----------

const saveFilter = asyncHandler(async (req, res) => {
  const saved = await prisma.savedFilter.create({
    data: {
      userId: Number(req.user.id),
      name: req.body.name,
      filterJson: JSON.stringify(req.body.filterConfig),
    },
  });
  res.status(201).json({
    success: true,
    message: "Filter saved",
    data: { savedFilter: { ...saved, filterConfig: req.body.filterConfig, filterJson: undefined } },
  });
});

const getSavedFilters = asyncHandler(async (req, res) => {
  const where = { userId: Number(req.user.id) };
  const [filters, total] = await Promise.all([
    prisma.savedFilter.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.savedFilter.count({ where }),
  ]);
  res.json({
    success: true,
    data: {
      savedFilters: filters.map((f) => ({
        id: f.id,
        name: f.name,
        filterConfig: JSON.parse(f.filterJson),
        createdAt: f.createdAt,
      })),
      pagination: paginationMeta(req.query.page, req.query.limit, total),
    },
  });
});

const deleteSavedFilter = asyncHandler(async (req, res) => {
  const saved = await prisma.savedFilter.findUnique({ where: { id: Number(req.params.id) } });
  // Ownership check - same pattern as Profile; 404 avoids leaking existence
  if (!saved || saved.userId !== Number(req.user.id)) {
    return res.status(404).json({ success: false, message: "Saved filter not found" });
  }
  await prisma.savedFilter.delete({ where: { id: saved.id } });
  res.json({ success: true, message: "Saved filter deleted" });
});

module.exports = { listCareers, getCareerById, saveFilter, getSavedFilters, deleteSavedFilter, getTrendingCareers };
