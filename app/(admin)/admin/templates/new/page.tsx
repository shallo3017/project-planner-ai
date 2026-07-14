'use client';

import { ArrowLeft, ChevronRight, FileText, Pencil, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  EMPTY_TEMPLATE,
  TemplateEditor,
  type TemplateForm,
} from '@/components/admin/template-editor';
import { Dots } from '@/components/loader';
import { apiFetch } from '@/lib/api';

type Method = 'manual' | 'paste' | 'pdf';
type Step = 'method' | 'paste' | 'edit';

const METHODS: {
  key: Method;
  icon: typeof Pencil;
  tint: string;
  title: string;
  subtitle: string;
  ai?: boolean;
}[] = [
  {
    key: 'manual',
    icon: Pencil,
    tint: 'bg-indigo-50 text-indigo-600',
    title: 'Build manually',
    subtitle: 'Start from a blank template and add sections in the order you want them.',
  },
  {
    key: 'paste',
    icon: FileText,
    tint: 'bg-pink-50 text-pink-600',
    title: 'Paste content',
    subtitle: "Paste an existing doc or outline and we'll structure it into sections automatically.",
    ai: true,
  },
  {
    key: 'pdf',
    icon: Upload,
    tint: 'bg-amber-50 text-amber-600',
    title: 'Import PDF',
    subtitle: "Upload a PDF and we'll extract the structure, headings, and section descriptions.",
    ai: true,
  },
];

export default function NewTemplatePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('method');
  const [form, setForm] = useState<TemplateForm>(EMPTY_TEMPLATE);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Merge an AI-extracted draft into the form and move to the editor. */
  function applyDraft(draft: Partial<TemplateForm>) {
    setForm((f) => ({
      ...f,
      ...draft,
      sections: draft.sections?.length ? draft.sections : f.sections,
    }));
    setStep('edit');
  }

  function choose(method: Method) {
    setError(null);
    if (method === 'manual') return setStep('edit');
    if (method === 'paste') return setStep('paste');
    fileRef.current?.click(); // pdf
  }

  async function extractFromText() {
    if (pasted.trim().length < 40) {
      setError('Paste a bit more content so the structure can be detected.');
      return;
    }
    setBusy('Reading your content');
    setError(null);
    try {
      const { template } = await apiFetch<{ template: Partial<TemplateForm> }>(
        '/admin/templates/extract',
        { method: 'POST', body: JSON.stringify({ text: pasted }) },
      );
      applyDraft(template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that content');
    } finally {
      setBusy(null);
    }
  }

  async function extractFromPdf(file: File) {
    setBusy('Extracting the structure from your PDF');
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      // FormData must not carry the JSON content-type apiFetch would add.
      const res = await fetch('/api/admin/templates/extract', {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
        body,
      });
      const data = (await res.json().catch(() => ({}))) as {
        template?: Partial<TemplateForm>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Could not read that PDF');
      applyDraft(data.template ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that PDF');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save() {
    if (!form.name.trim()) {
      setError('Give the template a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/admin/templates', {
        method: 'POST',
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

  return (
    <main className="animate-fade-up px-6 py-8 lg:px-8">
      {/* Header — Back always returns to the templates list. */}
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
            New template
            <span className="ml-2 hidden font-normal text-slate-400 sm:inline">
              {step === 'method'
                ? "· Choose how you'd like to start."
                : step === 'paste'
                  ? '· Paste your content.'
                  : '· Shape the document.'}
            </span>
          </h1>
        </div>

        {step === 'edit' && (
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setStep('method')} className="btn-ghost px-4 py-2 text-sm">
              Start over
            </button>
            <button onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="card mt-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Hidden PDF picker, driven by the "Import PDF" card. */}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void extractFromPdf(file);
        }}
      />

      {busy ? (
        <div className="grid place-items-center py-24">
          <div className="flex flex-col items-center gap-4">
            <Dots />
            <p className="text-sm text-slate-500">{busy}…</p>
          </div>
        </div>
      ) : step === 'method' ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <h2 className="text-xl font-bold text-slate-900">How do you want to start?</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick a starting point — you can always edit everything in the next step.
          </p>

          <div className="mt-6 space-y-3">
            {METHODS.map(({ key, icon: Icon, tint, title, subtitle, ai }) => (
              <button
                key={key}
                onClick={() => choose(key)}
                className="card card-interactive group flex w-full items-center gap-4 p-4 text-left"
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{title}</span>
                    {ai && (
                      <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                        AI
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-500">{subtitle}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      ) : step === 'paste' ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Paste your content</h2>
              <p className="mt-1 text-sm text-slate-500">
                An existing document or a rough outline — we&apos;ll pull out the section structure.
              </p>
            </div>
            <button
              onClick={() => setStep('method')}
              aria-label="Back to methods"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <textarea
            className="input mt-5 min-h-[280px] font-mono text-sm"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={'# Product Requirements Document\n\n## 1. Overview\n…\n\n## 2. Goals\n…'}
            autoFocus
          />

          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={() => setStep('method')} className="btn-ghost px-4 py-2 text-sm">
              Back
            </button>
            <button onClick={extractFromText} className="btn-primary px-4 py-2 text-sm">
              Structure it
            </button>
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
