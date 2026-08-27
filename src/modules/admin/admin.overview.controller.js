const express = require("express");
const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { getFeedbackVolume } = require("../feedback/feedback.controller");

// GET /api/admin/stats/overview
//
// AVERAGE QUIZ SCORE (documented choice): raw average of `score` across ALL
// attempts (all-time, not 30-day). Quiz max scores differ per quiz, so this is
// indicative only; a normalized percentage would need per-quiz joins later.
const getOverviewStats = asyncHandler(async (_req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Popular content via UNION queries that JOIN the live tables directly -
  // soft-deleted/unpublished items can never appear in these lists.
  const popularBookmarked = prisma.$queryRaw`
    SELECT t.itemType, t.title, t.cnt FROM (
      SELECT 'CAREER' AS itemType, c.title AS title, COUNT(*) AS cnt
        FROM bookmarks b JOIN careers c ON b.careerId = c.id AND c.isActive = 1
        WHERE b.item_type = 'CAREER' GROUP BY c.id, c.title
      UNION ALL
      SELECT 'MEDIA', m.title, COUNT(*)
        FROM bookmarks b JOIN media m ON b.mediaId = m.id AND m.status = 'PUBLISHED'
        WHERE b.item_type = 'MEDIA' GROUP BY m.id, m.title
      UNION ALL
      SELECT 'RESOURCE', r.title, COUNT(*)
        FROM bookmarks b JOIN resources r ON b.resourceId = r.id AND r.isActive = 1
        WHERE b.item_type = 'RESOURCE' GROUP BY r.id, r.title
      UNION ALL
      SELECT 'STORY', s.title, COUNT(*)
        FROM bookmarks b JOIN success_stories s ON b.storyId = s.id AND s.status = 'APPROVED'
        WHERE b.item_type = 'STORY' GROUP BY s.id, s.title
    ) t ORDER BY t.cnt DESC LIMIT 5`;

  const mostViewed = prisma.$queryRaw`
    SELECT t.itemType, t.title, t.views FROM (
      SELECT 'CAREER' AS itemType, c.title AS title, COUNT(*) AS views
        FROM recently_viewed v JOIN careers c ON v.careerId = c.id AND c.isActive = 1
        WHERE v.item_type = 'CAREER' GROUP BY c.id, c.title
      UNION ALL
      SELECT 'MEDIA', m.title, COUNT(*)
        FROM recently_viewed v JOIN media m ON v.mediaId = m.id AND m.status = 'PUBLISHED'
        WHERE v.item_type = 'MEDIA' GROUP BY m.id, m.title
      UNION ALL
      SELECT 'RESOURCE', r.title, COUNT(*)
        FROM recently_viewed v JOIN resources r ON v.resourceId = r.id AND r.isActive = 1
        WHERE v.item_type = 'RESOURCE' GROUP BY r.id, r.title
    ) t ORDER BY t.views DESC LIMIT 5`;

  const attemptsByDay = prisma.$queryRaw`
    SELECT DATE(completed_at) AS date, COUNT(*) AS count
      FROM quiz_attempts WHERE completed_at >= ${thirtyDaysAgo}
      GROUP BY DATE(completed_at) ORDER BY date ASC`;

  const [
    usersByRole,
    totalCareers,
    totalMedia,
    totalResources,
    totalApprovedStories,
    attemptCount30d,
    attemptsByDayRows,
    avgScore,
    bookmarkedTop,
    viewedTop,
    feedbackVolume,
    pendingStoriesCount,
    pendingFeedbackCount,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: { isEmailVerified: true, isActive: true }, _count: { _all: true } }),
    prisma.career.count({ where: { isActive: true } }),
    prisma.media.count({ where: { status: "PUBLISHED" } }),
    prisma.resource.count({ where: { isActive: true } }),
    prisma.successStory.count({ where: { status: "APPROVED" } }),
    prisma.quizAttempt.count({ where: { completedAt: { gte: thirtyDaysAgo } } }),
    attemptsByDay,
    prisma.quizAttempt.aggregate({ _avg: { score: true }, _count: { _all: true } }),
    popularBookmarked,
    mostViewed,
    getFeedbackVolume(),
    prisma.successStory.count({ where: { status: "PENDING" } }),
    prisma.feedback.count({ where: { status: { not: "RESOLVED" } } }),
  ]);

  res.json({
    success: true,
    data: {
      activeUsersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count._all])),
      contentCounts: {
        totalCareers,
        totalMedia,
        totalResources,
        totalApprovedStories,
      },
      quizAttemptsLast30Days: {
        count: attemptCount30d,
        byDay: attemptsByDayRows.map((r) => ({
          date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
          count: Number(r.count),
        })),
      },
      averageQuizScore: {
        value: avgScore._avg.score ? Math.round(avgScore._avg.score * 10) / 10 : null,
        scope: "all-time, raw score (see code comment)",
        totalAttempts: avgScore._count._all,
      },
      popularContent: {
        mostBookmarked: bookmarkedTop.map((r) => ({ itemType: r.itemType, title: r.title, count: Number(r.cnt) })),
        mostViewed: viewedTop.map((r) => ({ itemType: r.itemType, title: r.title, views: Number(r.views) })),
      },
      feedbackVolume,
      needsAttention: {
        pendingStoriesCount,
        pendingFeedbackCount,
      },
    },
  });
});

module.exports = { getOverviewStats };
