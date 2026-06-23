import { prisma } from './prisma';

/**
 * Opens the Prisma connection to MongoDB. Express + Socket.IO share this one
 * client for the process lifetime.
 */
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.log('✅ MongoDB connected (Prisma)');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
