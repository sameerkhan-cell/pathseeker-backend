const { prisma } = require("../../config/db");
const { asyncHandler } = require("../../middlewares/error.middleware");
const { paginationMeta } = require("../../utils/pagination");
const service = require("./quiz.service");

// ================= Admin =================

const createQuiz = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.create({ data: req.body });
  res.status(201).json({ success: true, message: "Quiz created", data: { quiz } });
});

const updateQuiz = asyncHandler(async (req, res) => {
  const existing = await prisma.quiz.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ success: false, message: "Quiz not found" });
  const quiz = await prisma.quiz.update({ where: { id: existing.id }, data: req.body });
  res.json({ success: true, message: "Quiz updated", data: { quiz } });
});

// Admin view - includes weights/scoring info
const addQuestion = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: Number(req.params.id) } });
  if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

  const data = { ...req.body, quizId: quiz.id };
  // SLIDER questions have no options - store empty JSON array (column is NOT NULL)
  data.options = JSON.stringify(data.options || []);
  const question = await prisma.quizQuestion.create({ data });

  res.status(201).json({
    success: true,
    message: "Question added",
    data: { question: { ...question, options: JSON.parse(question.options || "[]") } },
  });
});

async function loadOwnedQuestion(req, res) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: Number(req.params.questionId) },
  });
  if (!question) {
    res.status(404).json({ success: false, message: "Question not found" });
    return null;
  }
  return question;
}

const updateQuestion = asyncHandler(async (req, res) => {
  const question = await loadOwnedQuestion(req, res);
  if (!question) return;

  const data = { ...req.body };
  if (data.options) data.options = JSON.stringify(data.options);
  const updated = await prisma.quizQuestion.update({ where: { id: question.id }, data });

  res.json({
    success: true,
    message: "Question updated",
    data: { question: { ...updated, options: JSON.parse(updated.options || "[]") } },
  });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await loadOwnedQuestion(req, res);
  if (!question) return;
  await prisma.quizQuestion.delete({ where: { id: question.id } });
  res.json({ success: true, message: "Question deleted" });
});

const listQuestionsAdmin = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: Number(req.params.id) },
    include: { questions: { orderBy: [{ order: "asc" }, { id: "asc" }] } },
  });
  if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

  // Admin view: full options with weights
  res.json({
    success: true,
    data: {
      quiz: { id: quiz.id, title: quiz.title, status: quiz.status, durationMinutes: quiz.durationMinutes },
      questions: quiz.questions.map((q) => ({ ...q, options: JSON.parse(q.options || "[]") })),
    },
  });
});

// ================= Public (any logged-in user) =================

const listActiveQuizzes = asyncHandler(async (_req, res) => {
  const quizzes = await prisma.quiz.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  res.json({
    success: true,
    data: {
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        category: q.category,
        durationMinutes: q.durationMinutes,
        questionCount: q._count.questions,
      })),
    },
  });
});

// Start: returns questions WITHOUT any weight/scoring info
function sanitizeQuestion(q) {
  return {
    id: q.id,
    type: q.type,
    questionText: q.questionText,
    order: q.order,
    ...(q.type === "SLIDER"
      ? { sliderMin: q.sliderMin, sliderMax: q.sliderMax, sliderStep: q.sliderStep }
      : { options: JSON.parse(q.options || "[]").map(({ id, text }) => ({ id, text })) }),
  };
}

const startQuiz = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findFirst({
    where: { id: Number(req.params.id), status: "PUBLISHED" },
    include: { questions: { orderBy: [{ order: "asc" }, { id: "asc" }] } },
  });
  if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found or not published" });

  res.json({
    success: true,
    data: {
      quiz: { id: quiz.id, title: quiz.title, description: quiz.description, durationMinutes: quiz.durationMinutes },
      questions: quiz.questions.map(sanitizeQuestion),
    },
  });
});

const submitQuiz = asyncHandler(async (req, res) => {
  const result = await service.submitAttempt({
    userId: req.user ? Number(req.user.id) : null,
    quizId: Number(req.params.id),
    startedAt: req.body.startedAt,
    submittedAt: req.body.submittedAt,
    answers: req.body.answers,
  });
  if (result.error) {
    return res.status(result.error.status).json({ success: false, message: result.error.message });
  }
  res.status(201).json({ success: true, message: "Attempt submitted", data: { attempt: result.attempt } });
});

const getHistory = asyncHandler(async (req, res) => {
  const where = { userId: Number(req.user.id) };
  const [attempts, total] = await Promise.all([
    prisma.quizAttempt.findMany({
      where,
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
      orderBy: { completedAt: "desc" },
      include: { quiz: { select: { title: true } } },
    }),
    prisma.quizAttempt.count({ where }),
  ]);
  res.json({
    success: true,
    data: {
      attempts: attempts.map((a) => ({
        id: a.id,
        quizId: a.quizId,
        quizTitle: a.quiz.title,
        score: a.score,
        totalQuestions: a.totalQuestions,
        timedOut: a.timedOut,
        completedAt: a.completedAt,
      })),
      pagination: paginationMeta(req.query.page, req.query.limit, total),
    },
  });
});

const getAttempt = asyncHandler(async (req, res) => {
  const attemptId = req.params.attemptId;

  // Guest attempt lookup
  if (typeof attemptId === "string" && attemptId.startsWith("guest-")) {
    const guest = service.getGuestAttempt(attemptId);
    if (!guest) return res.status(404).json({ success: false, message: "Attempt not found" });
    return res.json({ success: true, data: { attempt: guest } });
  }

  // Authenticated user lookup
  const where = req.user
    ? { id: Number(attemptId), userId: Number(req.user.id) }
    : { id: Number(attemptId) };

  const attempt = await prisma.quizAttempt.findFirst({
    where,
    include: { quiz: { select: { title: true } } },
  });

  if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });

  res.json({
    success: true,
    data: {
      attempt: {
        id: attempt.id,
        quizId: attempt.quizId,
        quizTitle: attempt.quiz.title,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        recommendations: JSON.parse(attempt.recommendations || "{}"),
        timedOut: attempt.timedOut,
        completedAt: attempt.completedAt,
      },
    },
  });
});

module.exports = {
  createQuiz,
  updateQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  listQuestionsAdmin,
  listActiveQuizzes,
  startQuiz,
  submitQuiz,
  getHistory,
  getAttempt,
};
