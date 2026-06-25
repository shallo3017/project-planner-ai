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
/** Estimate a project's value from its budget range (e.g. "$10k–$50k" → 30000).
 *  There's no billing system yet, so this is a derived "pipeline" estimate. */
function budgetMidpoint(range?: string | null): number {
  if (!range) return 0;
  const nums = (range.match(/\d+/g) || []).map(Number);
  if (nums.length === 0) return 0;
  if (range.includes('+')) return nums[0] * 1000 * 1.5; // "$100k+" → 150k
  if (nums.length >= 2) return ((nums[0] + nums[1]) / 2) * 1000;
  return nums[0] * 1000;
}

/** Admin-only: aggregated metrics for the analytics dashboard. */
export async function getStats(_req: Request, res: Response): Promise<void> {
  const [userAgg, projectDocs, docTotal, docApproved] = await Promise.all([
    UserModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ProjectModel.find().select('status industry budgetRange createdAt').lean(),
    AiDocumentModel.countDocuments(),
    AiDocumentModel.countDocuments({ isApproved: true }),
  ]);

  const users: Record<string, number> = { total: 0, client: 0, admin: 0, tech: 0 };
  for (const r of userAgg) {
    users[r._id as string] = r.count as number;
    users.total += r.count as number;
  }

  // Projects by status
  const projects: Record<string, number> = {
    total: projectDocs.length,
    draft: 0,
    in_review: 0,
    approved: 0,
    locked: 0,
    archived: 0,
  };

  // Derived revenue (estimated pipeline value) + breakdown by industry
  let estimatedTotal = 0;
  const byIndustry = new Map<string, number>();

  // Projects created per month, last 6 months
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en', { month: 'short' }), value: 0 };
  });
  const monthIdx = new Map(months.map((m, i) => [m.key, i]));

  for (const p of projectDocs) {
    projects[p.status as string] = (projects[p.status as string] ?? 0) + 1;

    const value = budgetMidpoint(p.budgetRange);
    estimatedTotal += value;
    const industry = p.industry || 'Other';
    byIndustry.set(industry, (byIndustry.get(industry) ?? 0) + value);

    const d = new Date(p.createdAt as unknown as string);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const i = monthIdx.get(k);
    if (i !== undefined) months[i].value += 1;
  }

  res.json({
    users,
    projects,
    documents: { total: docTotal, approved: docApproved },
    revenue: {
      estimatedTotal,
      byIndustry: [...byIndustry]
        .map(([name, value]) => ({ name, value }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value),
    },
    projectsByMonth: months.map(({ label, value }) => ({ name: label, value })),
  });
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

/** Admin-only: a single project (owner populated) plus its generated documents. */
export async function getProjectDetail(req: Request, res: Response): Promise<void> {
  const project = await ProjectModel.findById(req.params.id).populate('ownerId', 'fullName email');
  if (!project) throw new ApiError(404, 'Project not found');
  const documents = await AiDocumentModel.find({ projectId: project.id }).sort({ docType: 1 });
  res.json({ project, documents });
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
