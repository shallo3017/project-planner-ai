import { Router } from 'express';
import { generateDocuments } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

// Synchronous generation: returns the saved PRD + TRD when Groq finishes.
router.post('/generate/:projectId', asyncHandler(generateDocuments));

export default router;
