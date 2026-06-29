'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth';

/** Shared sidebar chrome + admin-only guard for every /admin/* page. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/dashboard');
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'admin') {
    return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;
  }

  return <AppShell>{children}</AppShell>;
}
