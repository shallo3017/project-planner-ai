import { env } from '../env';
import { DOC_TYPES, type DocType } from '../models/AiDocument';
import { chatCompletion, chatCompletionStream, type ChatResult } from './groq.service';

// Keep enough of the transcript in-context that the model doesn't lose earlier
// answers and re-ask questions. The guest flow is capped at 12 user turns, so
// ~24 messages covers a full intake without unbounded prompt growth.
const MAX_HISTORY_TURNS = 24;
const CHAT_REPLY_MAX_TOKENS = 400;

export interface ProjectRequirements {
  name: string;
  industry?: string | null;
  description?: string | null;
  budgetRange?: string | null;
  targetCountries?: string[];
  features?: string[];
}

function requirementsBrief(p: ProjectRequirements): string {
  const lines = [
    `Project name: ${p.name}`,
    p.industry ? `Industry: ${p.industry}` : null,
    p.description ? `Description: ${p.description}` : null,
    p.budgetRange ? `Budget range: ${p.budgetRange}` : null,
    p.targetCountries?.length ? `Target countries: ${p.targetCountries.join(', ')}` : null,
    p.features?.length
      ? `Required features (must all be covered):\n${p.features.map((f) => `- ${f}`).join('\n')}`
      : null,
  ].filter(Boolean);
  return lines.join('\n');
}

const PRD_SYSTEM = `You are a senior product manager. Write a clear, professional
Product Requirements Document (PRD) in GitHub-flavored Markdown for the project
described by the user. Use these sections, in order:
# Product Requirements Document — <project name>
## 1. Overview
## 2. Goals
## 3. Target Users
## 4. Key Features  (numbered list)
## 5. Out of Scope
## 6. Success Metrics
Be concise, specific, and realistic. Do not invent a different project.`;

const TRD_SYSTEM = `You are a senior software architect. Write a Technical
Requirements Document (TRD) in GitHub-flavored Markdown for the project described
by the user. Use these sections, in order:
# Technical Requirements Document — <project name>
## 1. Architecture
## 2. Tech Stack
## 3. Modules
Break the system into its major modules. For each: a bold module name, a one-line
responsibility, and a short bullet list of its key components/services.
## 4. Folder Structure
Provide a realistic project folder tree that reflects the chosen tech stack and the
modules above. Render it inside a fenced code block using a tree layout, e.g.:
\`\`\`
project/
├─ apps/
│  ├─ web/
│  └─ api/
└─ packages/
\`\`\`
## 5. Data Model
## 6. API Design
## 7. Security
## 8. Scalability & Risks
Be concise and pragmatic. Prefer widely-used, cost-effective technologies.`;

const BRD_SYSTEM = `You are a senior business analyst. Write a Business Requirements
Document (BRD) in GitHub-flavored Markdown for the project described by the user.
Use these sections, in order:
# Business Requirements Document — <project name>
## 1. Executive Summary
## 2. Business Objectives
## 3. Stakeholders
## 4. Scope (In / Out)
## 5. Functional Requirements  (numbered)
## 6. Non-Functional Requirements
## 7. Assumptions & Constraints
## 8. Success Criteria & KPIs
Focus on business value and outcomes, not implementation. Be concise and realistic.`;

const SRS_SYSTEM = `You are a senior systems analyst. Write a Software Requirements
Specification (SRS), IEEE-830 style, in GitHub-flavored Markdown for the project.
Use these sections, in order:
# Software Requirements Specification — <project name>
## 1. Introduction (Purpose, Scope, Definitions)
## 2. Overall Description
## 3. Functional Requirements
Use identifiers like FR-1, FR-2 with clear, testable statements.
## 4. External Interface Requirements (UI, APIs, Hardware)
## 5. Non-Functional Requirements (Performance, Security, Reliability, Usability)
## 6. Acceptance Criteria
Be precise and unambiguous.`;

const API_DOCS_SYSTEM = `You are a senior backend engineer. Write REST API
documentation in GitHub-flavored Markdown for the project described by the user.
Use these sections:
# API Documentation — <project name>
## Overview (base URL, format)
## Authentication
## Endpoints
For each resource, document the endpoints as a Markdown table with columns:
Method | Path | Description | Auth. Then show 2-3 key endpoints with a JSON request
and JSON response example in fenced \`\`\`json code blocks.
## Error Handling (status codes table)
Infer sensible resources/endpoints from the requirements. Be realistic.`;

