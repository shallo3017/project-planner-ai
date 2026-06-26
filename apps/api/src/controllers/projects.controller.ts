import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error.middleware';
import { ProjectModel } from '../models/Project';

// Mirrors the `projects` collection from the architecture doc (subset for now).
export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().optional(),
  description: z.string().optional(),
  budgetRange: z.string().optional(),
  deadline: z.coerce.date().nullable().optional(),
  targetCountries: z.array(z.string()).default([]),
  status: z
    .enum(['draft', 'in_review', 'approved', 'locked', 'archived'])
    .default('draft'),
});

export const updateProjectSchema = createProjectSchema.partial();

type ProjectInput = z.infer<typeof createProjectSchema>;

export async function listProjects(req: Request, res: Response): Promise<void> {
  const projects = await ProjectModel.find({ ownerId: req.user!.sub }).sort({
    createdAt: -1,
  });
  res.json({ projects });
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const project = await ProjectModel.findOne({
    _id: req.params.id,
    ownerId: req.user!.sub,
  });
  // 404 (not 403) for someone else's project — don't reveal it exists.
  if (!project) throw new ApiError(404, 'Project not found');
  res.json({ project });
}

export async function createProject(req: Request, res: Response): Promise<void> {
  const project = await ProjectModel.create({
    ...(req.body as ProjectInput),
    ownerId: req.user!.sub,
  });
  res.status(201).json({ project });
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const existing = await ProjectModel.findOne({ _id: req.params.id, ownerId: req.user!.sub });
  if (!existing) throw new ApiError(404, 'Project not found');

  // Finalised projects are frozen — the client cannot edit them anymore.
  if (existing.status === 'locked') {
    throw new ApiError(409, 'Project is finalised and locked — no further edits allowed');
  }

  const project = await ProjectModel.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user!.sub },
    req.body as Partial<ProjectInput>,
    { new: true, runValidators: true },
  );
  res.json({ project });
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const existing = await ProjectModel.findOne({ _id: req.params.id, ownerId: req.user!.sub });
  if (!existing) throw new ApiError(404, 'Project not found');
  if (existing.status === 'locked') {
    throw new ApiError(409, 'Project is finalised and locked — it cannot be deleted');
  }
  await ProjectModel.deleteOne({ _id: existing._id });
  res.status(204).send();
}

/**
 * POST /api/projects/:id/finalize — client sign-off. Locks the project so no
 * further edits, deletes, or regenerations are possible (admin can unlock).
 */
export async function finalizeProject(req: Request, res: Response): Promise<void> {
  const project = await ProjectModel.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user!.sub },
    { status: 'locked' },
    { new: true },
  );
  if (!project) throw new ApiError(404, 'Project not found');
  res.json({ project });
}
