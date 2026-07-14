import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handler, parseBody } from '@/server/http';
import { TemplateModel } from '@/server/models/Template';
import { templateBodySchema } from '@/server/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  await connectDB();
  requireRole(req, 'admin');
  const templates = await TemplateModel.find().sort({ docType: 1, updatedAt: -1 });
  return NextResponse.json({ templates: templates.map((t) => t.toJSON()) });
});

export const POST = handler(async (req) => {
  await connectDB();
  requireRole(req, 'admin');
  const body = await parseBody(req, templateBodySchema);
  const template = await TemplateModel.create(body);
  return NextResponse.json({ template: template.toJSON() }, { status: 201 });
});
