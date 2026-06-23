import { prisma } from '../config/prisma';
import { env } from '../config/env';

/**
 * Standalone connectivity check — verifies MONGODB_URI without booting the API.
 * Run with:  npm run db:ping  (from apps/api)
 */
async function main(): Promise<void> {
  const masked = env.MONGODB_URI.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  console.log(`→ Connecting to ${masked}`);

  await prisma.$connect();
  const result = await prisma.$runCommandRaw({ ping: 1 });

  console.log('✅ Connected. Ping result:', result);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Could not connect to MongoDB:', err.message);
  process.exit(1);
});
