const express = require("express");
const { authMiddleware, optionalAuthMiddleware } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./media.controller");
const v = require("./media.validation");
const { writeLimiter } = require("../../utils/rateLimiter");

const publicRouter = express.Router();

// Public media catalog & detail (accessible to visitors)
publicRouter.get("/", optionalAuthMiddleware, validate(v.listQuerySchema, "query"), controller.listMedia);
publicRouter.get("/:id", optionalAuthMiddleware, controller.getMediaById);
publicRouter.get("/:id/rating-summary", optionalAuthMiddleware, controller.ratingSummary);

// Ratings (authenticated users only)
publicRouter.post("/:id/rating", authMiddleware, writeLimiter, validate(v.ratingSchema), controller.rateMedia);

const adminRouter = express.Router();
adminRouter.use(authMiddleware, requireRole("ADMIN"));

adminRouter.post("/", validate(v.createMediaSchema), controller.createMedia);
adminRouter.put("/:id", validate(v.updateMediaSchema), controller.updateMedia);
adminRouter.delete("/:id", controller.deleteMedia);

module.exports = { publicRouter, adminRouter };
