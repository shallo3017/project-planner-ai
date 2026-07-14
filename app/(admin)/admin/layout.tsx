'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageLoader } from '@/components/loader';
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

  // Distinguish the three states. Previously all of them rendered the same
  // "Loading…", so a non-admin sat in front of what looked like a hung page.
  if (loading) return <PageLoader label="Checking your session" />;
  if (!user) return <PageLoader label="Redirecting to sign in" />;
  if (user.role !== 'admin') return <PageLoader label="Admins only — taking you back" />;

  return <AppShell>{children}</AppShell>;
}
