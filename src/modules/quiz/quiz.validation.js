const { z } = require("zod");

const optionSchema = z.object({
  id: z.string().trim().min(1).max(50), // stable client-facing id, e.g. "o1"
  text: z.string().trim().min(1).max(500),
  weight: z.coerce.number().int().min(-100).max(100),
});

const createQuizSchema = z.strictObject({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(2).max(100),
  durationMinutes: z.coerce.number().int().min(1).max(180).default(15),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

const updateQuizSchema = createQuizSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

// MC/LIKERT need >=2 options with unique ids; SLIDER needs min<max and step>=1
const questionBase = {
  type: z.enum(["MULTIPLE_CHOICE", "LIKERT", "SLIDER"]),
  questionText: z.string().trim().min(3).max(1000),
  order: z.coerce.number().int().min(0).max(1000).optional(),
};

const questionShape = z
  .object({
    ...questionBase,
    options: z.array(optionSchema).optional(),
    sliderMin: z.coerce.number().int().optional(),
    sliderMax: z.coerce.number().int().optional(),
    sliderStep: z.coerce.number().int().min(1).optional(),
  })
  .strict();
// Shared constraint checks; skips checks whose fields are absent (for updates)
function questionConstraints(q, ctx) {
  if ((q.type === "MULTIPLE_CHOICE" || q.type === "LIKERT") && q.options !== undefined) {
    if (!q.options || q.options.length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "Multiple-choice/Likert questions need at least 2 options",
        path: ["options"],
      });
    } else {
      const ids = q.options.map((o) => o.id);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: "custom", message: "Option ids must be unique", path: ["options"] });
      }
    }
  }
  if (q.type === "SLIDER" && (q.sliderMin !== undefined || q.sliderMax !== undefined)) {
    if (q.sliderMin === undefined || q.sliderMax === undefined || q.sliderMin >= q.sliderMax) {
      ctx.addIssue({
        code: "custom",
        message: "SLIDER questions need sliderMin < sliderMax",
        path: ["sliderMax"],
      });
    }
  }
}

const addQuestionSchema = questionShape.superRefine(questionConstraints);

const updateQuestionSchema = questionShape.partial().superRefine(questionConstraints);

const answerSchema = z
  .object({
    questionId: z.coerce.number().int().positive(),
    selectedOptionId: z.string().trim().min(1).max(50).optional(),
    sliderValue: z.coerce.number().int().optional(),
  })
  .strict()
  .refine(
    (a) =>
      (a.selectedOptionId !== undefined) !== (a.sliderValue !== undefined),
    { message: "Provide either selectedOptionId or sliderValue" }
  );

const submitSchema = z
  .object({
    startedAt: z.coerce.date(),
    submittedAt: z.coerce.date(),
    answers: z.array(answerSchema).min(1, "At least one answer is required"),
  })
  .strict();

module.exports = {
  createQuizSchema,
  updateQuizSchema,
  addQuestionSchema,
  updateQuestionSchema,
  submitSchema,
};

