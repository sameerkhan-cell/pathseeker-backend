const { z } = require("zod");
const { paginationSchema } = require("../../utils/pagination");

// Client cannot send status - server forces OPEN
const createFeedbackSchema = z.strictObject({
  type: z.enum(["BUG", "SUGGESTION", "QUERY"]),
  message: z.string().trim().min(10).max(5000),
});

const adminListSchema = paginationSchema.extend({
  type: z.enum(["BUG", "SUGGESTION", "QUERY"]).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
});

const respondSchema = z.strictObject({
  response: z.string().trim().min(3).max(2000),
});

const statusChangeSchema = z.strictObject({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
});

module.exports = { createFeedbackSchema, adminListSchema, respondSchema, statusChangeSchema };

