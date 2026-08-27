const express = require("express");
const { authMiddleware, optionalAuthMiddleware } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./careers.controller");
const adminController = require("./careers.admin.controller");
const v = require("./careers.validation");
const { writeLimiter } = require("../../utils/rateLimiter");

// ---------- Open public routes (NO auth — mounted at /api/careers) ----------
const openRouter = express.Router();
openRouter.get("/trending", controller.getTrendingCareers);

// ---------- Public routes with optional auth ----------
const publicRouter = express.Router();

// Public catalog & detail (accessible to visitors)
publicRouter.get("/", optionalAuthMiddleware, validate(v.listQuerySchema, "query"), controller.listCareers);
publicRouter.get("/:id", optionalAuthMiddleware, controller.getCareerById);

// Saved filters (authenticated users only)
publicRouter.post("/saved-filters", authMiddleware, validate(v.savedFilterSchema), controller.saveFilter);
publicRouter.get("/saved-filters", authMiddleware, validate(v.listQuerySchema, "query"), controller.getSavedFilters);
publicRouter.delete("/saved-filters/:id", authMiddleware, controller.deleteSavedFilter);

// ---------- Admin routes (mounted at /api/admin/careers) ----------
const adminRouter = express.Router();
adminRouter.use(authMiddleware, requireRole("ADMIN"));

adminRouter.get("/", validate(v.listQuerySchema, "query"), adminController.adminListCareers);
adminRouter.post("/", validate(v.createCareerSchema), adminController.createCareer);
adminRouter.put("/:id", validate(v.updateCareerSchema), adminController.updateCareer);
adminRouter.delete("/:id", adminController.deleteCareer);
adminRouter.post("/:id/restore", adminController.restoreCareer);

module.exports = { openRouter, publicRouter, adminRouter };
