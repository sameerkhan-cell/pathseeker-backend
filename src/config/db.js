// Lazy singleton PrismaClient
const { PrismaClient } = require("@prisma/client");
const { env } = require("./env");

const globalForPrisma = globalThis;
const prisma =
  globalForPrisma.__pathseekerPrisma ||
  new PrismaClient({
    log: env.isProd ? ["error"] : ["warn", "error"],
  });

if (!env.isProd) globalForPrisma.__pathseekerPrisma = prisma;

module.exports = { prisma };
