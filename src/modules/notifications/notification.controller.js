const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { paginationMeta } = require("../../utils/pagination");
const { announceToUsers } = require("../../utils/notify");

// GET /api/notifications - own, newest first
const listNotifications = asyncHandler(async (req, res) => {
  const where = { userId: Number(req.user.id) };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
  ]);
  res.json({ success: true, data: { items, pagination: paginationMeta(req.query.page, req.query.limit, total) } });
});

// PUT /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: Number(req.params.id) } });
  // Ownership enforced - non-owner gets 404, never touches another user's row
  if (!notification || notification.userId !== Number(req.user.id)) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }
  const updated = await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
  res.json({ success: true, message: "Marked as read", data: { notification: updated } });
});

// PUT /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: Number(req.user.id), isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true, message: "All marked as read", data: { updated: result.count } });
});

// GET /api/notifications/unread-count
const unreadCount = asyncHandler(async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: Number(req.user.id), isRead: false },
  });
  res.json({ success: true, data: { count } });
});

// POST /api/admin/notifications/announce
const announce = asyncHandler(async (req, res) => {
  const recipientCount = await announceToUsers({
    title: req.body.title,
    message: req.body.message,
    role: req.body.role ?? null,
  });
  res.status(201).json({ success: true, message: `Announcement sent to ${recipientCount} user(s)`, data: { recipientCount } });
});

module.exports = { listNotifications, markRead, markAllRead, unreadCount, announce };
