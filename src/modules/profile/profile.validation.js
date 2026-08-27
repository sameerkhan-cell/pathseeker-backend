const { z } = require("zod");

const stringArray = z
  .array(z.string().trim().min(1, "Array items cannot be empty").max(100))
  .max(50, "Maximum 50 items allowed");

const updateProfileSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{7,20}$/, "Invalid phone number")
      .optional(),
    bio: z.string().trim().max(1000, "Bio too long").optional(),
    educationLevel: z.string().trim().max(100).optional(),
    fieldOfStudy: z.string().trim().max(100).optional(),
    institution: z.string().trim().max(150).optional(),
    graduationYear: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
    skills: stringArray.optional(),
    interests: stringArray.optional(),
    experienceYears: z.coerce.number().int().min(0).max(60).nullable().optional(),
    currentRole: z.string().trim().max(100).optional(),
  })
  .strict();

module.exports = { updateProfileSchema };
