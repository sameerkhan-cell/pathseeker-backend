const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkAccounts() {
  console.log("=== DB & API VERIFICATION FOR STUDENT VS GRADUATE ===");
  
  // 1. Direct DB query
  const users = await prisma.user.findMany({
    where: { email: { in: ["student@pathseeker.com", "graduate@pathseeker.com"] } },
    include: {
      profile: true,
      quizAttempts: { include: { quiz: { select: { title: true } } } },
      bookmarks: { include: { career: { select: { title: true } }, media: { select: { title: true } } } }
    }
  });

  for (const u of users) {
    console.log(`\n--- [${u.role}] ${u.name} (${u.email}) ---`);
    console.log(`Profile: Education=${u.profile?.educationLevel}, Institution=${u.profile?.institution}, Role=${u.profile?.currentRole}`);
    console.log(`Skills: ${u.profile?.skills}`);
    console.log(`Quiz Attempts (${u.quizAttempts.length}):`);
    u.quizAttempts.forEach(a => console.log(`  - Quiz: "${a.quiz?.title}", Score: ${a.score}/${a.totalQuestions * 10}, Date: ${a.completedAt.toISOString()}`));
    console.log(`Bookmarks (${u.bookmarks.length}):`);
    u.bookmarks.forEach(b => console.log(`  - Type: ${b.itemType}, Title: "${b.career?.title || b.media?.title || 'item'}"`));
  }

  // 2. API verification via HTTP
  console.log("\n=== HTTP API LOGIN & DATA FETCH ===");
  const accounts = [
    { email: "student@pathseeker.com", pass: "StudentPass123", role: "STUDENT" },
    { email: "graduate@pathseeker.com", pass: "GraduatePass123", role: "GRADUATE" }
  ];

  for (const acc of accounts) {
    try {
      const loginResp = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: acc.email, password: acc.pass })
      });
      const loginData = await loginResp.json();
      const token = loginData.data.token;
      const headers = { Authorization: `Bearer ${token}` };

      const [profResp, quizResp, bmResp] = await Promise.all([
        fetch("http://localhost:5000/api/profile/me", { headers }),
        fetch("http://localhost:5000/api/quiz/history", { headers }),
        fetch("http://localhost:5000/api/bookmarks", { headers })
      ]);

      const prof = await profResp.json();
      const quiz = await quizResp.json();
      const bm = await bmResp.json();

      console.log(`\nAPI Response for ${acc.role} (${acc.email}):`);
      console.log(`  Profile currentRole: "${prof.data.profile.currentRole}"`);
      console.log(`  Profile skills (${prof.data.profile.skills?.length}):`, prof.data.profile.skills);
      console.log(`  Quiz attempts count: ${quiz.data.attempts.length}`);
      if (quiz.data.attempts.length > 0) {
        console.log(`  Latest quiz score: ${quiz.data.attempts[0].score} (Quiz: "${quiz.data.attempts[0].quizTitle}")`);
      }
      const bookmarkList = bm.data.items || bm.data.bookmarks || [];
      console.log(`  Bookmarks count: ${bookmarkList.length}`);
      bookmarkList.forEach(b => console.log(`    * [${b.itemType}] ${b.title}`));
    } catch (e) {
      console.error(`Error fetching for ${acc.role}:`, e.message);
    }
  }

  await prisma.$disconnect();
}

checkAccounts();
