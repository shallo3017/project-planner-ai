'use client';

import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_TEMPLATE,
  TemplateEditor,
  type TemplateForm,
} from '@/components/admin/template-editor';
import { Dots } from '@/components/loader';
import { apiFetch } from '@/lib/api';

export default function EditTemplatePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState<TemplateForm>(EMPTY_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The list endpoint is the only read we have; find ours in it.
      const { templates } = await apiFetch<{ templates: (TemplateForm & { id: string })[] }>(
        '/admin/templates',
      );
      const found = templates.find((t) => t.id === params.id);
      if (!found) throw new Error('Template not found');
      setForm(found);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!form.name.trim()) {
      setError('Give the template a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/admin/templates/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          sections: form.sections.filter((s) => s.heading.trim()),
        }),
      });
      router.push('/admin/templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete template "${form.name}"?`)) return;
    try {
      await apiFetch(`/admin/templates/${params.id}`, { method: 'DELETE' });
      router.push('/admin/templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <main className="animate-fade-up px-6 py-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/templates"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Templates
          </Link>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <h1 className="truncate text-sm font-semibold text-slate-900">
            {loading ? 'Loading…' : form.name || 'Untitled template'}
          </h1>
        </div>

        {!loading && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={remove}
              aria-label="Delete template"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="card mt-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid place-items-center py-24">
          <div className="flex flex-col items-center gap-4">
            <Dots />
            <p className="text-sm text-slate-500">Loading template…</p>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <TemplateEditor form={form} onChange={setForm} />
        </div>
      )}
    </main>
  );
}
