'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Stats {
  users: { total: number; client: number; tech: number; admin: number };
  projects: {
    total: number;
    draft: number;
    in_review: number;
    approved: number;
    locked: number;
    archived: number;
  };
  documents: { total: number; approved: number };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await apiFetch<Stats>('/admin/stats'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Overview</h1>
      <p className="mt-1 text-slate-600">Platform activity at a glance.</p>

      {error && (
        <div className="card mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Headline KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Kpi label="Users" value={stats?.users.total} loading={loading} href="/admin/users" />
        <Kpi label="Projects" value={stats?.projects.total} loading={loading} href="/admin/projects" />
        <Kpi label="Documents" value={stats?.documents.total} loading={loading} />
      </div>

      {/* Breakdowns */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Users by role">
          <Bar label="Clients" value={stats?.users.client ?? 0} total={stats?.users.total ?? 0} color="bg-slate-400" />
          <Bar label="Developers" value={stats?.users.tech ?? 0} total={stats?.users.total ?? 0} color="bg-sky-500" />
          <Bar label="Admins" value={stats?.users.admin ?? 0} total={stats?.users.total ?? 0} color="bg-indigo-500" />
        </Panel>

        <Panel title="Projects by status">
          <Bar label="Draft" value={stats?.projects.draft ?? 0} total={stats?.projects.total ?? 0} color="bg-slate-400" />
          <Bar label="In review" value={stats?.projects.in_review ?? 0} total={stats?.projects.total ?? 0} color="bg-amber-500" />
          <Bar label="Approved" value={stats?.projects.approved ?? 0} total={stats?.projects.total ?? 0} color="bg-emerald-500" />
          <Bar label="Locked" value={stats?.projects.locked ?? 0} total={stats?.projects.total ?? 0} color="bg-indigo-500" />
          <Bar label="Archived" value={stats?.projects.archived ?? 0} total={stats?.projects.total ?? 0} color="bg-slate-300" />
        </Panel>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  loading,
  href,
}: {
  label: string;
  value?: number;
  loading: boolean;
  href?: string;
}) {
  const body = (
    <div className="card p-6 transition-shadow hover:shadow-md">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-4xl font-bold text-slate-900">{loading ? '—' : (value ?? 0)}</div>
      {href && <div className="mt-2 text-xs text-indigo-600">Manage →</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Bar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
