const { prisma } = require("../../config/db");

// ================= Scoring & recommendation rules (documented) =================
//
// WEIGHTS:
// - MULTIPLE_CHOICE / LIKERT: score contribution = the selected option's `weight`
//   (set by admin per option; range -100..100).
// - SLIDER: normalized position (value-min)/(max-min), contribution =
//   round(normalized * 10). So each slider question contributes 0..10 points.
//
// RECOMMENDATIONS (rule-based brackets on percentage score):
//   pct >= 80  -> ["Engineering", "Data"]          ("strong analytic/technical fit")
//   pct >= 60  -> ["Engineering"]
//   pct >= 40  -> ["Business", "Design"]
//   pct >= 20  -> ["Design"]
//   else       -> [] with hint "explore all domains"
// These are intentionally simple, deterministic, and NOT AI-generated.

const GRACE_BUFFER_SECONDS = 10;
const guestAttempts = new Map();

function parseOptions(question) {
  return JSON.parse(question.options || "[]");
}

function computeScore(questions, answers) {
  let score = 0;
  const maxScore = questions.reduce((sum, q) => {
    if (q.type === "SLIDER") return sum + 10;
    return sum + Math.max(...parseOptions(q).map((o) => o.weight), 0);
  }, 0);

  const detail = [];
  for (const ans of answers) {
    const q = questions.find((x) => x.id === ans.questionId);
    if (!q) continue; // rejected earlier by validation
    if (q.type === "SLIDER") {
      const range = (q.sliderMax ?? 100) - (q.sliderMin ?? 0);
      const normalized = range === 0 ? 0 : (ans.sliderValue - (q.sliderMin ?? 0)) / range;
      const points = Math.round(normalized * 10);
      score += points;
      detail.push({ questionId: q.id, type: q.type, sliderValue: ans.sliderValue, points });
    } else {
      const opt = parseOptions(q).find((o) => o.id === ans.selectedOptionId);
      const weight = opt ? opt.weight : 0;
      score += weight;
      detail.push({ questionId: q.id, type: q.type, selectedOptionId: ans.selectedOptionId, points: weight });
    }
  }
  return { score, maxScore, detail };
}

function recommend(scorePercent) {
  // Bracket mapping - see header comment. Deterministic rule-based only.
  if (scorePercent >= 80) {
    return { domains: ["Engineering", "Data"], note: "Strong technical/analytic fit" };
  }
  if (scorePercent >= 60) {
    return { domains: ["Engineering"], note: "Good technical fit" };
  }
  if (scorePercent >= 40) {
    return { domains: ["Business", "Design"], note: "People-oriented and creative fit" };
  }
  if (scorePercent >= 20) {
    return { domains: ["Design"], note: "Creative fit" };
  }
  return { domains: [], note: "Explore all domains to find your interest" };
}

/**
 * Late-submission decision (documented): we ACCEPT submissions that exceed the
 * allowed duration but flag them `timedOut: true` instead of hard-rejecting.
 */
async function submitAttempt({ userId, quizId, startedAt, submittedAt, answers }) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, status: "PUBLISHED" },
    include: { questions: true },
  });
  if (!quiz) return { error: { status: 404, message: "Quiz not found or not published" } };

  const questionIds = new Set(quiz.questions.map((q) => q.id));
  for (const a of answers) {
    if (!questionIds.has(a.questionId)) {
      return { error: { status: 400, message: `Question ${a.questionId} does not belong to this quiz` } };
    }
  }

  // Validate options/sliders belong to their questions
  for (const a of answers) {
    const q = quiz.questions.find((x) => x.id === a.questionId);
    if (!q) continue;
    if (q.type === "SLIDER") {
      const min = q.sliderMin ?? 0;
      const max = q.sliderMax ?? 100;
      if (a.sliderValue < min || a.sliderValue > max) {
        return { error: { status: 400, message: `sliderValue out of range for question ${q.id}` } };
      }
    } else {
      const valid = parseOptions(q).some((o) => o.id === a.selectedOptionId);
      if (!valid) {
        return { error: { status: 400, message: `Option "${a.selectedOptionId}" does not belong to question ${q.id}` } };
      }
    }
  }

  const startTime = new Date(startedAt).getTime();
  const submitTime = new Date(submittedAt).getTime();
  const elapsedSeconds = Math.max(0, Math.round((submitTime - startTime) / 1000));
  const allowedSeconds = quiz.durationMinutes * 60 + GRACE_BUFFER_SECONDS;
  const timedOut = elapsedSeconds > allowedSeconds;

  const { score, maxScore, detail } = computeScore(quiz.questions, answers);
  const pct = maxScore > 0 ? Math.round((Math.max(score, 0) / maxScore) * 100) : 0;
  const recommendations = recommend(pct);

  if (userId) {
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        answers: JSON.stringify({ detail, timedOut }),
        score: Math.max(score, 0),
        totalQuestions: quiz.questions.length,
        recommendations: JSON.stringify(recommendations),
        timedOut,
      },
    });

    return {
      attempt: {
        id: attempt.id,
        quizId,
        quizTitle: quiz.title,
        score: Math.max(score, 0),
        maxScore,
        percent: pct,
        totalQuestions: quiz.questions.length,
        timedOut,
        recommendations,
        completedAt: attempt.completedAt,
      },
    };
  }

  // Guest submission (unauthenticated public entry)
  const guestId = "guest-" + Date.now();
  const guestAttempt = {
    id: guestId,
    quizId,
    quizTitle: quiz.title,
    score: Math.max(score, 0),
    maxScore,
    percent: pct,
    totalQuestions: quiz.questions.length,
    timedOut,
    recommendations,
    completedAt: new Date().toISOString(),
    isGuest: true,
  };
  guestAttempts.set(guestId, guestAttempt);

  return { attempt: guestAttempt };
}

function getGuestAttempt(id) {
  return guestAttempts.get(id) || null;
}

module.exports = { 
  submitAttempt, 
  getGuestAttempt, 
  parseOptions, 
  recommend, 
  computeScore, 
  GRACE_BUFFER_SECONDS 
};
