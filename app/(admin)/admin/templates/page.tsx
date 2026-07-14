'use client';

import { LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DOC_LABEL, type DocType } from '@/components/admin/template-editor';
import { StatusPill } from '@/components/status-pill';
import { apiFetch } from '@/lib/api';

interface Template {
  id: string;
  name: string;
  docType: DocType;
  description: string;
  sections: { heading: string; guidance: string }[];
  isActive: boolean;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ templates: Template[] }>('/admin/templates');
      setTemplates(data.templates);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The generator uses the newest ACTIVE template per doc type — mark which one.
  const inUse = useMemo(() => {
    const map: Partial<Record<DocType, string>> = {};
    for (const t of templates) if (t.isActive && !map[t.docType]) map[t.docType] = t.id;
    return map;
  }, [templates]);

  async function remove(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      await apiFetch(`/admin/templates/${t.id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <main className="animate-fade-up px-6 py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Document templates
          </h1>
          <p className="mt-1 text-slate-600">
            You decide the shape of every generated document — persona, sections, and house rules.
          </p>
        </div>
        <Link href="/admin/templates/new" className="btn-primary px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> New template
        </Link>
      </div>

      {error && (
        <div className="card mt-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card space-y-2 p-5">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="card mt-6 grid place-items-center gap-3 py-16 text-center">
          <LayoutTemplate className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No templates yet</p>
          <p className="max-w-md text-sm text-slate-500">
            Without a template, documents use the built-in structure. Add one to take control of the
            sections and tone.
          </p>
          <Link href="/admin/templates/new" className="btn-primary mt-1 px-4 py-2 text-sm">
            <Plus className="h-4 w-4" /> Create your first template
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {templates.map((t) => (
            <div key={t.id} className="card card-interactive relative flex items-center gap-3 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/templates/${t.id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-700"
                  >
                    {/* Whole card is the edit target. */}
                    <span className="absolute inset-0 rounded-xl" aria-hidden />
                    {t.name}
                  </Link>
                  <StatusPill label={DOC_LABEL[t.docType]} tone="brand" />
                  {inUse[t.docType] === t.id ? (
                    <StatusPill label="in use" tone="success" />
                  ) : t.isActive ? (
                    <StatusPill label="active" tone="neutral" />
                  ) : (
                    <StatusPill label="off" tone="neutral" />
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                  {t.description || `${t.sections.length} sections`}
                </p>
              </div>

              <div className="relative flex shrink-0 items-center gap-1.5">
                <Link href={`/admin/templates/${t.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
                <button
                  onClick={() => remove(t)}
                  aria-label="Delete template"
                  className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        For each document type, the newest <strong>active</strong> template is used. Types with no
        template fall back to the built-in structure.
      </p>
    </main>
  );
}
