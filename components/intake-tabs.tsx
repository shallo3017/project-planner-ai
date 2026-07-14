'use client';

import { ListChecks, MessageSquare, Zap } from 'lucide-react';
import Link from 'next/link';

const TABS = [
  { key: 'chat', href: '/dashboard/new/chat', label: 'Chat with AI', icon: MessageSquare },
  {
    key: 'questionnaire',
    href: '/dashboard/new/questionnaire',
    label: 'Guided questionnaire',
    icon: ListChecks,
  },
  { key: 'manual', href: '/dashboard/new/manual', label: 'Quick form', icon: Zap },
] as const;

export type IntakeMethod = (typeof TABS)[number]['key'];

/**
 * Segmented control for the three intake methods — a recessed track with the
 * active segment raised as a white pill (rather than a detached bordered box).
 */
export function IntakeTabs({ current }: { current: IntakeMethod }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {TABS.map(({ key, href, label, icon: Icon }) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : ''}`} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
