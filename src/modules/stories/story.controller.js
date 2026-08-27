const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { paginationMeta } = require("../../utils/pagination");
const { trackRecentlyViewed } = require("../../utils/recentlyViewed");
const { createNotification } = require("../../utils/notify");

function publicStory(s) {
  return {
    id: s.id,
    userId: s.userId,
    title: s.title,
    domain: s.domain,
    educationPath: s.educationPath,
    challenges: s.challenges,
    outcome: s.outcome,
    status: s.status,
    createdAt: s.createdAt,
    reviewedAt: s.reviewedAt,
    rejectionReason: s.rejectionReason,
  };
}

// ================= User =================

// Client can NEVER set the status - always forced to PENDING
const submitStory = asyncHandler(async (req, res) => {
  const story = await prisma.successStory.create({
    data: { ...req.body, userId: Number(req.user.id), status: "PENDING" },
  });
  res.status(201).json({
    success: true,
    message: "Story submitted for review",
    data: { story: publicStory(story) },
  });
});

// Own submissions regardless of status (track pending ones)
const getMyStories = asyncHandler(async (req, res) => {
  const where = { userId: Number(req.user.id) };
  const [stories, total] = await Promise.all([
    prisma.successStory.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.successStory.count({ where }),
  ]);
  res.json({
    success: true,
    data: { stories: stories.map(publicStory), pagination: paginationMeta(req.query.page, req.query.limit, total) },
  });
});

// Public list - approved only
const listStories = asyncHandler(async (req, res) => {
  const where = { status: "APPROVED" };
  if (req.query.domain) where.domain = { contains: req.query.domain };

  const [items, total] = await Promise.all([
    prisma.successStory.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { reviewedAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.successStory.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((s) => ({ ...publicStory(s), authorName: s.user.name })),
      pagination: paginationMeta(req.query.page, req.query.limit, total),
    },
  });
});

const getStoryById = asyncHandler(async (req, res) => {
  const story = await prisma.successStory.findUnique({
    where: { id: Number(req.params.id) },
    include: { user: { select: { name: true } } },
  });

  const isOwner = story && story.userId === Number(req.user.id);
  const isAdmin = req.user.role === "ADMIN";
  if (!story || (!isAdmin && !isOwner && story.status !== "APPROVED")) {
    return res.status(404).json({ success: false, message: "Story not found" });
  }

  await trackRecentlyViewed(Number(req.user.id), "STORY", { storyId: story.id });

  res.json({ success: true, data: { story: { ...publicStory(story), authorName: story.user.name } } });
});

// ================= Admin =================

const adminListStories = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;

  const [items, total] = await Promise.all([
    prisma.successStory.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.successStory.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((s) => ({ ...publicStory(s), authorName: s.user.name, authorEmail: s.user.email })),
      pagination: paginationMeta(req.query.page, req.query.limit, total),
    },
  });
});

async function reviewStory(req, res, status, extraData = {}) {
  const existing = await prisma.successStory.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ success: false, message: "Story not found" });
  const story = await prisma.successStory.update({
    where: { id: existing.id },
    data: { status, reviewedAt: new Date(), ...extraData },
  });

  // Notify the author about the review outcome
  const title = status === "APPROVED" ? "Your story was approved!" : "Your story was not approved";
  const message =
    status === "APPROVED"
      ? `"${existing.title}" is now live in the Success Stories section.`
      : `"${existing.title}" was rejected: ${extraData.rejectionReason || "no reason provided"}`;
  await createNotification({ userId: existing.userId, title, message, type: "STORY_REVIEW" });

  return story;
}

const approveStory = asyncHandler(async (req, res) => {
  const story = await reviewStory(req, res, "APPROVED");
  if (story) res.json({ success: true, message: "Story approved", data: { story: publicStory(story) } });
});

const rejectStory = asyncHandler(async (req, res) => {
  const story = await reviewStory(req, res, "REJECTED", { rejectionReason: req.body.reason });
  if (story) res.json({ success: true, message: "Story rejected", data: { story: publicStory(story) } });
});

module.exports = { submitStory, getMyStories, listStories, getStoryById, adminListStories, approveStory, rejectStory };
