import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error.middleware';
import { AiDocumentModel } from '../models/AiDocument';
import { ProjectModel } from '../models/Project';
import { UserModel } from '../models/User';

// ── Validation schemas ───────────────────────────────────────────────────────
export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'in_review', 'approved', 'locked', 'archived']),
});

export const updateRoleSchema = z.object({
  role: z.enum(['client', 'admin', 'tech']),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

// ── Overview ─────────────────────────────────────────────────────────────────
/** Admin-only: aggregated counts for the dashboard overview. */
export async function getStats(_req: Request, res: Response): Promise<void> {
  const [userAgg, projAgg, docTotal, docApproved] = await Promise.all([
    UserModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ProjectModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    AiDocumentModel.countDocuments(),
    AiDocumentModel.countDocuments({ isApproved: true }),
  ]);

  const users: Record<string, number> = { total: 0, client: 0, admin: 0, tech: 0 };
  for (const r of userAgg) {
    users[r._id as string] = r.count as number;
    users.total += r.count as number;
  }

  const projects: Record<string, number> = {
    total: 0,
    draft: 0,
    in_review: 0,
    approved: 0,
    locked: 0,
    archived: 0,
  };
  for (const r of projAgg) {
    projects[r._id as string] = r.count as number;
    projects.total += r.count as number;
  }

  res.json({ users, projects, documents: { total: docTotal, approved: docApproved } });
}

// ── Users ────────────────────────────────────────────────────────────────────
/** Admin-only: list every user (password hash omitted). */
export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await UserModel.find().select('-passwordHash').sort({ createdAt: -1 });
  res.json({ users });
}

/** Admin-only: change a user's role, never leaving the system without an admin. */
export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const { role } = req.body as z.infer<typeof updateRoleSchema>;
  const target = await UserModel.findById(req.params.id);
  if (!target) throw new ApiError(404, 'User not found');

  if (target.role === 'admin' && role !== 'admin') {
    const adminCount = await UserModel.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new ApiError(400, 'Cannot demote the last remaining admin');
    }
  }

  target.role = role;
  await target.save();
  res.json({ user: target.toJSON() });
}

/** Admin-only: suspend / reactivate a user (toggles isActive). */
export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const { isActive } = req.body as z.infer<typeof updateUserStatusSchema>;
  const target = await UserModel.findById(req.params.id);
  if (!target) throw new ApiError(404, 'User not found');

  // Don't allow suspending the last active admin (would lock everyone out).
  if (target.role === 'admin' && !isActive) {
    const activeAdmins = await UserModel.countDocuments({ role: 'admin', isActive: true });
    if (activeAdmins <= 1) {
      throw new ApiError(400, 'Cannot suspend the last active admin');
    }
  }

  target.isActive = isActive;
  await target.save();
  res.json({ user: target.toJSON() });
}

// ── Projects ─────────────────────────────────────────────────────────────────
/** Admin-only: list every project across all owners (with owner name/email). */
export async function listAllProjects(_req: Request, res: Response): Promise<void> {
  const projects = await ProjectModel.find()
    .populate('ownerId', 'fullName email')
    .sort({ createdAt: -1 });
  res.json({ projects });
}

/** Admin-only: change any project's status (e.g. approve / lock / archive). */
export async function updateProjectStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body as z.infer<typeof updateStatusSchema>;
  const project = await ProjectModel.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true },
  ).populate('ownerId', 'fullName email');
  if (!project) throw new ApiError(404, 'Project not found');
  res.json({ project });
}
