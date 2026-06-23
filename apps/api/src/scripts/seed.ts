import { connectDatabase, disconnectDatabase } from '../config/db';
import { seedDemoData } from '../services/seed.service';

/**
 * Standalone idempotent seed — run on demand:  npm run seed  (from apps/api)
 * (The API also seeds automatically on dev startup unless SEED_DEMO=false.)
 */
async function main(): Promise<void> {
  await connectDatabase();
  await seedDemoData();
  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
