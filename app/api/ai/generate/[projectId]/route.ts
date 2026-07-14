import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/server/auth';
import { connectDB } from '@/server/db';
import { env } from '@/server/env';
import { ApiError, handler, parseBody } from '@/server/http';
import { AiDocumentModel, DOC_TYPES, type DocType } from '@/server/models/AiDocument';
import { ProjectModel } from '@/server/models/Project';
import { TemplateModel } from '@/server/models/Template';
import { generateDocs, type DocTemplate } from '@/server/services/ai.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // AI generation can take a while

const generateSchema = z.object({
  features: z.array(z.string().min(1).max(120)).max(30).optional(),
  docTypes: z.array(z.enum(DOC_TYPES)).min(1).max(DOC_TYPES.length).optional(),
  // When regenerating a single edited doc, its current content to revise from.
  baseContent: z.string().max(60000).optional(),
});
const DEFAULT_DOC_TYPES: DocType[] = ['prd', 'trd'];

export const POST = handler<{ params: { projectId: string } }>(async (req, { params }) => {
  await connectDB();
  const { role, sub } = requireAuth(req);
  const { features, docTypes, baseContent } = await parseBody(req, generateSchema);

  const project = await ProjectModel.findById(params.projectId);
  if (!project) throw new ApiError(404, 'Project not found');
  const isOwner = String(project.ownerId) === sub;
  if (role !== 'admin' && !isOwner) {
    throw new ApiError(403, 'Only the project owner or an admin can generate documents');
  }
  if (project.status === 'locked') {
    throw new ApiError(409, 'Project is finalised — change its status to regenerate');
  }

  const types = docTypes && docTypes.length > 0 ? docTypes : DEFAULT_DOC_TYPES;

  // Non-PRD documents are grounded in the PRD. If this request isn't (re)generating
  // the PRD itself, feed in the one already stored for the project so the new doc
  // stays consistent with it.
  let existingPrd: string | undefined;
  if (!types.includes('prd')) {
    const prdDoc = await AiDocumentModel.findOne({ projectId: project.id, docType: 'prd' })
      .select('content')
      .lean();
    existingPrd = prdDoc?.content;
  }

  // Admin-authored templates decide the shape of each document. Newest active
  // template per doc type wins; doc types without one use the built-in prompt.
  const activeTemplates = await TemplateModel.find({ docType: { $in: types }, isActive: true })
    .sort({ updatedAt: -1 })
    .lean();
  const templates: Partial<Record<DocType, DocTemplate>> = {};
  for (const t of activeTemplates) {
    const type = t.docType as DocType;
    if (!templates[type]) {
      templates[type] = {
        name: t.name,
        role: t.role,
        sections: t.sections,
        instructions: t.instructions,
      };
    }
  }

  const generated = await generateDocs(
    {
      name: project.name,
      industry: project.industry,
      description: project.description,
      budgetRange: project.budgetRange,
      targetCountries: project.targetCountries,
      features,
    },
    types,
    { baseContent, existingPrd, templates },
  );

  const documents = await Promise.all(
    generated.map((g) =>
      AiDocumentModel.findOneAndUpdate(
        { projectId: project.id, docType: g.docType },
        {
          $set: {
            content: g.result.content,
            generatedBy: env.GROQ_MODEL,
            tokensUsed: g.result.tokensUsed,
            isApproved: false,
          },
          $inc: { version: 1 },
        },
        { upsert: true, new: true },
      ),
    ),
  );

  return NextResponse.json(
    { documents, tokensUsed: generated.reduce((s, g) => s + g.result.tokensUsed, 0) },
    { status: 201 },
  );
});
