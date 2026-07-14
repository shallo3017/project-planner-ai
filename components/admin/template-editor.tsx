'use client';

import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export const DOC_TYPES = ['prd', 'trd', 'brd', 'srs', 'api_docs', 'db_schema'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_LABEL: Record<DocType, string> = {
  prd: 'PRD',
  trd: 'TRD',
  brd: 'BRD',
  srs: 'SRS',
  api_docs: 'API Docs',
  db_schema: 'DB Schema',
};

export interface Section {
  heading: string;
  guidance: string;
}

export interface TemplateForm {
  name: string;
  docType: DocType;
  description: string;
  role: string;
  sections: Section[];
  instructions: string;
  isActive: boolean;
}

export const EMPTY_TEMPLATE: TemplateForm = {
  name: '',
  docType: 'prd',
  description: '',
  role: '',
  sections: [{ heading: '', guidance: '' }],
  instructions: '',
  isActive: true,
};

/**
 * The template editor: fields on the left, a live preview of the resulting
 * document skeleton on the right. The preview is the whole point — an admin
 * should see the shape of what the AI will produce before saving.
 */
export function TemplateEditor({
  form,
  onChange,
}: {
  form: TemplateForm;
  onChange: (next: TemplateForm) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  const set = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) =>
    onChange({ ...form, [key]: value });

  const setSection = (i: number, patch: Partial<Section>) =>
    onChange({
      ...form,
      sections: form.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    });

  const addSection = () =>
    onChange({ ...form, sections: [...form.sections, { heading: '', guidance: '' }] });

  const removeSection = (i: number) =>
    onChange({ ...form, sections: form.sections.filter((_, idx) => idx !== i) });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= form.sections.length) return;
    const next = [...form.sections];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange({ ...form, sections: next });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      {/* ── Fields ─────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Basics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Template name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Corescent standard PRD"
                required
              />
            </div>
            <div>
              <label className="label">Applies to</label>
              <select
                className="input"
                value={form.docType}
                onChange={(e) => set('docType', e.target.value as DocType)}
              >
                {DOC_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {DOC_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="label">Description (internal)</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What this template is for"
            />
          </div>

          <div className="mt-4">
            <label className="label">Persona</label>
            <input
              className="input"
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              placeholder="You are a senior product manager writing for engineers…"
            />
            <p className="mt-1 text-xs text-slate-400">
              How the AI should think of itself. Leave blank for the default.
            </p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Sections</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                The AI uses these exactly — same names, same order.
              </p>
            </div>
            <button type="button" onClick={addSection} className="btn-ghost px-3 py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add section
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {form.sections.map((s, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-slate-400">
                    {i + 1}.
                  </span>
                  <input
                    className="input flex-1 bg-white py-1.5 text-sm"
                    value={s.heading}
                    onChange={(e) => setSection(i, { heading: e.target.value })}
                    placeholder="Section heading, e.g. Goals"
                  />
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === form.sections.length - 1}
                      aria-label="Move down"
                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(i)}
                      aria-label="Remove section"
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <textarea
                  className="input mt-2 min-h-[52px] bg-white py-1.5 text-sm"
                  value={s.guidance}
                  onChange={(e) => setSection(i, { guidance: e.target.value })}
                  placeholder="What belongs in this section (optional guidance for the AI)"
                />
              </div>
            ))}

            {form.sections.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                No sections — the AI will fall back to the built-in structure.
              </p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">House rules</h2>
          <textarea
            className="input mt-3 min-h-[90px]"
            value={form.instructions}
            onChange={(e) => set('instructions', e.target.value)}
            placeholder="e.g. Always include measurable success metrics. Keep under 1200 words. Use British English."
          />
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            Active — use this template when generating {DOC_LABEL[form.docType]}s
          </label>
        </div>
      </div>

      {/* ── Live preview ───────────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="btn-ghost mb-2 w-full justify-center py-2 text-xs lg:hidden"
        >
          <Eye className="h-3.5 w-3.5" /> {showPreview ? 'Hide' : 'Show'} preview
        </button>

        <div className={`${showPreview ? 'block' : 'hidden'} lg:block`}>
          <TemplatePreview form={form} />
        </div>
      </div>
    </div>
  );
}

/** What the generated document will look like, structurally. */
export function TemplatePreview({ form }: { form: TemplateForm }) {
  const sections = form.sections.filter((s) => s.heading.trim());

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <Eye className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Preview
        </span>
        <span className="ml-auto text-xs text-slate-400">{DOC_LABEL[form.docType]}</span>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-5">
        {form.role.trim() && (
          <p className="mb-4 rounded-lg bg-indigo-50 px-3 py-2 text-xs italic text-indigo-700">
            {form.role.trim()}
          </p>
        )}

        <h1 className="text-lg font-bold text-slate-900">
          {DOC_LABEL[form.docType]} — <span className="text-slate-400">Project name</span>
        </h1>

        {sections.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
            Add a section to see the document take shape.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {sections.map((s, i) => (
              <li key={i}>
                <p className="font-semibold text-slate-800">
                  <span className="text-slate-400">{i + 1}.</span> {s.heading}
                </p>
                {s.guidance.trim() && (
                  <p className="mt-0.5 border-l-2 border-slate-200 pl-2 text-xs leading-relaxed text-slate-500">
                    {s.guidance.trim()}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}

        {form.instructions.trim() && (
          <div className="mt-5 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              House rules
            </p>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
              {form.instructions.trim()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
