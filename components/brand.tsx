import Link from 'next/link';

/** The RoadmapAI logo mark + wordmark, used across nav and auth screens. */
export function Brand({ size = 'md', href = '/' }: { size?: 'md' | 'lg'; href?: string }) {
  const box = size === 'lg' ? 'h-10 w-10 text-lg' : 'h-8 w-8 text-sm';
  const text = size === 'lg' ? 'text-xl' : 'text-base';
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span
        className={`grid ${box} place-items-center rounded-lg bg-indigo-600 font-bold text-white`}
      >
        R
      </span>
      <span className={`font-semibold tracking-tight text-slate-900 ${text}`}>
        Roadmap<span className="gradient-text">AI</span>
      </span>
    </Link>
  );
}
