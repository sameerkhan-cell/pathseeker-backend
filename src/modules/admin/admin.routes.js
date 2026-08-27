const express = require("express");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const controller = require("./admin.controller");

const router = express.Router();

// Every route below requires a valid JWT AND the ADMIN role
router.use(authMiddleware, requireRole("ADMIN"));

router.get("/stats", controller.getStats);
router.get("/stats/overview", controller.getOverview);

module.exports = router;
