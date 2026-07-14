'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageLoader } from '@/components/loader';
import { useAuth } from '@/lib/auth';

/**
 * Tech reviewers share the Documents and Settings pages that live under
 * /dashboard, but must not reach the client's project area (the list, the intake
 * flow, or a project page) — they don't create projects.
 */
const TECH_ALLOWED = ['/dashboard/documents', '/dashboard/settings'];

/** Shared sidebar chrome + auth guard for all /dashboard, /documents pages. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const techOutOfBounds =
    user?.role === 'tech' &&
    !TECH_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (techOutOfBounds) router.replace('/tech/dashboard');
  }, [loading, user, techOutOfBounds, router]);

  if (loading) return <PageLoader label="Checking your session" />;
  if (!user) return <PageLoader label="Redirecting to sign in" />;
  if (techOutOfBounds) return <PageLoader label="Taking you to your workspace" />;

  return <AppShell>{children}</AppShell>;
}
