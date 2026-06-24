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
