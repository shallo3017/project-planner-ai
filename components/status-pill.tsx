/**
 * The one way status is rendered across the app. Projects and documents used to
 * style status differently (pill vs bare coloured text) — everything routes
 * through here now so a status always looks the same wherever it appears.
 */

type Tone = 'neutral' | 'warning' | 'success' | 'brand';

const TONES: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  brand: 'border-indigo-200 bg-indigo-50 text-indigo-700',
};

export type ProjectStatus = 'draft' | 'in_review' | 'approved' | 'locked' | 'archived';

const PROJECT_TONES: Record<ProjectStatus, Tone> = {
  draft: 'neutral',
  in_review: 'warning',
  approved: 'success',
  locked: 'brand',
  archived: 'neutral',
};

export function StatusPill({
  label,
  tone = 'neutral',
  className = '',
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${TONES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return <StatusPill label={status.replace('_', ' ')} tone={PROJECT_TONES[status]} />;
}

export function DocStatusPill({ approved }: { approved: boolean }) {
  return (
    <StatusPill label={approved ? 'Approved' : 'Draft'} tone={approved ? 'success' : 'neutral'} />
  );
}
