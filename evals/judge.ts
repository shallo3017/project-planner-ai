import type { DocType } from '@/server/models/AiDocument';
import { chatCompletion } from '@/server/services/groq.service';
import { DOC_META, type ProjectRequirements } from '@/server/services/ai.service';

export const DIMENSIONS = [
  'coverage',
  'specificity',
  'consistency',
  'grounding',
  'measurability',
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export interface Score extends Record<Dimension, number> {
  overall: number;
  notes: string;
}

const JUDGE_SYSTEM = `You are a strict evaluator of product and technical documentation.
Score the document against the project requirements it was generated from.

Score each dimension 1-5 (integers only):
- coverage: every stated requirement and feature is addressed. 5 = nothing omitted.
- specificity: concrete and decision-useful. 1 = generic filler that could describe
  any product; 5 = specific names, numbers, and technologies.
- consistency: sections agree with each other and with the requirements. 5 = no
  contradictions anywhere.
- grounding: does NOT invent facts absent from the requirements. A document that
  clearly labels an assumption as an assumption scores well; one that silently
  states invented facts as truth scores 1-2.
- measurability: goals and success criteria are testable. 5 = concrete metrics with
  targets; 1 = "good performance", "high quality".

Be harsh. A 5 means genuinely excellent, not merely acceptable. Most real documents
score 3. Do not reward length.

Respond ONLY with JSON:
{"coverage":n,"specificity":n,"consistency":n,"grounding":n,"measurability":n,"notes":"<one sentence on the weakest point>"}`;

function clamp5(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(1, Math.min(5, Math.round(v)));
}

function brief(p: ProjectRequirements): string {
  return [
    `Project: ${p.name}`,
    p.industry && `Industry: ${p.industry}`,
    p.description && `Description: ${p.description}`,
    p.budgetRange && `Budget: ${p.budgetRange}`,
    p.features?.length && `Required features:\n${p.features.map((f) => `- ${f}`).join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Grade one generated document. Uses the QUALITY model (not the fast one that may
 * have drafted it) — an LLM judging its own output is measurably biased toward it.
 */
export async function judge(
  docType: DocType,
  content: string,
  project: ProjectRequirements,
): Promise<Score> {
  const { content: raw } = await chatCompletion(
    [
      { role: 'system', content: JUDGE_SYSTEM },
      {
        role: 'user',
        content: `=== REQUIREMENTS ===\n${brief(project)}\n\n=== ${DOC_META[docType].label} ===\n${content}`,
      },
    ],
    { json: true, temperature: 0, maxTokens: 500 },
  );

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(raw);
  } catch {
    /* fall through to zeros — a malformed judge result must be visible, not silent */
  }

  const scores = Object.fromEntries(DIMENSIONS.map((d) => [d, clamp5(data[d])])) as Record<
    Dimension,
    number
  >;
  const overall =
    DIMENSIONS.reduce((sum, d) => sum + scores[d], 0) / DIMENSIONS.length;

  return {
    ...scores,
    overall: Math.round(overall * 100) / 100,
    notes: typeof data.notes === 'string' ? data.notes : '',
  };
}
