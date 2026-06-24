'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Footer } from '@/components/footer';
import { NavBar } from '@/components/navbar';
import { useAuth } from '@/lib/auth';

/** Shared chrome + admin-only guard for every /admin/* page. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/dashboard');
  }, [loading, user, router]);

  const ready = !loading && user && user.role === 'admin';

  return (
    <div className="bg-grid min-h-screen">
      <NavBar />
      {ready ? (
        <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
      ) : (
        <div className="grid place-items-center py-40 text-slate-500">Loading…</div>
      )}
      <Footer />
    </div>
  );
}
