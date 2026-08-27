const { z } = require("zod");
const { paginationSchema } = require("../../utils/pagination");

const tagsArray = z.array(z.string().trim().min(1).max(50)).max(20);

const listQuerySchema = paginationSchema.extend({
  type: z.enum(["VIDEO", "PODCAST", "ANIMATED_EXPLAINER"]).optional(),
  category: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(50).optional(),
});

const createMediaSchema = z.strictObject({
  title: z.string().trim().min(2).max(150),
  type: z.enum(["VIDEO", "PODCAST", "ANIMATED_EXPLAINER"]),
  url: z.string().trim().url().max(500),
  thumbnailUrl: z.string().trim().url().max(500).optional(),
  category: z.string().trim().min(2).max(100),
  transcript: z.string().trim().max(20000).optional(),
  tags: tagsArray.optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

const updateMediaSchema = createMediaSchema
  .extend({ status: z.enum(["DRAFT", "PUBLISHED"]) })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

const ratingSchema = z.strictObject({
  rating: z.coerce.number().int().min(1, "Rating must be 1-5").max(5, "Rating must be 1-5"),
});

module.exports = { listQuerySchema, createMediaSchema, updateMediaSchema, ratingSchema };

