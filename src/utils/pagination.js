const { z } = require("zod");

// Shared pagination schema - bad params -> 400, never silent defaults
const paginationSchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "page must be a number" })
    .int("page must be an integer")
    .min(1, "page must be >= 1")
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: "limit must be a number" })
    .int("limit must be an integer")
    .min(1, "limit must be >= 1")
    .max(50, "limit cannot exceed 50")
    .default(20),
});

function paginationMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

module.exports = { paginationSchema, paginationMeta };
