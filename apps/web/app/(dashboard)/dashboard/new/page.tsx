'use client';

import { ArrowLeft, ClipboardList, MessageSquare, PencilLine } from 'lucide-react';
import Link from 'next/link';

const OPTIONS = [
  {
    href: '/dashboard/new/manual',
    title: 'Quick create',
    desc: 'Fill a short form yourself — name, industry, a description, and an optional deadline.',
    icon: PencilLine,
    available: true,
  },
  {
    href: '/dashboard/new/questionnaire',
    title: 'Guided questionnaire',
    desc: 'Answer industry-specific questions and we build a rich project brief for you.',
    icon: ClipboardList,
    available: true,
  },
  {
    href: '/dashboard/new/chat',
    title: 'Chat with AI',
    desc: 'Describe your idea in a conversation and let the assistant draft the project.',
    icon: MessageSquare,
    available: true,
  },
];

export default function NewProjectChoicePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Start a new project</h1>
      <p className="mt-1 text-slate-600">Pick how you’d like to begin.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const inner = (
            <div
              className={`card flex h-full flex-col p-6 transition-shadow ${
                o.available ? 'hover:shadow-md' : 'opacity-60'
              }`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-semibold text-slate-900">
                {o.title}
                {!o.available && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    soon
                  </span>
                )}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{o.desc}</p>
            </div>
          );
          return o.available ? (
            <Link key={o.title} href={o.href}>
              {inner}
            </Link>
          ) : (
            <div key={o.title} aria-disabled>
              {inner}
            </div>
          );
        })}
      </div>
    </main>
  );
}
