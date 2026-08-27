const { z } = require("zod");

const stringArray = z
  .array(z.string().trim().min(1).max(100))
  .max(50, "Maximum 50 items allowed");

const demandEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

const baseCareer = {
  title: z.string().trim().min(2).max(150),
  domain: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(5000),
  skills: stringArray.min(1, "At least one skill is required"),
  salaryMin: z.coerce.number().int().min(0).max(100000000),
  salaryMax: z.coerce.number().int().min(0).max(100000000),
  demand: demandEnum,
  educationPath: z.string().trim().max(2000).optional(),
  growthOutlook: z.string().trim().max(2000).optional(),
  relatedCareers: stringArray.optional(),
  tags: stringArray.optional(),
};

const createCareerSchema = z
  .strictObject(baseCareer)
  .refine((d) => d.salaryMax >= d.salaryMin, {
    message: "salaryMax must be >= salaryMin",
    path: ["salaryMax"],
  });

// All fields optional for update; but if both salaries present they must be ordered
const updateCareerSchema = z
  .strictObject({
    title: baseCareer.title.optional(),
    domain: baseCareer.domain.optional(),
    description: baseCareer.description.optional(),
    skills: stringArray.optional(),
    salaryMin: baseCareer.salaryMin.optional(),
    salaryMax: baseCareer.salaryMax.optional(),
    demand: demandEnum.optional(),
    educationPath: baseCareer.educationPath,
    growthOutlook: baseCareer.growthOutlook,
    relatedCareers: stringArray.optional(),
    tags: stringArray.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.salaryMin === undefined ||
      d.salaryMax === undefined ||
      d.salaryMax >= d.salaryMin,
    { message: "salaryMax must be >= salaryMin", path: ["salaryMax"] }
  )
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

// Pagination params must be numeric and positive - no silent defaults on bad input
const listQuerySchema = z.object({
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
  domain: z.string().trim().max(100).optional(),
  skill: z.string().trim().max(100).optional(),
  demand: demandEnum.optional(),
  search: z.string().trim().max(150).optional(),
  minSalary: z.coerce.number().int().min(0).optional(),
  maxSalary: z.coerce.number().int().min(0).optional(),
});

const savedFilterSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    filterConfig: z.object({}).passthrough(), // arbitrary query params snapshot
  })
  .strict();

module.exports = {
  createCareerSchema,
  updateCareerSchema,
  listQuerySchema,
  savedFilterSchema,
};

