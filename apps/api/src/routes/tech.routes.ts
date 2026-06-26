import { Router } from 'express';
import {
  createMilestone,
  createTask,
  deleteMilestone,
  deleteTask,
  getReviewProject,
  listReviewProjects,
  milestoneCreateSchema,
  milestoneUpdateSchema,
  taskCreateSchema,
  taskUpdateSchema,
  updateMilestone,
  updateTask,
} from '../controllers/tech.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// The tech team workspace: reviewers (tech) and admins.
router.use(requireAuth, requireRole('tech', 'admin'));

router.get('/projects', asyncHandler(listReviewProjects));
router.get('/projects/:projectId', asyncHandler(getReviewProject));

router.post('/projects/:projectId/tasks', validateBody(taskCreateSchema), asyncHandler(createTask));
router.patch('/tasks/:taskId', validateBody(taskUpdateSchema), asyncHandler(updateTask));
router.delete('/tasks/:taskId', asyncHandler(deleteTask));

router.post(
  '/projects/:projectId/milestones',
  validateBody(milestoneCreateSchema),
  asyncHandler(createMilestone),
);
router.patch(
  '/milestones/:milestoneId',
  validateBody(milestoneUpdateSchema),
  asyncHandler(updateMilestone),
);
router.delete('/milestones/:milestoneId', asyncHandler(deleteMilestone));

export default router;
