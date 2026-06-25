import { Router } from 'express';
import {
  getProjectDetail,
  getStats,
  listAllProjects,
  listUsers,
  updateProjectStatus,
  updateRoleSchema,
  updateStatusSchema,
  updateUserRole,
  updateUserStatus,
  updateUserStatusSchema,
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Everything under /api/admin requires a valid token AND the admin role.
router.use(requireAuth, requireRole('admin'));

router.get('/stats', asyncHandler(getStats));

router.get('/users', asyncHandler(listUsers));
router.patch('/users/:id/role', validateBody(updateRoleSchema), asyncHandler(updateUserRole));
router.patch(
  '/users/:id/status',
  validateBody(updateUserStatusSchema),
  asyncHandler(updateUserStatus),
);

router.get('/projects', asyncHandler(listAllProjects));
router.get('/projects/:id', asyncHandler(getProjectDetail));
router.patch(
  '/projects/:id/status',
  validateBody(updateStatusSchema),
  asyncHandler(updateProjectStatus),
);

export default router;
