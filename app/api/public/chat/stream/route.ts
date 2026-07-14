import { z } from 'zod';
import { ApiError, handler, parseBody } from '@/server/http';
import { rateLimit } from '@/server/rateLimit';
import { chatReplyStream } from '@/server/services/ai.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GUEST_MAX_TURNS = 12;

const publicChatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
});

/** POST /api/public/chat/stream — streamed guest reply. Same caps as /public/chat. */
export const POST = handler(async (req) => {
  rateLimit(req, { windowMs: 10 * 60 * 1000, max: 40 });
  const { messages } = await parseBody(req, publicChatSchema);

  const userTurns = messages.filter((m) => m.role === 'user').length;
  if (userTurns > GUEST_MAX_TURNS) {
    throw new ApiError(403, 'Guest limit reached — sign in to keep going and generate documents.');
  }

  const gen = chatReplyStream(messages);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await gen.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(value));
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
});
