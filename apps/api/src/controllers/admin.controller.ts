import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';

/** Admin-only: list every user (password hash omitted). */
export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    omit: { passwordHash: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
}

/** Admin-only: list every project across all owners. */
export async function listAllProjects(_req: Request, res: Response): Promise<void> {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json({ projects });
}
