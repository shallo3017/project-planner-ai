import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ApiError } from '../middleware/error.middleware';

// Mirrors the `projects` collection from the architecture doc (subset for now).
export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().optional(),
  description: z.string().optional(),
  budgetRange: z.string().optional(),
  targetCountries: z.array(z.string()).default([]),
  status: z
    .enum(['draft', 'in_review', 'approved', 'locked', 'archived'])
    .default('draft'),
});

export const updateProjectSchema = createProjectSchema.partial();

type ProjectInput = z.infer<typeof createProjectSchema>;

export async function listProjects(req: Request, res: Response): Promise<void> {
  const projects = await prisma.project.findMany({
    where: { ownerId: req.user!.sub },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ projects });
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ownerId: req.user!.sub },
  });
  // 404 (not 403) for someone else's project — don't reveal it exists.
  if (!project) throw new ApiError(404, 'Project not found');
  res.json({ project });
}

export async function createProject(req: Request, res: Response): Promise<void> {
  const project = await prisma.project.create({
    data: { ...(req.body as ProjectInput), ownerId: req.user!.sub },
  });
  res.status(201).json({ project });
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  // Scope the update to the owner via updateMany, then return the fresh row.
  const { count } = await prisma.project.updateMany({
    where: { id: req.params.id, ownerId: req.user!.sub },
    data: req.body as Partial<ProjectInput>,
  });
  if (count === 0) throw new ApiError(404, 'Project not found');

  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  res.json({ project });
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const { count } = await prisma.project.deleteMany({
    where: { id: req.params.id, ownerId: req.user!.sub },
  });
  if (count === 0) throw new ApiError(404, 'Project not found');
  res.status(204).send();
}
