const { z } = require("zod");
const { paginationSchema } = require("../../utils/pagination");

const announceSchema = z.strictObject({
  title: z.string().trim().min(2).max(150),
  message: z.string().trim().min(3).max(2000),
  role: z.enum(["STUDENT", "GRADUATE", "PROFESSIONAL", "ADMIN"]).optional(), // omit = all users
});

module.exports = { announceSchema };

