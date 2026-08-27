// Quick DB connectivity test
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();

async function main() {
  try {
    const result = await p.$queryRaw`SELECT 1+1 AS result`;
    console.log('✅ DB connection OK:', JSON.stringify(result));
  } catch (e) {
    console.error('❌ DB connection FAILED:', e.message);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
}

main();
