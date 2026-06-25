'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth, type User } from '@/lib/auth';

export default function ClientSettingsPage() {
  const { user, updateUser } = useAuth();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
      <p className="mt-1 text-slate-600">Manage your account.</p>

      <ProfileSection user={user} onUpdated={updateUser} />
      <PasswordSection />
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
    <form onSubmit={save} className="card mt-8 p-6">
      <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input bg-slate-50 text-slate-500" value={user?.email ?? ''} disabled />
        </div>
        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>
        )}
        <button type="submit" className="btn-primary px-4 py-2" disabled={saving}>
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
    <form onSubmit={save} className="card mt-6 p-6">
      <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
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
        <button type="submit" className="btn-primary px-4 py-2" disabled={saving}>
          <Check className="h-4 w-4" /> {saving ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  );
}
