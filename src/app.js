const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const { env } = require("./config/env");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");

const authRoutes = require("./modules/auth/auth.routes");
const profileRoutes = require("./modules/profile/profile.routes");
const careersRoutes = require("./modules/careers/careers.routes");
const quizRoutes = require("./modules/quiz/quiz.routes");
const mediaRoutes = require("./modules/multimedia/media.routes");
const storyRoutes = require("./modules/stories/story.routes");
const resourceRoutes = require("./modules/resources/resource.routes");
const bookmarkRoutes = require("./modules/bookmarks/bookmark.routes");
const feedbackRoutes = require("./modules/feedback/feedback.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const adminRoutes = require("./modules/admin/admin.routes");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
if (!env.isProd) app.use(morgan("dev"));

// Health check (public)
app.get("/api/health", (_req, res) =>
  res.json({ success: true, message: "PathSeeker API is running", time: new Date().toISOString() })
);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/careers", careersRoutes.openRouter);   // GET /trending — no auth
app.use("/api/careers", careersRoutes.publicRouter); // all other /careers/* — auth required
app.use("/api/admin/careers", careersRoutes.adminRouter);
app.use("/api/quiz", quizRoutes.publicRouter);
app.use("/api/admin/quiz", quizRoutes.adminRouter);
app.use("/api/media", mediaRoutes.publicRouter);
app.use("/api/admin/media", mediaRoutes.adminRouter);
app.use("/api/stories", storyRoutes.publicRouter);
app.use("/api/admin/stories", storyRoutes.adminRouter);
app.use("/api/resources", resourceRoutes.publicRouter);
app.use("/api/admin/resources", resourceRoutes.adminRouter);
app.use("/api/bookmarks/shared", bookmarkRoutes.sharedRouter);
app.use("/api/bookmarks", bookmarkRoutes.router);
app.use("/api/feedback", feedbackRoutes.router);
app.use("/api/admin/feedback", feedbackRoutes.adminRouter);
app.use("/api/notifications", notificationRoutes.router);
app.use("/api/admin/notifications", notificationRoutes.adminRouter);
app.use("/api/admin", adminRoutes);

// Uploaded files (read-only access)
// Only serve local uploads in non-Vercel environments (Vercel filesystem is read-only)
if (!process.env.VERCEL) {
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
