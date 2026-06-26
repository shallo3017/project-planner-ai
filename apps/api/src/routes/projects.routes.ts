import { Router } from 'express';
import {
  createProject,
  createProjectSchema,
  deleteProject,
  finalizeProject,
  getProject,
  listProjects,
  updateProject,
  updateProjectSchema,
} from '../controllers/projects.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Every project route requires a valid access token. Applied once here so
// each handler below can assume req.user is set and scope data to the owner.
router.use(requireAuth);

router.get('/', asyncHandler(listProjects));
router.post('/', validateBody(createProjectSchema), asyncHandler(createProject));
router.get('/:id', asyncHandler(getProject));
router.patch('/:id', validateBody(updateProjectSchema), asyncHandler(updateProject));
router.post('/:id/finalize', asyncHandler(finalizeProject));
router.delete('/:id', asyncHandler(deleteProject));

export default router;
