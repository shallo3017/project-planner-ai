'use client';

import { useAuth } from '@/lib/auth';

export default function AdminSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <main className="mx-auto max-w-2xl animate-fade-up px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
      <p className="mt-1 text-slate-600">Your account and platform configuration.</p>

      {/* Account */}
      <section className="card mt-8 p-6">
        <h2 className="text-sm font-semibold text-slate-900">Account</h2>
        <dl className="mt-4 divide-y divide-slate-100 text-sm">
          <Row label="Name" value={user?.fullName} />
          <Row label="Email" value={user?.email} />
          <Row label="Role" value={user?.role} />
        </dl>
        <button onClick={logout} className="btn-ghost mt-6 px-4 py-2 text-sm">
          Sign out
        </button>
      </section>

      {/* Platform (read-only for now) */}
      <section className="card mt-6 p-6">
        <h2 className="text-sm font-semibold text-slate-900">Platform</h2>
        <dl className="mt-4 divide-y divide-slate-100 text-sm">
          <Row label="Database" value="MongoDB (Atlas)" />
          <Row label="Demo seeding" value="On in development (SEED_DEMO)" />
          <Row label="AI generation" value="Not configured yet (Groq)" />
        </dl>
        <p className="mt-4 text-xs text-slate-400">
          Editable platform settings (question bank, team assignments, AI keys) arrive with their
          features.
        </p>
      </section>
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
