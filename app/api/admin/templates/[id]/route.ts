import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth';
import { connectDB } from '@/server/db';
import { ApiError, handler, parseBody } from '@/server/http';
import { TemplateModel } from '@/server/models/Template';
import { templateBodySchema } from '@/server/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = handler<{ params: { id: string } }>(async (req, { params }) => {
  await connectDB();
  requireRole(req, 'admin');
  const body = await parseBody(req, templateBodySchema.partial());

  const template = await TemplateModel.findByIdAndUpdate(params.id, { $set: body }, { new: true });
  if (!template) throw new ApiError(404, 'Template not found');
  return NextResponse.json({ template: template.toJSON() });
});

export const DELETE = handler<{ params: { id: string } }>(async (req, { params }) => {
  await connectDB();
  requireRole(req, 'admin');
  const deleted = await TemplateModel.findByIdAndDelete(params.id);
  if (!deleted) throw new ApiError(404, 'Template not found');
  return NextResponse.json({ ok: true });
});
