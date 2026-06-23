'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Footer } from '@/components/footer';
import { NavBar } from '@/components/navbar';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string;
  name: string;
  industry?: string;
  description?: string;
  status: 'draft' | 'in_review' | 'approved' | 'locked' | 'archived';
  createdAt: string;
}

const STATUS_STYLES: Record<Project['status'], string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  in_review: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  locked: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  archived: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Client-side route protection: bounce unauthenticated users to /login.
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="bg-grid min-h-screen">
        <NavBar />
        <div className="grid place-items-center py-40 text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="bg-grid min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {user.fullName.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-slate-600">Create a project, then generate its PRD &amp; TRD.</p>
        </div>
        <ProjectsSection />
      </main>
      <Footer />
    </div>
  );
}

function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ projects: Project[] }>('/projects');
      setProjects(data.projects);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[360px_1fr]">
      <CreateProject onCreated={load} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Your projects <span className="text-slate-400">({projects.length})</span>
          </h2>
          <button onClick={load} className="text-sm text-slate-500 hover:text-slate-900">
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card grid place-items-center py-16 text-slate-500">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="card grid place-items-center gap-2 py-16 text-center">
            <div className="text-3xl">🗂️</div>
            <p className="font-medium text-slate-700">No projects yet</p>
            <p className="text-sm text-slate-500">Create your first one on the left.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CreateProject({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          industry: industry || undefined,
          description: description || undefined,
        }),
      });
      setName('');
      setIndustry('');
      setDescription('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card animate-fade-up h-fit p-6">
      <h2 className="text-lg font-semibold text-slate-900">New project</h2>
      <p className="mt-1 text-sm text-slate-500">The starting point for your roadmap.</p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="input"
            placeholder="e.g. Fintech onboarding app"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="industry">
            Industry <span className="text-slate-600">(optional)</span>
          </label>
          <input
            id="industry"
            className="input"
            placeholder="Fintech, Health, Retail…"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description <span className="text-slate-600">(optional)</span>
          </label>
          <textarea
            id="description"
            className="input min-h-[88px] resize-y"
            placeholder="A sentence or two about the goal…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create project'}
        </button>
      </div>
    </form>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const created = new Date(project.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <div className="card animate-fade-up flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{project.name}</h3>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
        >
          {project.status.replace('_', ' ')}
        </span>
      </div>
      {project.industry && (
        <p className="mt-1 text-xs uppercase tracking-wide text-indigo-600">
          {project.industry}
        </p>
      )}
      {project.description && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{project.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">Created {created}</span>
        <button
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500"
          disabled
          title="Coming soon"
        >
          Generate PRD/TRD · soon
        </button>
      </div>
    </div>
  );
}
