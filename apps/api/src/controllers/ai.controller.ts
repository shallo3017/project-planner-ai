import type { Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../middleware/error.middleware';
import { AiDocumentModel } from '../models/AiDocument';
import { ProjectModel } from '../models/Project';
import { generatePrdTrd } from '../services/ai.service';
import type { ChatResult } from '../services/groq.service';

/** Upsert a generated doc, bumping its version and resetting approval. */
async function saveGeneratedDoc(
  projectId: string,
  docType: 'prd' | 'trd',
  result: ChatResult,
) {
  return AiDocumentModel.findOneAndUpdate(
    { projectId, docType },
    {
      $set: {
        content: result.content,
        generatedBy: env.GROQ_MODEL,
        tokensUsed: result.tokensUsed,
        isApproved: false, // a fresh generation needs re-approval
      },
      $inc: { version: 1 },
    },
    { upsert: true, new: true },
  );
}

/**
 * POST /api/ai/generate/:projectId
 * Generates (or regenerates) the project's PRD + TRD via Groq and stores them.
 * Only the project owner or an admin can generate; tech is read-only.
 */
export async function generateDocuments(req: Request, res: Response): Promise<void> {
  const project = await ProjectModel.findById(req.params.projectId);
  if (!project) throw new ApiError(404, 'Project not found');

  const { role, sub } = req.user!;
  const isOwner = String(project.ownerId) === sub;
  if (role !== 'admin' && !isOwner) {
    throw new ApiError(403, 'Only the project owner or an admin can generate documents');
  }

  // Calls Groq (throws 503 if GROQ_API_KEY is unset). May take a few seconds.
  const { prd, trd } = await generatePrdTrd({
    name: project.name,
    industry: project.industry,
    description: project.description,
    budgetRange: project.budgetRange,
    targetCountries: project.targetCountries,
  });

  const [prdDoc, trdDoc] = await Promise.all([
    saveGeneratedDoc(project.id, 'prd', prd),
    saveGeneratedDoc(project.id, 'trd', trd),
  ]);

  res.status(201).json({
    documents: [prdDoc, trdDoc],
    tokensUsed: prd.tokensUsed + trd.tokensUsed,
  });
}
