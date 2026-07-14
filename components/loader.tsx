/**
 * The app's loading states. Deliberately quiet — no spinner-of-doom, no flashing.
 */

/** Inline spinner for buttons and small regions. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 ${className}`}
    />
  );
}

/**
 * Three-dot wave — the dots rise and fall in sequence. Reads as "thinking"
 * without the frantic feel of a spinner.
 */
export function Dots({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-flex items-end gap-1.5 ${className}`}
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="animate-dot h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Full-page loader — used by the route guards while a session is being checked.
 * `label` says what is actually happening, so an unauthorized user never sits in
 * front of an ambiguous, infinite-looking "Loading…".
 */
export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <Dots />
        <p className="text-sm text-slate-500">{label}…</p>
      </div>
    </div>
  );
}
