const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { paginationMeta } = require("../../utils/pagination");
const { trackRecentlyViewed } = require("../../utils/recentlyViewed");

function serializeTags(m) {
  return { ...m, tags: m.tags ? JSON.parse(m.tags) : [] };
}
function tagsToDb(data) {
  const db = { ...data };
  if (data.tags !== undefined) db.tags = JSON.stringify(data.tags);
  return db;
}

// ================= Admin =================

const createMedia = asyncHandler(async (req, res) => {
  const media = await prisma.media.create({ data: tagsToDb(req.body) });
  res.status(201).json({ success: true, message: "Media created", data: { media: serializeTags(media) } });
});

const updateMedia = asyncHandler(async (req, res) => {
  const existing = await prisma.media.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ success: false, message: "Media not found" });
  const media = await prisma.media.update({ where: { id: existing.id }, data: tagsToDb(req.body) });
  res.json({ success: true, message: "Media updated", data: { media: serializeTags(media) } });
});

// Soft delete: revert to DRAFT so bookmarks/ratings history stay intact
const deleteMedia = asyncHandler(async (req, res) => {
  const existing = await prisma.media.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ success: false, message: "Media not found" });
  await prisma.media.update({ where: { id: existing.id }, data: { status: "DRAFT" } });
  res.json({ success: true, message: "Media unpublished (soft-deleted)" });
});

// ================= Public =================

const listMedia = asyncHandler(async (req, res) => {
  const where = { status: "PUBLISHED" };
  if (req.query.type) where.type = req.query.type;
  if (req.query.category) where.category = { contains: req.query.category };
  if (req.query.tag) where.tags = { contains: `"${req.query.tag}"` }; // exact tag match inside JSON array text

  const [items, total] = await Promise.all([
    prisma.media.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.media.count({ where }),
  ]);

  res.json({
    success: true,
    data: { items: items.map(serializeTags), pagination: paginationMeta(req.query.page, req.query.limit, total) },
  });
});

const getMediaById = asyncHandler(async (req, res) => {
  const media = await prisma.media.findFirst({ where: { id: Number(req.params.id), status: "PUBLISHED" } });
  if (!media) return res.status(404).json({ success: false, message: "Media not found" });

  await trackRecentlyViewed(Number(req.user.id), "MEDIA", { mediaId: media.id });

  // Related: same category, exclude self, max 4, published only
  const related = await prisma.media.findMany({
    where: { category: media.category, status: "PUBLISHED", NOT: { id: media.id } },
    take: 4,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, type: true, category: true },
  });

  res.json({ success: true, data: { media: serializeTags(media), related } });
});

// ================= Ratings =================

const rateMedia = asyncHandler(async (req, res) => {
  const media = await prisma.media.findUnique({ where: { id: Number(req.params.id) } });
  if (!media || media.status !== "PUBLISHED") {
    return res.status(404).json({ success: false, message: "Media not found" });
  }
  // unique(mediaId, userId) -> upsert updates the existing rating in place
  const rating = await prisma.mediaRating.upsert({
    where: { mediaId_userId: { mediaId: media.id, userId: Number(req.user.id) } },
    update: { rating: req.body.rating },
    create: { mediaId: media.id, userId: Number(req.user.id), rating: req.body.rating },
  });
  res.status(201).json({ success: true, message: "Rating saved", data: { rating } });
});

const ratingSummary = asyncHandler(async (req, res) => {
  const summary = await prisma.mediaRating.aggregate({
    where: { mediaId: Number(req.params.id) },
    _avg: { rating: true },
    _count: { rating: true },
  });
  res.json({
    success: true,
    data: {
      average: summary._avg.rating ? Math.round(summary._avg.rating * 10) / 10 : null,
      count: summary._count.rating,
    },
  });
});

module.exports = { createMedia, updateMedia, deleteMedia, listMedia, getMediaById, rateMedia, ratingSummary };
