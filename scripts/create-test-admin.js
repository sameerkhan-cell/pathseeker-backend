// Creates or updates a verified ADMIN test account for development/QA
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

async function main() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash("Admin0pass123", 10);
  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: { role: "ADMIN", isEmailVerified: true, passwordHash },
    create: {
      name: "Test Admin",
      email: "admin@test.com",
      passwordHash,
      role: "ADMIN",
      isEmailVerified: true,
      profile: { create: {} },
    },
  });
  console.log("admin@test.com ready");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
