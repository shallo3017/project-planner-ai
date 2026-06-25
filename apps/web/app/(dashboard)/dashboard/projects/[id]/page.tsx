'use client';

import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  Lock,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiDownload, apiFetch } from '@/lib/api';

type Status = 'draft' | 'in_review' | 'approved' | 'locked' | 'archived';
const STATUSES: Status[] = ['draft', 'in_review', 'approved', 'locked', 'archived'];

const STATUS_STYLES: Record<Status, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  in_review: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  locked: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  archived: 'bg-slate-100 text-slate-500 border-slate-200',
};

interface Project {
  id: string;
  name: string;
  industry?: string;
  description?: string;
  budgetRange?: string;
  status: Status;
  deadline?: string | null;
  createdAt: string;
}
interface Doc {
  id: string;
  docType: 'prd' | 'trd';
  isApproved: boolean;
  version: number;
}

function fmt(d?: string | null): string {
  return d
    ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([
        apiFetch<{ project: Project }>(`/projects/${params.id}`),
        apiFetch<{ documents: Doc[] }>(`/documents/${params.id}`).catch(() => ({ documents: [] })),
      ]);
      setProject(p.project);
      setDocs(d.documents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove() {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await apiFetch(`/projects/${params.id}`, { method: 'DELETE' });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      await apiFetch(`/ai/generate/${params.id}`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function approve(docId: string) {
    setBusy(docId);
    try {
      const { document } = await apiFetch<{ document: Doc }>(`/documents/${docId}/approve`, {
        method: 'PATCH',
      });
      setDocs((prev) => prev.map((d) => (d.id === docId ? document : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setBusy(null);
    }
  }

  async function download(docType: 'prd' | 'trd') {
    try {
      await apiDownload(`/documents/${params.id}/${docType}/download`, `${docType}.md`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      {error && (
        <div className="card mt-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="mt-10 text-slate-500">Loading…</div>
      ) : !project ? (
        <div className="mt-10 text-slate-500">Project not found.</div>
      ) : editing ? (
        <EditForm
          project={project}
          onCancel={() => setEditing(false)}
          onSaved={(p) => {
            setProject(p);
            setEditing(false);
          }}
          onError={setError}
        />
      ) : (
        <div className="animate-fade-up mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
              >
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(true)} className="btn-ghost px-3 py-2 text-sm">
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button
                onClick={remove}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>

          <div className="card mt-6 p-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field label="Industry" value={project.industry || '—'} />
              <Field label="Budget" value={project.budgetRange || '—'} />
              <Field label="Deadline" value={fmt(project.deadline)} />
              <Field label="Created" value={fmt(project.createdAt)} />
            </dl>
            {project.description && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <dt className="mb-1 text-xs uppercase tracking-wide text-slate-400">Description</dt>
                <dd className="whitespace-pre-wrap text-sm text-slate-700">{project.description}</dd>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
            {docs.length > 0 &&
              (project.status === 'locked' ? (
                <span className="inline-flex items-center gap-1 text-sm text-slate-400">
                  <Lock className="h-4 w-4" /> Finalised
                </span>
              ) : (
                <button
                  onClick={generate}
                  disabled={generating}
                  className="text-sm text-slate-500 hover:text-slate-900 disabled:opacity-50"
                >
                  {generating ? 'Regenerating…' : '↻ Regenerate'}
                </button>
              ))}
          </div>

          {docs.length === 0 ? (
            <div className="card mt-3 grid place-items-center gap-3 py-12 text-center">
              {project.status === 'locked' ? (
                <p className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <Lock className="h-4 w-4" /> Project is finalised — unlock it to generate.
                </p>
              ) : (
                <>
                  <p className="text-sm text-slate-500">No documents yet.</p>
                  <button onClick={generate} disabled={generating} className="btn-primary px-4 py-2 text-sm">
                    <Sparkles className="h-4 w-4" /> {generating ? 'Generating…' : 'Generate PRD/TRD'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {docs.map((d) => (
                <div key={d.id} className="card flex items-center justify-between p-4">
                  <div>
                    <div className="font-semibold uppercase text-slate-900">{d.docType}</div>
                    <div className="text-xs text-slate-500">
                      v{d.version} ·{' '}
                      {d.isApproved ? (
                        <span className="text-emerald-700">Approved</span>
                      ) : (
                        <span className="text-amber-700">Draft</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/documents/${project.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Link>
                    <button
                      onClick={() => download(d.docType)}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {!d.isApproved && (
                      <button
                        onClick={() => approve(d.id)}
                        disabled={busy === d.id}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{value}</dd>
    </div>
  );
}

function EditForm({
  project,
  onCancel,
  onSaved,
  onError,
}: {
  project: Project;
  onCancel: () => void;
  onSaved: (p: Project) => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState(project.name);
  const [industry, setIndustry] = useState(project.industry ?? '');
  const [budgetRange, setBudgetRange] = useState(project.budgetRange ?? '');
  const [status, setStatus] = useState<Status>(project.status);
  const [deadline, setDeadline] = useState(
    project.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : '',
  );
  const [description, setDescription] = useState(project.description ?? '');
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { project: updated } = await apiFetch<{ project: Project }>(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          industry,
          budgetRange,
          status,
          description,
          deadline: deadline ? deadline : null,
        }),
      });
      onSaved(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card animate-fade-up mt-4 space-y-4 p-6">
      <h1 className="text-xl font-bold text-slate-900">Edit project</h1>
      <div>
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Industry</label>
          <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </div>
        <div>
          <label className="label">Budget range</label>
          <input className="input" value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Deadline</label>
          <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[120px] resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary px-4 py-2" disabled={saving}>
          <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
