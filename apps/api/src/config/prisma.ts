import { PrismaClient } from '../generated/prisma';
import { env } from './env';

/**
 * Prisma client singleton. The connection URL is passed explicitly from our
 * validated env (loaded from the repo-root .env) so it doesn't depend on the
 * Prisma CLI's own .env discovery.
 */
export const prisma = new PrismaClient({
  datasourceUrl: env.MONGODB_URI,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
