import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error.middleware';
import { AiDocumentModel } from '../models/AiDocument';
import { ProjectModel } from '../models/Project';

type DocType = 'prd' | 'trd';

export const updateDocumentSchema = z.object({
  content: z.string().min(1, 'content cannot be empty'),
});

function parseDocType(raw: string): DocType {
  if (raw !== 'prd' && raw !== 'trd') {
    throw new ApiError(400, "docType must be 'prd' or 'trd'");
  }
  return raw;
}

/**
 * Loads a project and enforces document-access rules:
 *   • admin  → any project
 *   • tech   → any project (read-only; approved docs only, see below)
 *   • client → only projects they own
 * Returns the project, or throws 404 (we don't reveal others' projects exist).
 */
async function loadAccessibleProject(req: Request) {
  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) throw new ApiError(404, 'Project not found');

  const { role, sub } = req.user!;
  const isOwner = String(project.ownerId) === sub;
  if (role === 'admin' || role === 'tech' || isOwner) return project;

  throw new ApiError(404, 'Project not found');
}

/** Tech users are limited to approved documents (read-only reviewer role). */
function approvedOnlyFor(req: Request): boolean {
  return req.user!.role === 'tech';
}

/** GET /api/documents/:projectId — list the project's PRD + TRD. */
export async function listDocuments(req: Request, res: Response): Promise<void> {
  await loadAccessibleProject(req);
  const filter: Record<string, unknown> = { projectId: req.params.projectId };
  if (approvedOnlyFor(req)) filter.isApproved = true;

  const documents = await AiDocumentModel.find(filter).sort({ docType: 1 });
  res.json({ documents });
}

/** GET /api/documents/:projectId/:docType — fetch one document's JSON. */
export async function getDocument(req: Request, res: Response): Promise<void> {
  await loadAccessibleProject(req);
  const docType = parseDocType(req.params.docType);

  const document = await AiDocumentModel.findOne({ projectId: req.params.projectId, docType });
  if (!document || (approvedOnlyFor(req) && !document.isApproved)) {
    throw new ApiError(404, 'Document not found');
  }
  res.json({ document });
}

/**
 * GET /api/documents/:projectId/:docType/download — download as a Markdown file.
 * This is what the tech (and owner/admin) role uses to pull the PRD/TRD.
 */
export async function downloadDocument(req: Request, res: Response): Promise<void> {
  const project = await loadAccessibleProject(req);
  const docType = parseDocType(req.params.docType);

  const document = await AiDocumentModel.findOne({ projectId: req.params.projectId, docType });
  if (!document || (approvedOnlyFor(req) && !document.isApproved)) {
    throw new ApiError(404, 'Document not found');
  }

  // content is Mixed: markdown string in the common case, else serialize JSON.
  const body =
    typeof document.content === 'string'
      ? document.content
      : JSON.stringify(document.content, null, 2);

  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const filename = `${slug}-${docType}.md`;

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
}

/**
 * PATCH /api/documents/:id/approve — mark a document approved (client sign-off).
 * Only the owning client or an admin may approve; tech is read-only.
 */
export async function approveDocument(req: Request, res: Response): Promise<void> {
  const document = await AiDocumentModel.findById(req.params.id);
  if (!document) throw new ApiError(404, 'Document not found');

  const project = await ProjectModel.findById(document.projectId);
  if (!project) throw new ApiError(404, 'Document not found');

  const { role, sub } = req.user!;
  const isOwner = String(project.ownerId) === sub;
  if (role !== 'admin' && !isOwner) {
    throw new ApiError(403, 'Only the project owner or an admin can approve documents');
  }

  document.isApproved = true;
  await document.save();
  res.json({ document });
}

/**
 * PATCH /api/documents/:id — edit a document's content. Owner or admin only
 * (tech is read-only). Editing clears approval, so it must be re-approved.
 */
export async function updateDocument(req: Request, res: Response): Promise<void> {
  const { content } = req.body as z.infer<typeof updateDocumentSchema>;

  const document = await AiDocumentModel.findById(req.params.id);
  if (!document) throw new ApiError(404, 'Document not found');

  const project = await ProjectModel.findById(document.projectId);
  if (!project) throw new ApiError(404, 'Document not found');

  const { role, sub } = req.user!;
  const isOwner = String(project.ownerId) === sub;
  if (role !== 'admin' && !isOwner) {
    throw new ApiError(403, 'Only the project owner or an admin can edit documents');
  }

  document.content = content;
  document.isApproved = false; // edited content needs re-approval
  await document.save();
  res.json({ document });
}
