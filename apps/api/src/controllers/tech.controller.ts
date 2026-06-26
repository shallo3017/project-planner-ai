import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error.middleware';
import { AiDocumentModel } from '../models/AiDocument';
import { MilestoneModel } from '../models/Milestone';
import { ProjectModel } from '../models/Project';
import { TaskModel } from '../models/Task';

// Projects the tech team works on: approved (ready) or locked (finalised).
const REVIEW_STATUSES = ['approved', 'locked'];

/** GET /api/tech/projects — approved/finalised projects across the platform. */
export async function listReviewProjects(_req: Request, res: Response): Promise<void> {
  const projects = await ProjectModel.find({ status: { $in: REVIEW_STATUSES } })
    .populate('ownerId', 'fullName email')
    .sort({ updatedAt: -1 });
  res.json({ projects });
}

/**
 * GET /api/tech/projects/:projectId — one project with its approved documents,
 * tasks, and milestones. Tech sees approved docs only; admin sees all.
 */
export async function getReviewProject(req: Request, res: Response): Promise<void> {
  const project = await ProjectModel.findById(req.params.projectId).populate(
    'ownerId',
    'fullName email',
  );
  if (!project) throw new ApiError(404, 'Project not found');

  const docFilter: Record<string, unknown> = { projectId: project._id };
  if (req.user!.role === 'tech') docFilter.isApproved = true;

  const [documents, tasks, milestones] = await Promise.all([
    AiDocumentModel.find(docFilter).sort({ docType: 1 }),
    TaskModel.find({ projectId: project._id }).sort({ order: 1, createdAt: 1 }),
    MilestoneModel.find({ projectId: project._id }).sort({ order: 1, dueDate: 1 }),
  ]);

  res.json({ project, documents, tasks, milestones });
}

// ── Tasks ────────────────────────────────────────────────────────────────────
export const taskCreateSchema = z.object({ title: z.string().min(1).max(200) });
export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  order: z.number().int().min(0).optional(),
});

export async function createTask(req: Request, res: Response): Promise<void> {
  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) throw new ApiError(404, 'Project not found');
  const { title } = req.body as z.infer<typeof taskCreateSchema>;
  const count = await TaskModel.countDocuments({ projectId: project._id });
  const task = await TaskModel.create({ projectId: project._id, title, order: count });
  res.status(201).json({ task });
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const task = await TaskModel.findByIdAndUpdate(
    req.params.taskId,
    req.body as z.infer<typeof taskUpdateSchema>,
    { new: true, runValidators: true },
  );
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ task });
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const result = await TaskModel.findByIdAndDelete(req.params.taskId);
  if (!result) throw new ApiError(404, 'Task not found');
  res.status(204).send();
}

// ── Milestones ───────────────────────────────────────────────────────────────
export const milestoneCreateSchema = z.object({
  title: z.string().min(1).max(200),
  dueDate: z.coerce.date().nullable().optional(),
});
export const milestoneUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  status: z.enum(['pending', 'done']).optional(),
  order: z.number().int().min(0).optional(),
});

export async function createMilestone(req: Request, res: Response): Promise<void> {
  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) throw new ApiError(404, 'Project not found');
  const { title, dueDate } = req.body as z.infer<typeof milestoneCreateSchema>;
  const count = await MilestoneModel.countDocuments({ projectId: project._id });
  const milestone = await MilestoneModel.create({
    projectId: project._id,
    title,
    dueDate: dueDate ?? null,
    order: count,
  });
  res.status(201).json({ milestone });
}

export async function updateMilestone(req: Request, res: Response): Promise<void> {
  const milestone = await MilestoneModel.findByIdAndUpdate(
    req.params.milestoneId,
    req.body as z.infer<typeof milestoneUpdateSchema>,
    { new: true, runValidators: true },
  );
  if (!milestone) throw new ApiError(404, 'Milestone not found');
  res.json({ milestone });
}

export async function deleteMilestone(req: Request, res: Response): Promise<void> {
  const result = await MilestoneModel.findByIdAndDelete(req.params.milestoneId);
  if (!result) throw new ApiError(404, 'Milestone not found');
  res.status(204).send();
}
