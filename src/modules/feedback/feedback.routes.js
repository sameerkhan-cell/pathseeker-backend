const express = require("express");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./feedback.controller");
const v = require("./feedback.validation");
const { paginationSchema } = require("../../utils/pagination");
const { writeLimiter } = require("../../utils/rateLimiter");

const router = express.Router();
router.use(authMiddleware);

// /mine before /:id (no /:id GET here, but keep ordering safe anyway)
router.post("/", writeLimiter, validate(v.createFeedbackSchema), controller.submitFeedback);
router.get("/mine", validate(paginationSchema, "query"), controller.myFeedback);

const adminRouter = express.Router();
adminRouter.use(authMiddleware, requireRole("ADMIN"));

adminRouter.get("/", validate(v.adminListSchema, "query"), controller.adminListFeedback);
adminRouter.get("/stats", controller.feedbackStats);
adminRouter.put("/:id/respond", validate(v.respondSchema), controller.respondToFeedback);
adminRouter.put("/:id/status", validate(v.statusChangeSchema), controller.changeFeedbackStatus);

module.exports = { router, adminRouter };


