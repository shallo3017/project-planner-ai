import { chatCompletion, type ChatResult } from './groq.service';

/** The shape of project fields we feed into the prompt (intake-agnostic). */
export interface ProjectRequirements {
  name: string;
  industry?: string | null;
  description?: string | null;
  budgetRange?: string | null;
  targetCountries?: string[];
}

/** Compile project fields into a compact requirements brief for the LLM. */
function requirementsBrief(p: ProjectRequirements): string {
  const lines = [
    `Project name: ${p.name}`,
    p.industry ? `Industry: ${p.industry}` : null,
    p.description ? `Description: ${p.description}` : null,
    p.budgetRange ? `Budget range: ${p.budgetRange}` : null,
    p.targetCountries?.length ? `Target countries: ${p.targetCountries.join(', ')}` : null,
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
## 3. Data Model
## 4. API Design
## 5. Security
## 6. Scalability & Risks
Be concise and pragmatic. Prefer widely-used, cost-effective technologies.`;

export interface GeneratedDocs {
  prd: ChatResult;
  trd: ChatResult;
}

// ── Chatbot intake ───────────────────────────────────────────────────────────
export type ChatTurn = { role: 'user' | 'assistant'; content: string };

const CHAT_SYSTEM = `You are a friendly product strategist helping a user scope a
new software project. Ask focused, one-at-a-time questions to uncover: the core
problem, target users, key features, industry, platform, and rough budget. Keep
replies short and conversational. Once you have a clear picture, tell the user
they can click "Create project" to turn the conversation into a project brief.`;

/** A single conversational reply from the assistant. */
export async function chatReply(history: ChatTurn[]): Promise<string> {
  const { content } = await chatCompletion(
    [{ role: 'system', content: CHAT_SYSTEM }, ...history],
    { temperature: 0.6 },
  );
  return content;
}

export interface ProjectDraft {
  name: string;
  industry: string;
  description: string;
  budgetRange: string;
}

const EXTRACT_SYSTEM = `From the conversation, produce ONLY a JSON object with
these string keys: "name" (a concise project name), "industry", "description"
(a thorough paragraph synthesizing the requirements discussed), and
"budgetRange" (or empty string if unknown). Do not include any other text.`;

/** Distill the conversation into a structured project draft (JSON mode). */
export async function extractProject(history: ChatTurn[]): Promise<ProjectDraft> {
  const { content } = await chatCompletion(
    [
      { role: 'system', content: EXTRACT_SYSTEM },
      ...history,
      { role: 'user', content: 'Produce the project JSON now.' },
    ],
    { json: true, temperature: 0.2 },
  );

  let data: Partial<ProjectDraft> = {};
  try {
    data = JSON.parse(content);
  } catch {
    /* fall through to defaults */
  }
  return {
    name: data.name?.trim() || 'Untitled project',
    industry: data.industry?.trim() || '',
    description: data.description?.trim() || '',
    budgetRange: data.budgetRange?.trim() || '',
  };
}

/** Generate both the PRD and TRD from a project's requirements (in parallel). */
export async function generatePrdTrd(project: ProjectRequirements): Promise<GeneratedDocs> {
  const brief = requirementsBrief(project);
  const [prd, trd] = await Promise.all([
    chatCompletion([
      { role: 'system', content: PRD_SYSTEM },
      { role: 'user', content: brief },
    ]),
    chatCompletion([
      { role: 'system', content: TRD_SYSTEM },
      { role: 'user', content: brief },
    ]),
  ]);
  return { prd, trd };
}
