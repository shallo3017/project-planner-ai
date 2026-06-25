'use client';

import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Question = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  placeholder?: string;
};

// Industry-specific question banks. Answers compile into a rich project brief.
const INDUSTRY_QUESTIONS: Record<string, Question[]> = {
  Fintech: [
    { id: 'product', label: 'What financial product or service?', type: 'text', placeholder: 'e.g. digital wallet, lending, payments' },
    { id: 'compliance', label: 'Key compliance needs', type: 'select', options: ['KYC/AML', 'PCI-DSS', 'PSD2 / Open Banking', 'Not sure'] },
    { id: 'users', label: 'Who are the primary users?', type: 'text', placeholder: 'e.g. consumers, SMBs, agents' },
    { id: 'integrations', label: 'Payment / banking integrations needed', type: 'text', placeholder: 'e.g. UPI, Stripe, card networks' },
  ],
  Healthcare: [
    { id: 'solution', label: 'Type of healthcare solution', type: 'select', options: ['Telehealth', 'Patient records (EHR)', 'Appointment booking', 'Wellness/fitness', 'Other'] },
    { id: 'audience', label: 'Patient-facing or provider-facing?', type: 'select', options: ['Patient', 'Provider', 'Both'] },
    { id: 'compliance', label: 'Compliance requirements', type: 'text', placeholder: 'e.g. HIPAA, GDPR, India DPDP' },
    { id: 'features', label: 'Must-have features', type: 'textarea', placeholder: 'e.g. video consults, e-prescriptions, reminders' },
  ],
  'E-commerce / Retail': [
    { id: 'model', label: 'Business model', type: 'select', options: ['D2C brand', 'Marketplace', 'B2B wholesale', 'Subscription'] },
    { id: 'catalog', label: 'What are you selling?', type: 'text', placeholder: 'e.g. apparel, electronics, groceries' },
    { id: 'payments', label: 'Payment methods', type: 'text', placeholder: 'e.g. cards, UPI, COD, wallets' },
    { id: 'features', label: 'Key features', type: 'textarea', placeholder: 'e.g. recommendations, reviews, loyalty' },
  ],
  Education: [
    { id: 'type', label: 'Type of platform', type: 'select', options: ['LMS / courses', 'Live tutoring', 'Test prep', 'School admin', 'Other'] },
    { id: 'audience', label: 'Target learners', type: 'text', placeholder: 'e.g. K-12, university, professionals' },
    { id: 'features', label: 'Core features', type: 'textarea', placeholder: 'e.g. video lessons, quizzes, certificates' },
  ],
  'SaaS / Productivity': [
    { id: 'problem', label: 'What problem does it solve?', type: 'textarea', placeholder: 'Describe the core workflow you improve' },
    { id: 'users', label: 'Who is it for?', type: 'text', placeholder: 'e.g. marketing teams, developers, HR' },
    { id: 'features', label: 'Key features', type: 'textarea', placeholder: 'e.g. dashboards, automations, integrations' },
  ],
  Other: [
    { id: 'idea', label: 'Describe your project idea', type: 'textarea', placeholder: 'What are you building and for whom?' },
    { id: 'features', label: 'Key features', type: 'textarea', placeholder: 'List the must-have capabilities' },
  ],
};

const INDUSTRIES = Object.keys(INDUSTRY_QUESTIONS);

export default function QuestionnairePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [deadline, setDeadline] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = useMemo(() => INDUSTRY_QUESTIONS[industry] ?? [], [industry]);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function compileDescription(): string {
    const lines = [`Industry: ${industry}`, ''];
    for (const q of questions) {
      const a = answers[q.id]?.trim();
      if (a) lines.push(`${q.label}\n→ ${a}\n`);
    }
    return lines.join('\n');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          industry,
          description: compileDescription(),
          budgetRange: budgetRange || undefined,
          deadline: deadline || undefined,
        }),
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/dashboard/new"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Guided questionnaire</h1>
      <p className="mt-1 text-slate-600">
        Pick your industry and answer a few questions — we’ll build the brief.
      </p>

      <form onSubmit={handleSubmit} className="card animate-fade-up mt-8 space-y-5 p-6">
        <div>
          <label className="label" htmlFor="name">
            Project name
          </label>
          <input
            id="name"
            className="input"
            placeholder="e.g. NeoBank wallet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="industry">
            Industry
          </label>
          <select
            id="industry"
            className="input"
            value={industry}
            onChange={(e) => {
              setIndustry(e.target.value);
              setAnswers({});
            }}
            required
          >
            <option value="" disabled>
              Select an industry…
            </option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        {/* Industry-specific questions */}
        {questions.length > 0 && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            {questions.map((q) => (
              <div key={q.id}>
                <label className="label" htmlFor={q.id}>
                  {q.label}
                </label>
                {q.type === 'textarea' ? (
                  <textarea
                    id={q.id}
                    className="input min-h-[80px] resize-y bg-white"
                    placeholder={q.placeholder}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                ) : q.type === 'select' ? (
                  <select
                    id={q.id}
                    className="input bg-white"
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  >
                    <option value="">Select…</option>
                    {q.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={q.id}
                    className="input bg-white"
                    placeholder={q.placeholder}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="budget">
              Budget range
            </label>
            <input
              id="budget"
              className="input"
              placeholder="$10k–$50k"
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="deadline">
              Deadline
            </label>
            <input
              id="deadline"
              type="date"
              className="input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button type="submit" className="btn-primary px-4 py-2" disabled={submitting || !industry}>
            <Sparkles className="h-4 w-4" /> {submitting ? 'Creating…' : 'Create project'}
          </button>
          <Link href="/dashboard/new" className="btn-ghost px-4 py-2">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
