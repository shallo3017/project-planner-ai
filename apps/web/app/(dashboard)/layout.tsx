'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Footer } from '@/components/footer';
import { NavBar } from '@/components/navbar';
import { useAuth } from '@/lib/auth';

/** Shared chrome + auth guard for all /dashboard, /documents pages. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  return (
    <div className="bg-grid min-h-screen">
      <div className="no-print">
        <NavBar />
      </div>
      {!loading && user ? (
        children
      ) : (
        <div className="grid place-items-center py-40 text-slate-500">Loading…</div>
      )}
      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
}
