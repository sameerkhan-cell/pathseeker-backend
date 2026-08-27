const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { paginationMeta } = require("../../utils/pagination");
const { createNotification } = require("../../utils/notify");

// POST /api/feedback - status forced to OPEN regardless of client body
const submitFeedback = asyncHandler(async (req, res) => {
  const feedback = await prisma.feedback.create({
    data: { userId: Number(req.user.id), type: req.body.type, message: req.body.message, status: "OPEN" },
  });
  res.status(201).json({ success: true, message: "Feedback submitted", data: { feedback } });
});

// GET /api/feedback/mine
const myFeedback = asyncHandler(async (req, res) => {
  const where = { userId: Number(req.user.id) };
  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedback.count({ where }),
  ]);
  res.json({ success: true, data: { feedbacks: items, pagination: paginationMeta(req.query.page, req.query.limit, total) } });
});

// GET /api/admin/feedback
const adminListFeedback = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.status) where.status = req.query.status;

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.feedback.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((f) => ({ ...f, userName: f.user.name, userEmail: f.user.email })),
      pagination: paginationMeta(req.query.page, req.query.limit, total),
    },
  });
});

// Shared aggregation - reused by both this endpoint and the Phase 9 admin
// overview (single source of truth, no duplicated logic)
async function getFeedbackVolume() {
  const [byType, byStatus] = await Promise.all([
    prisma.feedback.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.feedback.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    byType: Object.fromEntries(byType.map((t) => [t.type, t._count._all])),
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
  };
}

// GET /api/admin/feedback/stats
const feedbackStats = asyncHandler(async (_req, res) => {
  const data = await getFeedbackVolume();
  res.json({ success: true, data });
});

// PUT /api/admin/feedback/:id/respond -> resolves + notifies the user
const respondToFeedback = asyncHandler(async (req, res) => {
  const existing = await prisma.feedback.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ success: false, message: "Feedback not found" });

  const feedback = await prisma.feedback.update({
    where: { id: existing.id },
    data: { adminResponse: req.body.response, status: "RESOLVED", respondedAt: new Date() },
  });

  await createNotification({
    userId: existing.userId,
    title: "Response to your feedback",
    message: `Your ${existing.type.toLowerCase()} feedback received a response: ${req.body.response}`,
    type: "FEEDBACK_RESPONSE",
  });

  res.json({ success: true, message: "Response sent", data: { feedback } });
});

// PUT /api/admin/feedback/:id/status
const changeFeedbackStatus = asyncHandler(async (req, res) => {
  const existing = await prisma.feedback.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ success: false, message: "Feedback not found" });

  const feedback = await prisma.feedback.update({
    where: { id: existing.id },
    data: { status: req.body.status },
  });
  res.json({ success: true, message: "Status updated", data: { feedback } });
});

module.exports = { submitFeedback, myFeedback, adminListFeedback, feedbackStats, getFeedbackVolume, respondToFeedback, changeFeedbackStatus };
