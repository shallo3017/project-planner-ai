'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: 'client' | 'admin' | 'tech';
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABEL: Record<AdminUser['role'], string> = {
  client: 'Client',
  tech: 'Developer',
  admin: 'Admin',
};

type Tab = 'all' | 'client' | 'tech' | 'admin';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'client', label: 'Clients' },
  { key: 'tech', label: 'Developers' },
  { key: 'admin', label: 'Admins' },
];

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ users: AdminUser[] }>('/admin/users');
      setUsers(data.users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: users.length,
      client: users.filter((u) => u.role === 'client').length,
      tech: users.filter((u) => u.role === 'tech').length,
      admin: users.filter((u) => u.role === 'admin').length,
    }),
    [users],
  );

  async function changeRole(id: string, role: AdminUser['role']) {
    setBusyId(id);
    setError(null);
    try {
      const { user } = await apiFetch<{ user: AdminUser }>(`/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(u: AdminUser) {
    setBusyId(u.id);
    setError(null);
    try {
      const { user } = await apiFetch<{ user: AdminUser }>(`/admin/users/${u.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? user : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  }

  const visible = tab === 'all' ? users : users.filter((u) => u.role === tab);

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Users</h1>
      <p className="mt-1 text-slate-600">Manage roles and access for everyone on the platform.</p>

      <div className="mt-8 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}{' '}
              <span className={tab === t.key ? 'text-indigo-100' : 'text-slate-400'}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <button onClick={load} className="text-sm text-slate-500 hover:text-slate-900">
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="card mt-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="card mt-4 overflow-hidden">
        {loading ? (
          <div className="grid place-items-center py-16 text-slate-500">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="grid place-items-center py-16 text-slate-500">No users in this view.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((u) => {
                const isSelf = me?.id === u.id;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {u.fullName}
                      {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf || busy}
                        onChange={(e) => changeRole(u.id, e.target.value as AdminUser['role'])}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="client">{ROLE_LABEL.client}</option>
                        <option value="tech">{ROLE_LABEL.tech}</option>
                        <option value="admin">{ROLE_LABEL.admin}</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="text-slate-400">Suspended</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => toggleStatus(u)}
                        disabled={isSelf || busy}
                        className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          u.isActive
                            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {u.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
