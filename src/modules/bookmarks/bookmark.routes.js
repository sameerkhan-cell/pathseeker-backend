const express = require("express");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./bookmark.controller");
const v = require("./bookmark.validation");
const { writeLimiter } = require("../../utils/rateLimiter");

// PUBLIC router - mounted WITHOUT auth. The HMAC token is the only access
// control here; response contains item titles only, never owner identity.
const sharedRouter = express.Router();
sharedRouter.get("/:token", controller.sharedBookmarks);

// PROTECTED router - everything else requires login
const router = express.Router();
router.use(authMiddleware);

router.post("/", writeLimiter, validate(v.createBookmarkSchema), controller.createBookmark);
router.get("/", validate(v.listQuerySchema, "query"), controller.listBookmarks);
// literal paths declared before /:id
router.get("/export", controller.exportBookmarks);
router.get("/share", controller.getShareLink);
router.delete("/:id", controller.deleteBookmark);
router.post("/:id/notes", validate(v.noteSchema), controller.addNote);
router.put("/notes/:noteId", validate(v.noteSchema), controller.updateNote);
router.delete("/notes/:noteId", controller.deleteNote);

module.exports = { sharedRouter, router };


