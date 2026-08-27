const { prisma } = require("../config/db");

/**
 * Internal helper (not an HTTP endpoint). Other modules call this to create
 * notifications for users - e.g. feedback responses, story approvals,
 * announcements. Never throws into caller flows; logs and continues.
 */
async function createNotification({ userId, title, message, type = "GENERAL" }) {
  try {
    return await prisma.notification.create({
      data: { userId, title, message, type },
    });
  } catch (err) {
    require("./logger").logger.error(`createNotification failed: ${err.message}`);
    return null;
  }
}

// Broadcast to all users, optionally filtered by role
async function announceToUsers({ title, message, type = "ANNOUNCEMENT", role = null }) {
  const where = role ? { role } : {};
  const users = await prisma.user.findMany({ where: { ...where, isActive: true }, select: { id: true } });
  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, title, message, type })),
  });
  return users.length;
}

module.exports = { createNotification, announceToUsers };
