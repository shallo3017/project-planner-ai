import { Router } from 'express';
import {
  login,
  loginSchema,
  logout,
  me,
  refresh,
  register,
  registerSchema,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/register', validateBody(registerSchema), asyncHandler(register));
router.post('/login', validateBody(loginSchema), asyncHandler(login));
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', logout);
router.get('/me', requireAuth, asyncHandler(me));

export default router;
