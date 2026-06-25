'use client';

import { ArrowLeft, BadgeCheck, Check, Download, FileText, Pencil, Printer, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiDownload, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface AiDoc {
  id: string;
  docType: 'prd' | 'trd';
  content: string;
  isApproved: boolean;
  version: number;
  generatedBy?: string | null;
  updatedAt: string;
}

export default function DocumentsPage({ params }: { params: { projectId: string } }) {
  const { user } = useAuth();
  const canEdit = user?.role !== 'tech'; // owner/admin can edit; tech is read-only

  const [docs, setDocs] = useState<AiDoc[]>([]);
  const [active, setActive] = useState<'prd' | 'trd'>('prd');
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const data = await apiFetch<{ documents: AiDoc[] }>(`/documents/${params.projectId}`);
      setDocs(data.documents);
      if (data.documents.some((d) => d.docType === 'prd')) setActive('prd');
      else if (data.documents[0]) setActive(data.documents[0].docType);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setFetching(false);
    }
  }, [params.projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = docs.find((d) => d.docType === active);

  function switchTab(t: 'prd' | 'trd') {
    setEditing(false);
    setActive(t);
  }

  function startEdit() {
    if (!current) return;
    setDraft(current.content);
    setEditing(true);
  }

  async function save() {
    if (!current) return;
    setSaving(true);
    setError(null);
    try {
      const { document } = await apiFetch<{ document: AiDoc }>(`/documents/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: draft }),
      });
      setDocs((prev) => prev.map((d) => (d.id === document.id ? document : d)));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function download(docType: 'prd' | 'trd') {
    try {
      await apiDownload(`/documents/${params.projectId}/${docType}/download`, `${docType}.md`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }

  async function approve() {
    if (!current) return;
    setError(null);
    try {
      const { document } = await apiFetch<{ document: AiDoc }>(`/documents/${current.id}/approve`, {
        method: 'PATCH',
      });
      setDocs((prev) => prev.map((d) => (d.id === document.id ? document : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="no-print">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(['prd', 'trd'] as const).map((t) => {
              const exists = docs.some((d) => d.docType === t);
              return (
                <button
                  key={t}
                  disabled={!exists}
                  onClick={() => switchTab(t)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium uppercase transition-colors disabled:opacity-40 ${
                    active === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {current && (
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button onClick={save} className="btn-primary px-3 py-2 text-sm" disabled={saving}>
                    <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="btn-ghost px-3 py-2 text-sm"
                    disabled={saving}
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </>
              ) : (
                <>
                  {canEdit && !current.isApproved && (
                    <button
                      onClick={approve}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      <BadgeCheck className="h-4 w-4" /> Approve
                    </button>
                  )}
                  {canEdit && (
                    <button onClick={startEdit} className="btn-ghost px-3 py-2 text-sm">
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                  )}
                  <button onClick={() => download(active)} className="btn-ghost px-3 py-2 text-sm">
                    <Download className="h-4 w-4" /> Markdown
                  </button>
                  <button onClick={() => window.print()} className="btn-primary px-3 py-2 text-sm">
                    <Printer className="h-4 w-4" /> Print / PDF
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {current && (
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
            <span>Version {current.version}</span>
            <span>·</span>
            <span>{current.generatedBy || 'unknown'}</span>
            <span>·</span>
            {current.isApproved ? (
              <span className="text-emerald-700">Approved</span>
            ) : (
              <span className="text-amber-700">Draft (not approved)</span>
            )}
          </div>
        )}

        {error && (
          <div className="card mt-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}
      </div>

      {/* Body */}
      {fetching ? (
        <div className="mt-10 text-slate-500">Loading…</div>
      ) : !current ? (
        <div className="card mt-6 grid place-items-center gap-3 py-16 text-center">
          <FileText className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No documents yet</p>
          <p className="text-sm text-slate-500">
            Generate them from the{' '}
            <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
              dashboard
            </Link>
            .
          </p>
        </div>
      ) : editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="input mt-6 min-h-[60vh] resize-y font-mono text-sm leading-relaxed"
          spellCheck={false}
        />
      ) : (
        <article className="print-area prose prose-slate mt-6 max-w-none rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Markdown remarkPlugins={[remarkGfm]}>{current.content}</Markdown>
        </article>
      )}
    </main>
  );
}
