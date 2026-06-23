'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Brand } from './brand';

/** Top navigation. Auth-aware: shows user + logout, or sign-in/up CTAs. */
export function NavBar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Brand />

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-900">{user.fullName}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                user.role === 'admin'
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-slate-100 text-slate-600'
              }`}
            >
              {user.role}
            </span>
            <button onClick={logout} className="btn-ghost px-4 py-2 text-sm">
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost px-4 py-2 text-sm">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary px-4 py-2 text-sm">
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
