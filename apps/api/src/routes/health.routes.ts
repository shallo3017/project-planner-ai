import { Router } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

/** Liveness + DB readiness probe. */
router.get('/', async (_req, res) => {
  let db = 'connected';
  try {
    // Cheap round-trip to confirm the Mongo connection is live.
    await prisma.$runCommandRaw({ ping: 1 });
  } catch {
    db = 'disconnected';
  }
  res.json({ status: 'ok', uptime: process.uptime(), db });
});

export default router;
