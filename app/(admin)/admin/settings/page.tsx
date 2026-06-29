'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AdminSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <main className="animate-fade-up px-6 py-10 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-semibold text-white">
          {initials(user?.fullName)}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {user?.fullName || 'Settings'}
          </h1>
          <p className="truncate text-sm text-slate-500">{user?.email}</p>
        </div>
        <span className="ml-auto rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium capitalize text-indigo-700">
          {user?.role ?? 'admin'}
        </span>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        {/* Account */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900">Account</h2>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            <Row label="Name" value={user?.fullName} />
            <Row label="Email" value={user?.email} />
            <Row label="Role" value={user?.role} />
          </dl>
          <button
            onClick={logout}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>

        {/* Platform */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900">Platform</h2>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            <Row label="Database" value="MongoDB (Atlas)" />
            <Row label="AI" value="Groq · llama-3.3-70b" />
            <Row label="Questionnaire" value="Editable under Questionnaire" />
          </dl>
          <p className="mt-4 text-xs text-slate-400">
            Manage the question bank from the <span className="font-medium">Questionnaire</span> tab,
            and users from <span className="font-medium">Clients</span> / <span className="font-medium">Developers</span>.
          </p>
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium capitalize text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}
