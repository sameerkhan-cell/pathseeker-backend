const { prisma } = require("../config/db");

/**
 * Records a RecentlyViewed entry with dedup: one row per user/item.
 * (Manual find->update/create because nullable columns in the @@unique
 * make Prisma upsert unreliable on MySQL.)
 */
async function trackRecentlyViewed(userId, itemType, ids) {
  const where = { userId, itemType };
  if (ids.careerId) where.careerId = ids.careerId;
  if (ids.mediaId) where.mediaId = ids.mediaId;
  if (ids.resourceId) where.resourceId = ids.resourceId;
  if (ids.storyId) where.storyId = ids.storyId;

  const existing = await prisma.recentlyViewed.findFirst({ where });
  if (existing) {
    await prisma.recentlyViewed.update({ where: { id: existing.id }, data: { viewedAt: new Date() } });
  } else {
    await prisma.recentlyViewed.create({ data: { userId, itemType, ...ids } });
  }
}

module.exports = { trackRecentlyViewed };
