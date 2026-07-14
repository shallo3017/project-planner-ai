import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth';
import { ApiError, handler } from '@/server/http';
import { extractTemplate } from '@/server/services/ai.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MIN_TEXT_CHARS = 40;

/** Pull the text out of an uploaded PDF (pdf-parse v2 exposes a PDFParse class). */
async function pdfToText(file: File): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  try {
    const { text } = await parser.getText();
    return text ?? '';
  } finally {
    await parser.destroy?.();
  }
}

/**
 * POST /api/admin/templates/extract
 * Body: JSON { text } — pasted content
 *    or multipart with `file` — a PDF
 * Returns a template draft (name/role/sections/instructions) for the admin to edit.
 */
export const POST = handler(async (req) => {
  requireRole(req, 'admin');

  let source = '';
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) throw new ApiError(400, 'No PDF was uploaded');
    if (file.size > MAX_PDF_BYTES) throw new ApiError(413, 'PDF is too large (max 15MB)');

    try {
      source = await pdfToText(file);
    } catch {
      throw new ApiError(422, "Couldn't read that PDF — it may be scanned or corrupted");
    }
    if (source.trim().length < MIN_TEXT_CHARS) {
      throw new ApiError(
        422,
        'No selectable text found — the PDF looks scanned. Paste the content instead.',
      );
    }
  } else {
    const body = (await req.json().catch(() => ({}))) as { text?: unknown };
    source = typeof body.text === 'string' ? body.text : '';
    if (source.trim().length < MIN_TEXT_CHARS) {
      throw new ApiError(400, 'Paste a bit more content so the structure can be detected');
    }
  }

  const template = await extractTemplate(source);
  return NextResponse.json({ template });
});
