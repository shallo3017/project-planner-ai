import { Router } from 'express';
import {
  approveDocument,
  downloadDocument,
  getDocument,
  listDocuments,
  listMyDocuments,
  updateDocument,
  updateDocumentSchema,
} from '../controllers/documents.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All document routes require a valid token. Per-role access (owner / admin /
// tech-approved-only) is enforced inside the controller.
router.use(requireAuth);

router.get('/', asyncHandler(listMyDocuments));
router.patch('/:id/approve', asyncHandler(approveDocument));
router.patch('/:id', validateBody(updateDocumentSchema), asyncHandler(updateDocument));
router.get('/:projectId', asyncHandler(listDocuments));
router.get('/:projectId/:docType/download', asyncHandler(downloadDocument));
router.get('/:projectId/:docType', asyncHandler(getDocument));

export default router;
