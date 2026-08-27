const { z } = require("zod");
const { paginationSchema } = require("../../utils/pagination");

const submitStorySchema = z.strictObject({
  title: z.string().trim().min(5).max(150),
  domain: z.string().trim().min(2).max(100),
  educationPath: z.string().trim().min(10).max(2000),
  challenges: z.string().trim().min(10).max(5000),
  outcome: z.string().trim().min(10).max(5000),
  // NOTE: status intentionally NOT accepted here - server forces PENDING
});

const listQuerySchema = paginationSchema.extend({
  domain: z.string().trim().max(100).optional(),
});

const adminListSchema = paginationSchema.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

const rejectSchema = z.strictObject({
  reason: z.string().trim().min(3).max(255),
});

module.exports = { submitStorySchema, listQuerySchema, adminListSchema, rejectSchema };

