const { z } = require("zod");
const { paginationSchema } = require("../../utils/pagination");

// CAREER/MEDIA/STORY use numeric ids; RESOURCE uses a cuid string
const createBookmarkSchema = z
  .strictObject({
    itemType: z.enum(["CAREER", "MEDIA", "RESOURCE", "STORY"]),
    itemId: z.union([z.coerce.number().int().positive(), z.string().trim().min(10).max(40)]),
  })
  .superRefine((b, ctx) => {
    const wantsString = b.itemType === "RESOURCE";
    const gotString = typeof b.itemId === "string";
    if (wantsString !== gotString) {
      ctx.addIssue({
        code: "custom",
        message: wantsString
          ? "RESOURCE bookmarks need the resource id string"
          : "This item type needs a numeric id",
        path: ["itemId"],
      });
    }
  });

const listQuerySchema = paginationSchema.extend({
  itemType: z.enum(["CAREER", "MEDIA", "RESOURCE", "STORY"]).optional(),
});

const noteSchema = z.strictObject({
  noteText: z.string().trim().min(1).max(2000),
});

module.exports = { createBookmarkSchema, listQuerySchema, noteSchema };


