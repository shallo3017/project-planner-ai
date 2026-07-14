'use client';

import { Check, Lock } from 'lucide-react';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth, type User } from '@/lib/auth';

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

export default function ClientSettingsPage() {
  const { user, updateUser } = useAuth();

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
        {user?.role && (
          <span className="ml-auto rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium capitalize text-indigo-700">
            {user.role}
          </span>
        )}
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <ProfileSection user={user} onUpdated={updateUser} />
        <PasswordSection />
      </div>
    </main>
  );
}

function ProfileSection({ user, onUpdated }: { user: User | null; onUpdated: (u: User) => void }) {
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const { user: updated } = await apiFetch<{ user: User }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ fullName }),
      });
      onUpdated(updated);
      setMsg({ ok: true, text: 'Profile updated' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Update failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card flex flex-col">
      <div className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        <p className="mt-0.5 text-xs text-slate-500">Update your display name.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <input
                className="input cursor-not-allowed bg-slate-50 pr-10 text-slate-500"
                value={user?.email ?? ''}
                disabled
              />
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Your email is your sign-in — contact support to change it.
            </p>
          </div>
          {msg && (
            <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>
          )}
        </div>
      </div>

      {/* Actions live in a footer, not floating under the fields. */}
      <div className="mt-auto flex justify-end border-t border-slate-100 px-6 py-4">
        <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={saving}>
          <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirm) {
      setMsg({ ok: false, text: 'New passwords do not match' });
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMsg({ ok: true, text: 'Password updated' });
      setCurrent('');
      setNew('');
      setConfirm('');
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Update failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card flex flex-col">
      <div className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
        <p className="mt-0.5 text-xs text-slate-500">Use at least 8 characters.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="label">Confirm new</label>
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </div>
          </div>
          {msg && (
            <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>
          )}
        </div>
      </div>

      <div className="mt-auto flex justify-end border-t border-slate-100 px-6 py-4">
        {/* Secondary to the profile form's primary — one filled button per view. */}
        <button type="submit" className="btn-ghost px-4 py-2 text-sm" disabled={saving}>
          <Check className="h-4 w-4" /> {saving ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  );
}
