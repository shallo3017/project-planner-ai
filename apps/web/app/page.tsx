'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Footer } from '@/components/footer';
import { NavBar } from '@/components/navbar';
import { useAuth } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Signed-in users land on the dashboard, not the marketing page.
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  return (
    <div className="bg-grid min-h-screen">
      <NavBar />
      <Landing />
      <Footer />
    </div>
  );
}

function Landing() {
  const features = [
    {
      title: 'Chatbot intake',
      desc: 'Describe your project in plain language and let the assistant draw out the details.',
      icon: '💬',
    },
    {
      title: 'Structured questionnaire',
      desc: 'Prefer guardrails? Answer a guided form that captures every requirement.',
      icon: '📋',
    },
    {
      title: 'PRD + TRD generation',
      desc: 'Groq-powered LLM turns your inputs into professional product & technical docs.',
      icon: '⚡',
    },
  ];
  return (
    <main className="mx-auto max-w-6xl px-6">
      <section className="py-24 text-center sm:py-32">
        <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          AI-powered roadmap generation
        </span>
        <h1 className="animate-fade-up mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl">
          Turn requirements into <span className="gradient-text">professional PRD &amp; TRD</span>{' '}
          documents.
        </h1>
        <p className="animate-fade-up mx-auto mt-6 max-w-xl text-lg text-slate-600">
          Capture project needs through a free-form chatbot or a structured questionnaire — then
          generate polished documentation in seconds.
        </p>
        <div className="animate-fade-up mt-10 flex items-center justify-center gap-3">
          <Link href="/register" className="btn-primary">
            Get started — it&apos;s free
          </Link>
          <a href="#features" className="btn-ghost">
            See how it works
          </a>
        </div>
      </section>

      <section id="features" className="grid gap-5 pb-28 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card p-6 transition-shadow hover:shadow-md">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-indigo-50 text-xl">
              {f.icon}
            </div>
            <h3 className="font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
