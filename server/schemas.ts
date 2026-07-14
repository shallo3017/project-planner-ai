import { z } from 'zod';
import { DOC_TYPES } from './models/AiDocument';

// Shared request schemas reused across route handlers.

/** Admin-authored document template (see /api/admin/templates). */
export const templateBodySchema = z.object({
  name: z.string().min(1).max(120),
  docType: z.enum(DOC_TYPES),
  description: z.string().max(500).optional().default(''),
  role: z.string().max(500).optional().default(''),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1).max(160),
        guidance: z.string().max(2000).optional().default(''),
      }),
    )
    .max(30)
    .optional()
    .default([]),
  instructions: z.string().max(4000).optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().optional(),
  description: z.string().optional(),
  budgetRange: z.string().optional(),
  deadline: z.coerce.date().nullable().optional(),
  targetCountries: z.array(z.string()).default([]),
  status: z.enum(['draft', 'in_review', 'approved', 'locked', 'archived']).default('draft'),
});

export const updateProjectSchema = createProjectSchema.partial();

export type ProjectInput = z.infer<typeof createProjectSchema>;

export const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) }))
    .min(1)
    .max(50),
});

export const questionBodySchema = z.object({
  industry: z.string().min(1).max(80),
  key: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-zA-Z0-9_-]+$/, 'key may only contain letters, numbers, - and _'),
  label: z.string().min(1).max(300),
  type: z.enum(['text', 'textarea', 'select', 'multiselect']).default('text'),
  options: z.array(z.string().min(1)).default([]),
  placeholder: z.string().max(200).default(''),
  required: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  dependsOnKey: z.string().max(60).nullable().optional(),
  dependsOnValue: z.string().max(200).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updateQuestionSchema = questionBodySchema.partial();
