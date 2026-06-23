import { Router } from 'express';
import { listAllProjects, listUsers } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Everything under /api/admin requires a valid token AND the admin role.
router.use(requireAuth, requireRole('admin'));

router.get('/users', asyncHandler(listUsers));
router.get('/projects', asyncHandler(listAllProjects));

export default router;