const DB_SCHEMA_SYSTEM = `You are a senior data engineer. Write the database schema
in GitHub-flavored Markdown for the project described by the user.
Use these sections:
# Database Schema — <project name>
## Overview (database type and rationale)
## Entities
For each table/collection: a heading, a one-line purpose, and a Markdown table of
columns/fields (name, type, constraints/notes).
## Relationships (describe foreign keys / references)
## Entity Relationship Diagram
Provide an ERD inside a fenced \`\`\`mermaid code block using \`erDiagram\` syntax.
## Indexes
Choose a database appropriate to the requirements. Be concrete.`;

export const DOC_META: Record<DocType, { label: string; system: string }> = {
  prd: { label: 'PRD', system: PRD_SYSTEM },
  trd: { label: 'TRD', system: TRD_SYSTEM },
  brd: { label: 'BRD', system: BRD_SYSTEM },
  srs: { label: 'SRS', system: SRS_SYSTEM },
  api_docs: { label: 'API Docs', system: API_DOCS_SYSTEM },
  db_schema: { label: 'DB Schema', system: DB_SCHEMA_SYSTEM },
};

export interface GeneratedDoc {
  docType: DocType;
  result: ChatResult;
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

const CHAT_SYSTEM = `You are a friendly product strategist helping a user scope a
new software project. You are running a bounded slot-filling intake, not an
open-ended interview.

SLOTS to fill (in priority order): core problem, target users, key features,
industry/domain, platform (web / mobile / both), preferred tech stack (or "no
preference"), rough budget.

RULES:
- Ask ONE question per reply, targeting the highest-priority UNFILLED slot. Never
  re-ask a slot that the transcript already answers — read the full history first.
- When the user's answer is vague, empty, or non-committal (e.g. "hi", "??", "idk",
  "not sure"), DO NOT repeat the question. Offer 2-3 concrete example options for
  that slot and let them pick, or state a sensible default assumption and move on
  to the next slot.
- When the user's message is off-topic or unrelated to scoping a software project
  (small talk, jokes, questions about you, or random/gibberish text), do NOT answer
  it in depth. In one short, friendly sentence, steer back on track and re-ask the
  current slot's question. Off-topic messages do not fill any slot and do not count
  toward the question limit.
- Hard limit: ask at most 6 questions total across the whole conversation. After
  that, stop asking and summarize.
- As soon as the first three slots (problem, users, key features) are reasonably
  known — even approximately — stop interrogating and tell the user they have
  enough to click "Create project"; you'll infer the rest.
- Keep replies short (1-2 sentences) and conversational. Do not restate everything
  the user said; just move forward.`;

function recentTurns(history: ChatTurn[]): ChatTurn[] {
  return history.slice(-MAX_HISTORY_TURNS);
}

// Chat turns are short and latency-sensitive → the fast model. Documents are
// long-form and quality-sensitive → the big one.
export async function chatReply(history: ChatTurn[]): Promise<string> {
  const { content } = await chatCompletion(
    [{ role: 'system', content: CHAT_SYSTEM }, ...recentTurns(history)],
    { temperature: 0.6, maxTokens: CHAT_REPLY_MAX_TOKENS, fast: true },
  );
  return content;
}

export function chatReplyStream(history: ChatTurn[]): AsyncGenerator<string> {
  return chatCompletionStream(
    [{ role: 'system', content: CHAT_SYSTEM }, ...recentTurns(history)],
    { temperature: 0.6, maxTokens: CHAT_REPLY_MAX_TOKENS, fast: true },
  );
}

export interface ProjectDraft {
  name: string;
  industry: string;
  description: string;
  budgetRange: string;
  completeness: number;
}

const EXTRACT_SYSTEM = `From the conversation, produce ONLY a JSON object with
these keys: "name" (a concise project name), "industry", "description" (a thorough
paragraph synthesizing the requirements discussed), "budgetRange" (or empty string
if unknown), and "completeness" (an integer 0-100 estimating how complete the
requirements are for writing a PRD/TRD — judge whether the core problem, target
users, key features, platform, and budget are known). Do not include other text.`;

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function extractProject(history: ChatTurn[]): Promise<ProjectDraft> {
  const { content } = await chatCompletion(
    [
      { role: 'system', content: EXTRACT_SYSTEM },
      ...recentTurns(history),
      { role: 'user', content: 'Produce the project JSON now.' },
    ],
    { json: true, temperature: 0.2, maxTokens: 800, fast: true },
  );

  let data: Partial<ProjectDraft> = {};
  try {
    data = JSON.parse(content);
  } catch {
    /* defaults */
  }
  return {
    name: data.name?.trim() || 'Untitled project',
    industry: data.industry?.trim() || '',
    description: data.description?.trim() || '',
    budgetRange: data.budgetRange?.trim() || '',
    completeness: clampScore(data.completeness),
  };
}

const ENRICH_SYSTEM = `You are a product analyst. Rewrite the user's raw
questionnaire answers into a clear, well-structured project brief suitable as
input for a PRD/TRD. Preserve every fact; do not invent details. Write 2-4 concise
paragraphs in plain prose (no markdown headings, no preamble).`;

export async function enrichAnswers(raw: string): Promise<string> {
  const { content } = await chatCompletion(
    [
      { role: 'system', content: ENRICH_SYSTEM },
      { role: 'user', content: raw },
    ],
    { temperature: 0.3, maxTokens: 700 },
  );
  return content.trim();
}

const CHECKLIST_SYSTEM = `You are a product manager. From the project details,
propose a concise checklist of the 6-10 most important features this product should
include. Respond ONLY with a JSON object: { "features": string[] } where each item
is a short feature name (3-7 words). No other text.`;

export async function suggestFeatures(project: ProjectRequirements): Promise<string[]> {
  const { content } = await chatCompletion(
    [
      { role: 'system', content: CHECKLIST_SYSTEM },
      { role: 'user', content: requirementsBrief(project) },
    ],
    { json: true, temperature: 0.3 },
  );
  try {
    const data = JSON.parse(content) as { features?: unknown };
    if (Array.isArray(data.features)) {
      return data.features
        .filter((f): f is string => typeof f === 'string')
        .map((f) => f.trim())
        .filter(Boolean)
        .slice(0, 12);
    }
  } catch {
    /* fall through */
  }
  return [];
}

/** Trim the grounding PRD so a long one can't crowd out the rest of the prompt. */
const MAX_GROUNDING_CHARS = 12000;

const CRITIC_SYSTEM = `You are a demanding senior reviewer of product and technical
documentation. You are given a document and the project requirements it must satisfy.
Find its REAL weaknesses — do not be polite, and do not invent praise.

Judge it on:
1. Coverage — does it address every stated requirement and feature?
2. Specificity — is it concrete, or vague filler that could describe any product?
3. Internal consistency — do its sections agree with each other?
4. Grounding — does it invent facts the requirements never stated?
5. Measurability — are goals/success criteria actually testable?

Respond ONLY with JSON:
{"score": <integer 1-10>, "issues": ["<concrete, actionable fix>", ...]}

Each issue must be a specific instruction a writer can act on ("Section 6 lists
'good performance' — replace with a measurable latency target"), never a vague
complaint ("could be better"). List at most 6, ordered by importance. If the
document is genuinely strong, return an empty issues array.`;

export interface DocCritique {
  score: number;
  issues: string[];
}

function clamp10(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

/** Grade a drafted document against the requirements it was meant to satisfy. */
export async function critiqueDoc(
  docType: DocType,
  content: string,
  project: ProjectRequirements,
): Promise<DocCritique> {
  const { content: raw } = await chatCompletion(
    [
      { role: 'system', content: CRITIC_SYSTEM },
      {
        role: 'user',
        content: `=== ${DOC_META[docType].label} ===
${content}

=== PROJECT REQUIREMENTS ===
${requirementsBrief(project)}`,
      },
    ],
    { json: true, temperature: 0.2, maxTokens: 700, fast: true },
  );

  try {
    const data = JSON.parse(raw) as { score?: unknown; issues?: unknown };
    const issues = Array.isArray(data.issues)
      ? data.issues.filter((i): i is string => typeof i === 'string' && i.trim().length > 0).slice(0, 6)
      : [];
    return { score: clamp10(data.score), issues };
  } catch {
    return { score: 0, issues: [] }; // a broken critique must never block generation
  }
}

/** Rewrite a draft so it fixes every issue the critic raised. */
async function reviseDoc(
  docType: DocType,
  draft: string,
  issues: string[],
  project: ProjectRequirements,
  basePrompt: string,
): Promise<ChatResult> {
  const system = `${basePrompt}

You are REVISING an existing draft, not writing a new document. Fix every issue in
the review below. Preserve everything already correct — keep the same sections, do
not shorten the document, and do not drop content that was fine. Return the COMPLETE
revised document in the same GitHub-flavored Markdown format.`;

  return chatCompletion(
    [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `=== DRAFT ===
${draft}

=== REVIEW — fix each of these ===
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

=== PROJECT REQUIREMENTS ===
${requirementsBrief(project)}`,
      },
    ],
    { temperature: 0.3 },
  );
}

/**
 * Generate one document.
 *
 * - `baseContent` (regenerating an edited doc) → the model REVISES it, preserving
 *   the author's manual edits instead of rewriting from scratch.
 * - `groundingPrd` → the project's PRD, passed to every NON-PRD document as the
 *   source of truth. Without it each document is an independent guess and they
 *   contradict each other (a TRD stack that doesn't match the PRD's features,
 *   a DB schema with entities the SRS never mentions).
 */
/** An admin-authored template (shape mirrors the Template model). */
export interface DocTemplate {
  name: string;
  role?: string;
  sections?: { heading: string; guidance?: string }[];
  instructions?: string;
}

/**
 * The system prompt for a document. When an admin has an active template for this
 * doc type, THEIR structure wins — persona, section list, and house rules. Without
 * one we fall back to the built-in prompt, so the app works out of the box.
 */
export function systemPromptFor(docType: DocType, template?: DocTemplate | null): string {
  if (!template) return DOC_META[docType].system;

  const sections = (template.sections ?? []).filter((s) => s.heading?.trim());
  const body = sections
    .map((s, i) => {
      const heading = `## ${i + 1}. ${s.heading.trim()}`;
      return s.guidance?.trim() ? `${heading}\n${s.guidance.trim()}` : heading;
    })
    .join('\n');

  return [
    template.role?.trim() ||
      `You are a senior professional writing a ${DOC_META[docType].label}.`,
    `Write the ${DOC_META[docType].label} in GitHub-flavored Markdown for the project described by the user.`,
    sections.length > 0
      ? `Use EXACTLY these sections, in this order, with these headings — do not add, remove, rename, or reorder them:\n# ${DOC_META[docType].label} — <project name>\n${body}`
      : '',
    template.instructions?.trim() || '',
    'Be concise, specific, and realistic. Do not invent a different project.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

const TEMPLATE_EXTRACT_SYSTEM = `You convert an existing document (or a rough outline)
into a REUSABLE TEMPLATE. Extract its STRUCTURE, never its project-specific content.

Respond ONLY with JSON:
{
  "name": "<short template name>",
  "role": "<one sentence describing the persona who writes this kind of document>",
  "sections": [{"heading": "<heading>", "guidance": "<what belongs in this section>"}],
  "instructions": "<house rules you can infer: tone, length, conventions>"
}

Rules:
- Headings must be GENERIC and reusable ("Success Metrics"), never tied to the source
  project ("FreshTiffin's Metrics"). Strip any numbering — order is implied.
- "guidance" says what a writer should PUT in that section, generalised — it must not
  repeat what this particular document happened to say.
- Between 3 and 12 sections, kept in their original order.`;

/** Max characters of source content fed to the model (keeps the prompt bounded). */
const MAX_SOURCE_CHARS = 20000;

/**
 * Turn a pasted document / outline / PDF's text into a template draft the admin
 * can then edit. Returns a best-effort draft; never throws on a bad model reply.
 */
export async function extractTemplate(source: string): Promise<DocTemplate> {
  const { content } = await chatCompletion(
    [
      { role: 'system', content: TEMPLATE_EXTRACT_SYSTEM },
      { role: 'user', content: source.slice(0, MAX_SOURCE_CHARS) },
    ],
    { json: true, temperature: 0.2, maxTokens: 1800 },
  );

  try {
    const data = JSON.parse(content) as {
      name?: unknown;
      role?: unknown;
      sections?: unknown;
      instructions?: unknown;
    };
    const sections = Array.isArray(data.sections)
      ? data.sections
          .map((s) => s as { heading?: unknown; guidance?: unknown })
          .filter((s) => typeof s.heading === 'string' && s.heading.trim())
          .map((s) => ({
            heading: (s.heading as string).trim(),
            guidance: typeof s.guidance === 'string' ? s.guidance.trim() : '',
          }))
          .slice(0, 30)
      : [];

    return {
      name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Imported template',
      role: typeof data.role === 'string' ? data.role.trim() : '',
      sections,
      instructions: typeof data.instructions === 'string' ? data.instructions.trim() : '',
    };
  } catch {
    return { name: 'Imported template', role: '', sections: [], instructions: '' };
  }
}

export interface GenerateOpts {
  /** Current content of an edited doc — the model revises rather than rewrites. */
  baseContent?: string;
  /** The project's PRD; every non-PRD doc is grounded in it. */
  groundingPrd?: string;
  /** Run the critic → revise pass. Defaults to the AI_REFINE env flag. */
  refine?: boolean;
  /** The admin's active template for this doc type, if any. */
  template?: DocTemplate | null;
}

export async function generateDoc(
  docType: DocType,
  project: ProjectRequirements,
  { baseContent, groundingPrd, template, refine = env.AI_REFINE === 'true' }: GenerateOpts = {},
): Promise<ChatResult> {
  const system = systemPromptFor(docType, template);
  const grounding =
    docType !== 'prd' && groundingPrd?.trim()
      ? `

=== APPROVED PRD (the source of truth — stay consistent with it) ===
Do not contradict the PRD below. Reuse its feature names, scope, and terminology.
If it omits something you need, state the assumption explicitly rather than
inventing a conflicting fact.

${groundingPrd.slice(0, MAX_GROUNDING_CHARS)}`
      : '';

  const userPrompt =
    baseContent && baseContent.trim()
      ? `Below is the current ${DOC_META[docType].label} which the author has manually edited.
Revise and improve it to satisfy the requirements, but PRESERVE the author's edits,
wording, and structure wherever possible (do not discard their changes). Return the
COMPLETE updated document in the same GitHub-flavored Markdown format.

=== CURRENT DOCUMENT ===
${baseContent}

=== PROJECT REQUIREMENTS ===
${requirementsBrief(project)}${grounding}`
      : `${requirementsBrief(project)}${grounding}`;

  const draft = await chatCompletion([
    { role: 'system', content: system },
    { role: 'user', content: userPrompt },
  ]);

  if (!refine) return draft;

  // Critic → revise. One cheap critique call; a revision only when it finds
  // something. Any failure here falls back to the draft — never blocks the user.
  try {
    const { issues } = await critiqueDoc(docType, draft.content, project);
    if (issues.length === 0) return draft;

    // Pass the same system prompt so a revision can't drift off the template.
    const revised = await reviseDoc(docType, draft.content, issues, project, system);
    if (!revised.content.trim()) return draft;

    return {
      content: revised.content,
      tokensUsed: draft.tokensUsed + revised.tokensUsed,
    };
  } catch {
    return draft;
  }
}

/**
 * Generate a set of documents, PRD-first so the rest can be grounded in it.
 * `existingPrd` lets a caller regenerating only (say) the TRD supply the PRD
 * already stored for the project.
 */
export async function generateDocs(
  project: ProjectRequirements,
  docTypes: DocType[],
  {
    baseContent,
    existingPrd,
    refine,
    templates,
  }: {
    baseContent?: string;
    existingPrd?: string;
    refine?: boolean;
    /** Active admin template per doc type, if any. */
    templates?: Partial<Record<DocType, DocTemplate>>;
  } = {},
): Promise<GeneratedDoc[]> {
  const single = docTypes.length === 1 ? baseContent : undefined;
  const results = new Map<DocType, ChatResult>();
  let prd = existingPrd ?? '';

  // The PRD must exist before anything can be grounded in it.
  if (docTypes.includes('prd')) {
    const result = await generateDoc('prd', project, {
      baseContent: single,
      refine,
      template: templates?.prd,
    });
    results.set('prd', result);
    prd = result.content;
  }

  const rest = docTypes.filter((t) => t !== 'prd');
  const restResults = await Promise.all(
    rest.map((docType) =>
      generateDoc(docType, project, {
        baseContent: single,
        groundingPrd: prd,
        refine,
        template: templates?.[docType],
      }),
    ),
  );
  rest.forEach((docType, i) => results.set(docType, restResults[i]!));

  return docTypes.map((docType) => ({ docType, result: results.get(docType)! }));
}

export { DOC_TYPES };
