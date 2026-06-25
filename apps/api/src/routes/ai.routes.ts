import { Router } from 'express';
import {
  chat,
  chatExtract,
  chatSchema,
  generateDocuments,
} from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

// Synchronous generation: returns the saved PRD + TRD when Groq finishes.
router.post('/generate/:projectId', asyncHandler(generateDocuments));

// Chatbot intake.
router.post('/chat', validateBody(chatSchema), asyncHandler(chat));
router.post('/chat/extract', validateBody(chatSchema), asyncHandler(chatExtract));

export default router;
