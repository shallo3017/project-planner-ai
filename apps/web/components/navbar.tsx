'use client';

import {
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Brand } from './brand';

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

/** Top navigation. Auth-aware, role-based links. */
export function NavBar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Brand />
          {user && (
            <nav className="hidden items-center gap-1 sm:flex">
              {user.role === 'admin' ? (
                <>
                  <NavLink href="/admin/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                  <NavLink href="/admin/users" icon={Users}>Users</NavLink>
                  <NavLink href="/admin/projects" icon={FolderKanban}>Projects</NavLink>
                  <NavLink href="/admin/settings" icon={Settings}>Settings</NavLink>
                </>
              ) : (
                <>
                  <NavLink href="/dashboard" icon={FolderKanban}>My Projects</NavLink>
                  <NavLink href="/dashboard/new" icon={Plus}>New Project</NavLink>
                </>
              )}
            </nav>
          )}
        </div>

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
            <button onClick={logout} className="btn-ghost px-3 py-2 text-sm">
              <LogOut className="h-4 w-4" />
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
