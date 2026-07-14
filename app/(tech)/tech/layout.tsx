'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageLoader } from '@/components/loader';
import { homePathForRole, useAuth } from '@/lib/auth';

/** Shared chrome + guard for the tech workspace (tech + admin only). */
export default function TechLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'tech' && user.role !== 'admin') router.replace(homePathForRole(user.role));
  }, [loading, user, router]);

  if (loading) return <PageLoader label="Checking your session" />;
  if (!user) return <PageLoader label="Redirecting to sign in" />;
  if (user.role !== 'tech' && user.role !== 'admin') {
    return <PageLoader label="Tech workspace is restricted — taking you back" />;
  }

  return <AppShell>{children}</AppShell>;
}
