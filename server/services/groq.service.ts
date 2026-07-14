import Groq, { toFile } from 'groq-sdk';
import { env } from '../env';
import { ApiError } from '../http';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

let client: Groq | null = null;

function getClient(): Groq {
  if (!env.GROQ_API_KEY) {
    throw new ApiError(503, 'AI is not configured — set GROQ_API_KEY');
  }
  if (!client) client = new Groq({ apiKey: env.GROQ_API_KEY });
  return client;
}

export interface ChatResult {
  content: string;
  tokensUsed: number;
}

/** Shared options. `fast` picks the small/low-latency model over the quality one. */
export interface CompletionOpts {
  temperature?: number;
  json?: boolean;
  maxTokens?: number;
  fast?: boolean;
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;

/** Rate limits (429) and upstream blips (5xx) are transient; bad requests are not. */
function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) return false; // our own config errors
  const status = (err as { status?: number }).status;
  if (status === 429) return true;
  if (typeof status === 'number') return status >= 500;
  return true; // no status → network/timeout
}

function retryDelay(err: unknown, attempt: number): number {
  // Honour Groq's Retry-After when present, else exponential backoff + jitter.
  const header = (err as { headers?: Record<string, string> }).headers?.['retry-after'];
  const after = Number(header);
  if (Number.isFinite(after) && after > 0) return Math.min(after * 1000, 10_000);
  return BASE_DELAY_MS * 2 ** attempt + Math.random() * 250;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === MAX_ATTEMPTS - 1) break;
      await new Promise((r) => setTimeout(r, retryDelay(err, attempt)));
    }
  }
  throw lastErr;
}

function modelFor(opts: CompletionOpts): string {
  return opts.fast ? env.GROQ_FAST_MODEL : env.GROQ_MODEL;
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: CompletionOpts = {},
): Promise<ChatResult> {
  const res = await withRetry(() =>
    getClient().chat.completions.create({
      model: modelFor(opts),
      messages,
      max_tokens: opts.maxTokens ?? env.GROQ_MAX_TOKENS,
      temperature: opts.temperature ?? 0.4,
      ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
    }),
  );

  return {
    content: res.choices[0]?.message?.content ?? '',
    tokensUsed: res.usage?.total_tokens ?? 0,
  };
}

export async function* chatCompletionStream(
  messages: ChatMessage[],
  opts: CompletionOpts = {},
): AsyncGenerator<string> {
  // Only the handshake is retried — once tokens are flowing we can't replay them.
  const stream = await withRetry(() =>
    getClient().chat.completions.create({
      model: modelFor(opts),
      messages,
      max_tokens: opts.maxTokens ?? env.GROQ_MAX_TOKENS,
      temperature: opts.temperature ?? 0.4,
      stream: true,
    }),
  );

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * Transcribe a recorded audio clip to text via Groq's Whisper model.
 * Cross-browser voice-to-text — the audio is captured in the browser and sent
 * here, so it doesn't depend on the browser's own speech service.
 */
export async function transcribeAudio(file: File): Promise<string> {
  const upload = await toFile(file, file.name || 'audio.webm', {
    type: file.type || 'audio/webm',
  });
  const res = await getClient().audio.transcriptions.create({
    file: upload,
    model: env.GROQ_STT_MODEL,
  });
  return (res.text ?? '').trim();
}

export { ApiError };
