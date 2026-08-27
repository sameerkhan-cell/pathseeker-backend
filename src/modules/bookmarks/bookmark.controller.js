const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { paginationMeta } = require("../../utils/pagination");
const { makeShareToken, verifyShareToken } = require("../../utils/shareToken");
const { AppError } = require("../auth/auth.service");

// Which table backs each itemType + the "live" condition for bookmarking
const ITEM_CONFIG = {
  CAREER: { model: "career", find: (id) => prisma.career.findFirst({ where: { id, isActive: true } }) },
  MEDIA: { model: "media", find: (id) => prisma.media.findFirst({ where: { id, status: "PUBLISHED" } }) },
  RESOURCE: { model: "resource", find: (id) => prisma.resource.findFirst({ where: { id, isActive: true } }) },
  STORY: { model: "story", find: (id) => prisma.successStory.findFirst({ where: { id, status: "APPROVED" } }) },
};

// Single-query include - display info without N+1 round-trips
const DISPLAY_INCLUDE = {
  career: { select: { title: true, domain: true } },
  media: { select: { title: true, type: true } },
  resource: { select: { title: true, type: true } },
  story: { select: { title: true, domain: true } },
};

function itemIdOf(b) {
  return b.careerId ?? b.mediaId ?? b.resourceId ?? b.storyId;
}

function serializeBookmark(b) {
  const item = b[ITEM_CONFIG[b.itemType].model];
  return {
    id: b.id,
    itemType: b.itemType,
    itemId: itemIdOf(b),
    title: item ? item.title : "(unavailable)",
    itemInfo: item || null,
    createdAt: b.createdAt,
    notes: b.notes,
  };
}

// POST /api/bookmarks
const createBookmark = asyncHandler(async (req, res) => {
  const userId = Number(req.user.id);
  const cfg = ITEM_CONFIG[req.body.itemType];

  const item = await cfg.find(req.body.itemId);
  if (!item) {
    throw new AppError(404, `${req.body.itemType} ${req.body.itemId} does not exist or is not available`);
  }

  // Duplicate check (nullable FK columns make the @@unique unreliable on MySQL)
  const dupWhere = { userId, itemType: req.body.itemType };
  dupWhere[`${cfg.model}Id`] = req.body.itemId;
  const existing = await prisma.bookmark.findFirst({ where: dupWhere });
  if (existing) {
    return res.status(409).json({ success: false, message: "You have already bookmarked this item" });
  }

  try {
    const bookmark = await prisma.bookmark.create({
      data: { userId, itemType: req.body.itemType, [`${cfg.model}Id`]: req.body.itemId },
      include: DISPLAY_INCLUDE,
    });
    res.status(201).json({ success: true, message: "Bookmarked", data: { bookmark: serializeBookmark(bookmark) } });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "You have already bookmarked this item" });
    }
    throw err;
  }
});

// GET /api/bookmarks
const listBookmarks = asyncHandler(async (req, res) => {
  const where = { userId: Number(req.user.id) };
  if (req.query.itemType) where.itemType = req.query.itemType;

  const [items, total] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { createdAt: "desc" },
      include: { ...DISPLAY_INCLUDE, notes: true }, // single query, no N+1
    }),
    prisma.bookmark.count({ where }),
  ]);

  res.json({
    success: true,
    data: { items: items.map(serializeBookmark), pagination: paginationMeta(req.query.page, req.query.limit, total) },
  });
});

// DELETE /api/bookmarks/:id
const deleteBookmark = asyncHandler(async (req, res) => {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!bookmark || bookmark.userId !== Number(req.user.id)) {
    return res.status(404).json({ success: false, message: "Bookmark not found" });
  }
  await prisma.bookmark.delete({ where: { id: bookmark.id } });
  res.json({ success: true, message: "Bookmark removed" });
});

async function loadOwnedBookmarkNote(req, res) {
  const note = await prisma.bookmarkNote.findUnique({
    where: { id: Number(req.params.noteId) },
    include: { bookmark: { select: { id: true, userId: true } } },
  });
  if (!note || note.bookmark.userId !== Number(req.user.id)) {
    res.status(404).json({ success: false, message: "Note not found" });
    return null;
  }
  return note;
}

// POST /api/bookmarks/:id/notes
const addNote = asyncHandler(async (req, res) => {
  const bookmark = await prisma.bookmark.findUnique({ where: { id: Number(req.params.id) } });
  if (!bookmark || bookmark.userId !== Number(req.user.id)) {
    return res.status(404).json({ success: false, message: "Bookmark not found" });
  }
  const note = await prisma.bookmarkNote.create({
    data: { bookmarkId: bookmark.id, note: req.body.noteText },
  });
  res.status(201).json({ success: true, message: "Note added", data: { note: { ...note, noteText: note.note } } });
});

// PUT /api/bookmarks/notes/:noteId
const updateNote = asyncHandler(async (req, res) => {
  const note = await loadOwnedBookmarkNote(req, res);
  if (!note) return;
  const updated = await prisma.bookmarkNote.update({ where: { id: note.id }, data: { note: req.body.noteText } });
  res.json({ success: true, message: "Note updated", data: { note: { ...updated, noteText: updated.note } } });
});

// DELETE /api/bookmarks/notes/:noteId
const deleteNote = asyncHandler(async (req, res) => {
  const note = await loadOwnedBookmarkNote(req, res);
  if (!note) return;
  await prisma.bookmarkNote.delete({ where: { id: note.id } });
  res.json({ success: true, message: "Note deleted" });
});

// GET /api/bookmarks/export - JSON attachment (documented choice)
const exportBookmarks = asyncHandler(async (req, res) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: Number(req.user.id) },
    orderBy: { createdAt: "desc" },
    include: DISPLAY_INCLUDE,
  });

  const payload = bookmarks.map((b) => ({
    itemType: b.itemType,
    title: (b[ITEM_CONFIG[b.itemType].model] || {}).title || "(unavailable)",
    savedAt: b.createdAt,
  }));

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="pathseeker-bookmarks.json"');
  res.send(JSON.stringify(payload, null, 2));
});

// GET /api/bookmarks/share -> token; public read-only view via token
const getShareLink = asyncHandler(async (req, res) => {
  const token = makeShareToken(Number(req.user.id));
  res.json({ success: true, data: { shareToken: token, shareUrl: `/api/bookmarks/shared/${token}` } });
});

const sharedBookmarks = asyncHandler(async (req, res) => {
  const userId = verifyShareToken(req.params.token);
  if (!userId) return res.status(404).json({ success: false, message: "Invalid share link" });

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: DISPLAY_INCLUDE,
  });
  res.json({
    success: true,
    data: { readOnly: true, items: bookmarks.map((b) => ({ itemType: b.itemType, title: (b[ITEM_CONFIG[b.itemType].model] || {}).title })) },
  });
});

module.exports = {
  createBookmark, listBookmarks, deleteBookmark,
  addNote, updateNote, deleteNote,
  exportBookmarks, getShareLink, sharedBookmarks,
};
