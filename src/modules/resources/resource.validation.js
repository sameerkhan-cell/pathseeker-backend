const { z } = require("zod");
const { paginationSchema } = require("../../utils/pagination");

const tagsArray = z.preprocess((val) => {
  if (typeof val === "string" && val.trim() !== "") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}, z.array(z.string().trim().min(1).max(50)).max(20));

const listQuerySchema = paginationSchema.extend({
  type: z.enum(["PDF", "CHECKLIST", "INFOGRAPHIC"]).optional(),
  audience: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(50).optional(),
  search: z.string().trim().max(150).optional(),
});

// Metadata JSON part of multipart create (file handled by multer separately)
const createResourceSchema = z.strictObject({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(["PDF", "CHECKLIST", "INFOGRAPHIC"]),
  audience: z.string().trim().min(2).max(100),
  tags: tagsArray.optional(),
  previewUrl: z.string().trim().url().max(500).optional(),
});

const updateResourceSchema = createResourceSchema
  .extend({ isActive: z.boolean() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

module.exports = { listQuerySchema, createResourceSchema, updateResourceSchema };

