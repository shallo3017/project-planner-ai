'use client';

import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Eye,
  FileText,
  FolderKanban,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '@/components/loader';
import { apiDownload, apiFetch } from '@/lib/api';

type DocType = 'prd' | 'trd' | 'brd' | 'srs' | 'api_docs' | 'db_schema';
const DOC_LABEL: Record<DocType, string> = {
  prd: 'PRD',
  trd: 'TRD',
  brd: 'BRD',
  srs: 'SRS',
  api_docs: 'API Docs',
  db_schema: 'DB Schema',
};

interface Owner {
  fullName: string;
  email: string;
}
interface Project {
  id: string;
  name: string;
  industry?: string;
  status: string;
  deadline?: string | null;
  ownerId: Owner | string;
}
interface Doc {
  id: string;
  docType: DocType;
  isApproved: boolean;
  version: number;
}
interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
}
interface Milestone {
  id: string;
  title: string;
  dueDate: string | null;
  status: 'pending' | 'done';
}
interface Detail {
  project: Project;
  documents: Doc[];
  tasks: Task[];
  milestones: Milestone[];
}

function fmtDate(d?: string | null): string {
  return d
    ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
}

export default function TechDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ projects: Project[] }>('/tech/projects');
        setProjects(data.projects);
        if (data.projects[0]) setSelectedId(data.projects[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetail(null);
    try {
      setDetail(await apiFetch<Detail>(`/tech/projects/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  return (
    <main className="px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tech workspace</h1>
      <p className="mt-1 text-slate-600">Approved projects, their documents, tasks and milestones.</p>

      {error && (
        <div className="card mt-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
        {/* Project list */}
        <aside className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card space-y-2 p-4">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="card grid place-items-center gap-2 py-12 text-center text-sm text-slate-500">
              <FolderKanban className="h-8 w-8 text-slate-300" />
              No approved projects yet.
            </div>
          ) : (
            projects.map((p) => {
              const owner = typeof p.ownerId === 'object' ? p.ownerId : null;
              const active = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`card animate-fade-up relative w-full overflow-hidden p-4 text-left transition-all ${
                    active
                      ? 'border-indigo-300 shadow-md ring-1 ring-indigo-200'
                      : 'hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md'
                  }`}
                >
                  {/* Selected item gets an accent rail rather than a heavy fill. */}
                  <span
                    className={`absolute inset-y-0 left-0 w-1 transition-colors ${
                      active ? 'bg-indigo-600' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex items-center justify-between gap-2 pl-1.5">
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    {p.status === 'locked' ? (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1.5">
                    {p.industry && (
                      <span className="text-xs uppercase tracking-wide text-indigo-600">
                        {p.industry}
                      </span>
                    )}
                    {owner && <span className="text-xs text-slate-500">· {owner.fullName}</span>}
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* Detail */}
        <section>
          {!detail ? (
            <div className="card grid place-items-center py-16 text-slate-500">
              {selectedId ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> Loading project…
                </span>
              ) : (
                'Select a project.'
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-slate-900">{detail.project.name}</h2>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                    {detail.project.status}
                  </span>
                </div>
                {detail.project.deadline && (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm text-amber-700">
                    <CalendarClock className="h-4 w-4" /> Due {fmtDate(detail.project.deadline)}
                  </p>
                )}
              </div>

              <DocumentsCard projectId={detail.project.id} docs={detail.documents} />
              {/* Keyed by project: without this React reuses the cards and keeps
                  the previous project's tasks/milestones in local state. */}
              <TasksCard
                key={`t-${detail.project.id}`}
                projectId={detail.project.id}
                initial={detail.tasks}
              />
              <MilestonesCard
                key={`m-${detail.project.id}`}
                projectId={detail.project.id}
                initial={detail.milestones}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DocumentsCard({ projectId, docs }: { projectId: string; docs: Doc[] }) {
  async function download(docType: DocType) {
    await apiDownload(`/documents/${projectId}/${docType}/download`, `${docType}.md`).catch(() => {});
  }
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Documents</h3>
      {docs.length === 0 ? (
        <p className="text-sm text-slate-500">No approved documents yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{DOC_LABEL[d.docType]}</span>
              <span className="text-xs text-slate-400">v{d.version}</span>
              <Link href={`/documents/${projectId}`} className="ml-1 text-slate-500 hover:text-indigo-600" title="View">
                <Eye className="h-4 w-4" />
              </Link>
              <button onClick={() => download(d.docType)} className="text-slate-500 hover:text-indigo-600" title="Download">
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TASK_NEXT: Record<Task['status'], Task['status']> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

function TasksCard({ projectId, initial }: { projectId: string; initial: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  // Every handler below now reports failures. Previously they had no try/catch,
  // so a failed request (e.g. the DB unreachable) silently did nothing and the
  // buttons looked broken.
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const { task } = await apiFetch<{ task: Task }>(`/tech/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title: t }),
      });
      setTasks((prev) => [...prev, task]);
      setTitle('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add the task');
    } finally {
      setSaving(false);
    }
  }

  async function cycle(task: Task) {
    const status = TASK_NEXT[task.status];
    try {
      const { task: updated } = await apiFetch<{ task: Task }>(`/tech/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setTasks((prev) => prev.map((x) => (x.id === task.id ? updated : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update the task');
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/tech/tasks/${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete the task');
    }
  }

  const done = tasks.filter((t) => t.status === 'done').length;

  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Tasks{' '}
          <span className="text-slate-400">
            ({done}/{tasks.length} done)
          </span>
        </h3>
        {tasks.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-slate-500">{pct}%</span>
          </div>
        )}
      </div>
      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2.5">
            <button onClick={() => cycle(t)} title={t.status} className="shrink-0">
              {t.status === 'done' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : t.status === 'in_progress' ? (
                <Clock className="h-4 w-4 text-amber-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300" />
              )}
            </button>
            <span className={`flex-1 text-sm ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
              {t.title}
            </span>
            <button onClick={() => remove(t.id)} className="text-slate-300 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
            No tasks yet — add the first one below.
          </li>
        )}
      </ul>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      <div className="mt-3 flex items-center gap-2">
        <input
          className="input"
          placeholder="Add a task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void add();
            }
          }}
        />
        <button
          onClick={add}
          disabled={saving || !title.trim()}
          className="btn-ghost shrink-0 px-3 py-2 text-sm disabled:opacity-50"
        >
          {saving ? <Spinner /> : <Plus className="h-4 w-4" />} Add
        </button>
      </div>
    </div>
  );
}

function MilestonesCard({ projectId, initial }: { projectId: string; initial: Milestone[] }) {
  const [items, setItems] = useState<Milestone[]>(initial);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const { milestone } = await apiFetch<{ milestone: Milestone }>(
        `/tech/projects/${projectId}/milestones`,
        { method: 'POST', body: JSON.stringify({ title: t, dueDate: due || null }) },
      );
      setItems((prev) => [...prev, milestone]);
      setTitle('');
      setDue('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add the milestone');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(m: Milestone) {
    const status = m.status === 'done' ? 'pending' : 'done';
    try {
      const { milestone } = await apiFetch<{ milestone: Milestone }>(`/tech/milestones/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.map((x) => (x.id === m.id ? milestone : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update the milestone');
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/tech/milestones/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete the milestone');
    }
  }

  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Milestones</h3>
      <ul className="space-y-1.5">
        {items.map((m) => (
          <li key={m.id} className="flex items-center gap-2.5">
            <button onClick={() => toggle(m)} className="shrink-0">
              {m.status === 'done' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300" />
              )}
            </button>
            <span className={`flex-1 text-sm ${m.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
              {m.title}
            </span>
            {m.dueDate && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <CalendarClock className="h-3 w-3" /> {fmtDate(m.dueDate)}
              </span>
            )}
            <button onClick={() => remove(m.id)} className="text-slate-300 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
            No milestones yet — add the first one below.
          </li>
        )}
      </ul>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className="input flex-1"
          placeholder="Add a milestone…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void add();
            }
          }}
        />
        <input
          type="date"
          className="input sm:w-40"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <button
          onClick={add}
          disabled={saving || !title.trim()}
          className="btn-ghost shrink-0 px-3 py-2 text-sm disabled:opacity-50"
        >
          {saving ? <Spinner /> : <Plus className="h-4 w-4" />} Add
        </button>
      </div>
    </div>
  );
}
