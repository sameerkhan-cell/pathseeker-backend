const express = require("express");
const { authMiddleware, optionalAuthMiddleware } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./story.controller");
const v = require("./story.validation");
const { paginationSchema } = require("../../utils/pagination");
const { writeLimiter } = require("../../utils/rateLimiter");

const publicRouter = express.Router();

// Public stories feed & detail (accessible to visitors)
publicRouter.get("/", optionalAuthMiddleware, validate(v.listQuerySchema, "query"), controller.listStories);

// Authenticated user story submission & my stories
publicRouter.get("/mine", authMiddleware, validate(paginationSchema, "query"), controller.getMyStories);
publicRouter.post("/", authMiddleware, writeLimiter, validate(v.submitStorySchema), controller.submitStory);
publicRouter.get("/:id", optionalAuthMiddleware, controller.getStoryById);

const adminRouter = express.Router();
adminRouter.use(authMiddleware, requireRole("ADMIN"));

adminRouter.get("/", validate(v.adminListSchema, "query"), controller.adminListStories);
adminRouter.put("/:id/approve", controller.approveStory);
adminRouter.put("/:id/reject", validate(v.rejectSchema), controller.rejectStory);

module.exports = { publicRouter, adminRouter };
