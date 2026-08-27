const express = require("express");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./notification.controller");
const { announceSchema } = require("./notification.validation");

// GET /api/notifications needs pagination params
const listNotificationSchema = require("../../utils/pagination").paginationSchema;

const router = express.Router();
router.use(authMiddleware);

router.get("/", validate(listNotificationSchema, "query"), controller.listNotifications);
router.get("/unread-count", controller.unreadCount);
router.put("/read-all", controller.markAllRead);
router.put("/:id/read", controller.markRead);

const adminRouter = express.Router();
adminRouter.use(authMiddleware, requireRole("ADMIN"));
adminRouter.post("/announce", validate(announceSchema), controller.announce);

module.exports = { router, adminRouter };
