import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';

const BCRYPT_ROUNDS = 12;

/**
 * Creates (or promotes) an admin user. Admins can't be created through the
 * public /register route — run this script instead.
 *
 *   npm run create:admin -- <email> <password> [full name]
 *
 * If a user with that email already exists, it is promoted to admin and its
 * password is reset to the one provided.
 */
async function main(): Promise<void> {
  const [email, password, ...nameParts] = process.argv.slice(2);
  const fullName = nameParts.join(' ') || 'Admin';

  if (!email || !password) {
    console.error('Usage: npm run create:admin -- <email> <password> [full name]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters.');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Upsert: promote + reset password if the email exists, else create fresh.
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { role: 'admin', passwordHash, isActive: true },
    create: {
      fullName,
      email: normalizedEmail,
      passwordHash,
      role: 'admin',
      isActive: true,
    },
  });

  console.log(`✅ Admin ready: ${user.email} (id: ${user.id})`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to create admin:', err.message);
  process.exit(1);
});
