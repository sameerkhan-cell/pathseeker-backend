const express = require("express");
const { authMiddleware, optionalAuthMiddleware } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./resource.controller");
const v = require("./resource.validation");
const { makeUploader } = require("../../utils/upload");
const { writeLimiter } = require("../../utils/rateLimiter");

// PDF/CHECKLIST/INFOGRAPHIC resources are document files
const resourceUpload = makeUploader({
  subdir: "resources",
  allowExts: [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"],
});

const publicRouter = express.Router();
publicRouter.get("/", optionalAuthMiddleware, validate(v.listQuerySchema, "query"), controller.listResources);
publicRouter.get("/:id", optionalAuthMiddleware, controller.getResourceById);
publicRouter.post("/:id/download", optionalAuthMiddleware, writeLimiter, controller.downloadResource);

const adminRouter = express.Router();
adminRouter.use(authMiddleware, requireRole("ADMIN"));

adminRouter.post("/", resourceUpload, validate(v.createResourceSchema), controller.createResource);
adminRouter.put("/:id", resourceUpload, validate(v.updateResourceSchema), controller.updateResource);
adminRouter.delete("/:id", controller.deleteResource);

module.exports = { publicRouter, adminRouter };
