const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspectContent() {
  console.log("=== INSPECTING QUIZZES & MEDIA IN DB ===");
  
  const quizzes = await prisma.quiz.findMany({
    include: { questions: true }
  });
  console.log(`Found ${quizzes.length} Quizzes:`);
  quizzes.forEach(q => {
    console.log(`- Quiz #${q.id}: "${q.title}" (${q.category}, ${q.durationMinutes}m, status=${q.status}, questions=${q.questions.length})`);
    q.questions.forEach((qu, i) => {
      console.log(`   Q${i+1} [${qu.type}]: "${qu.questionText}"`);
      if (qu.type === 'SLIDER') {
        console.log(`      Range: ${qu.sliderMin} - ${qu.sliderMax} (step: ${qu.sliderStep})`);
      } else {
        console.log(`      Options: ${qu.options}`);
      }
    });
  });

  const media = await prisma.media.findMany();
  console.log(`\nFound ${media.length} Media items:`);
  media.forEach(m => {
    console.log(`- Media #${m.id}: [${m.type}] "${m.title}" (${m.category}, status=${m.status}, duration=${m.durationMinutes}m)`);
  });

  await prisma.$disconnect();
}

inspectContent();
