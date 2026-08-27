const express = require("express");
const { authMiddleware, optionalAuthMiddleware } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./quiz.controller");
const v = require("./quiz.validation");
const { paginationSchema } = require("../../utils/pagination");
const { writeLimiter } = require("../../utils/rateLimiter");

// ---------- Public (mounted at /api/quiz) ----------
const publicRouter = express.Router();

// Active quizzes list, starting quiz, submitting & viewing attempts (accessible to visitors / users)
publicRouter.get("/active", optionalAuthMiddleware, controller.listActiveQuizzes);
publicRouter.get("/:id/start", optionalAuthMiddleware, controller.startQuiz);
publicRouter.post("/:id/submit", optionalAuthMiddleware, writeLimiter, validate(v.submitSchema), controller.submitQuiz);
publicRouter.get("/attempts/:attemptId", optionalAuthMiddleware, controller.getAttempt);

// History (authenticated users only)
publicRouter.get("/history", authMiddleware, validate(paginationSchema, "query"), controller.getHistory);

// ---------- Admin (mounted at /api/admin/quiz) ----------
const adminRouter = express.Router();
adminRouter.use(authMiddleware, requireRole("ADMIN"));

adminRouter.post("/", validate(v.createQuizSchema), controller.createQuiz);
adminRouter.put("/:id", validate(v.updateQuizSchema), controller.updateQuiz);
adminRouter.post("/:id/questions", validate(v.addQuestionSchema), controller.addQuestion);
adminRouter.get("/:id/questions", controller.listQuestionsAdmin);
adminRouter.put("/questions/:questionId", validate(v.updateQuestionSchema), controller.updateQuestion);
adminRouter.delete("/questions/:questionId", controller.deleteQuestion);

module.exports = { publicRouter, adminRouter };
