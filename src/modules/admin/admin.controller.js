const express = require("express");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { prisma } = require("../../config/db");
const overview = require("./admin.overview.controller");

// GET /api/admin/stats - legacy quick-glance stats
async function getStatsInner(_req, res) {
  const [totalUsers, totalCareers, totalQuizAttempts, pendingStories, openFeedback] =
    await Promise.all([
      prisma.user.count(),
      prisma.career.count(),
      prisma.quizAttempt.count(),
      prisma.successStory.count({ where: { status: "PENDING" } }),
      prisma.feedback.count({ where: { status: { not: "RESOLVED" } } }),
    ]);

  res.json({
    success: true,
    data: { totalUsers, totalCareers, totalQuizAttempts, pendingStories, openFeedback },
  });
}

const getStats = asyncHandler(getStatsInner);

// GET /api/admin/stats/overview - full Phase 9 aggregation
const getOverview = asyncHandler(overview.getOverviewStats);

module.exports = { getStats, getOverview };
