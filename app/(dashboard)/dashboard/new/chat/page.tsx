'use client';

import {
  ArrowLeft,
  ChevronRight,
  ListChecks,
  Send,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, apiStream } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { IntakeTabs } from '@/components/intake-tabs';
import { MicButton, VoiceWave } from '@/components/mic-button';

type Turn = { role: 'user' | 'assistant'; content: string };

const GREETING: Turn = {
  role: 'assistant',
  content:
    "Hi! I'll help you scope your project. To start — what do you want to build, and who is it for?",
};

/** The other ways to scope a project — offered when the chat is still empty. */
const OTHER_METHODS: {
  icon: LucideIcon;
  tint: string;
  title: string;
  subtitle: string;
  href: string;
}[] = [
  {
    icon: ListChecks,
    tint: 'bg-indigo-50 text-indigo-600',
    title: 'Guided questionnaire',
    subtitle: 'Answer a few structured questions, tailored to your industry.',
    href: '/dashboard/new/questionnaire',
  },
  {
    icon: Zap,
    tint: 'bg-amber-50 text-amber-600',
    title: 'Quick form',
    subtitle: 'Already know the details? Fill a short form and generate straight away.',
    href: '/dashboard/new/manual',
  },
];

// Quick replies to speed up common answers (one nudges the tech-stack question).
const CHIPS = [
  "It's a mobile app",
  "It's a web app",
  'For consumers (B2C)',
  'We prefer React & Node.js',
  'No tech-stack preference',
  'Budget around ₹20L',
];

function initials(name?: string): string {
  if (!name) return 'You';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ChatIntakePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Turn[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [completeness, setCompleteness] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const hasUserTurn = messages.some((m) => m.role === 'user');

  /** Score how complete the brief is, so the user knows when they can generate. */
  const refreshCompleteness = useCallback(async (history: Turn[]) => {
    try {
      const { project } = await apiFetch<{ project: { completeness?: number } }>(
        '/ai/chat/extract',
        { method: 'POST', body: JSON.stringify({ messages: history }) },
      );
      if (typeof project.completeness === 'number') setCompleteness(project.completeness);
    } catch {
      /* the meter is a nicety — never surface its failures */
    }
  }, []);

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);

    // Stream the reply into a placeholder bubble so text appears as it's written.
    let streamed = false;
    let final = next;
    try {
      await apiStream('/ai/chat/stream', { messages: next }, (chunk) => {
        if (!streamed) {
          streamed = true;
          setSending(false); // first token landed — drop the typing dots
          setMessages((m) => [...m, { role: 'assistant', content: chunk }]);
          return;
        }
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = { ...last, content: last.content + chunk };
          }
          final = copy;
          return copy;
        });
      });
      void refreshCompleteness(final);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
      if (streamed) setMessages((m) => m.slice(0, -1)); // drop the partial reply
    } finally {
      setSending(false);
    }
  }

  async function createProject() {
    setCreating(true);
    setError(null);
    try {
      const { project } = await apiFetch<{
        project: { name: string; industry: string; description: string; budgetRange: string };
      }>('/ai/chat/extract', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
      const { project: created } = await apiFetch<{ project: { id: string } }>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: project.name,
          industry: project.industry || undefined,
          description: project.description || undefined,
          budgetRange: project.budgetRange || undefined,
        }),
      });
      router.push(`/dashboard/projects/${created.id}?generate=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
      setCreating(false);
    }
  }

  // Shared composer — centered in the empty state, pinned to the bottom once
  // a conversation is underway.
  const composer = (
    <div className="w-full">
      {error && <p className="mb-2 text-center text-sm text-red-600">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all focus-within:border-indigo-400 focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/10"
      >
        <div className="relative">
          <input
            className="w-full bg-transparent px-2 py-2 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
            placeholder={recording ? '' : 'Send a message…'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          {recording && (
            <VoiceWave className="pointer-events-none absolute inset-y-0 left-2 z-10" />
          )}
        </div>

        {/* Toolbar row — label collapses away on small screens. */}
        <div className="mt-1 flex items-center justify-between gap-2 pl-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
            <span className="hidden truncate sm:inline">AI project assistant</span>
            <span className="truncate sm:hidden">Assistant</span>
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <MicButton
              onTranscript={(t) => setInput((cur) => (cur ? cur.trim() + ' ' : '') + t)}
              onError={setError}
              onRecordingChange={setRecording}
            />
            <button
              type="submit"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
              disabled={sending || !input.trim()}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return (
    // One continuous surface — the header and composer sit ON the page rather
    // than in their own bordered bands, so the screen reads as a single space.
    <main className="flex h-[calc(100vh-3.5rem)] flex-col bg-slate-50">
      <header className="shrink-0 px-4 pt-4 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> My Projects
            </Link>
            <span className="hidden text-slate-300 sm:inline">|</span>
            <h1 className="hidden items-center gap-2 text-sm font-semibold text-slate-900 sm:flex">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              AI Project Assistant
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {hasUserTurn && <CompletenessMeter value={completeness} />}
            <button
              onClick={createProject}
              disabled={!hasUserTurn || creating || sending}
              className="btn-primary px-3 py-2 text-sm sm:px-4"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">
                {creating ? 'Creating…' : 'Create project'}
              </span>
              <span className="sm:hidden">{creating ? '…' : 'Create'}</span>
            </button>
          </div>
        </div>

        {/* The switcher only appears once a conversation is under way — on the
            empty state the method cards already offer the same choices. */}
        {hasUserTurn && (
          <div className="mx-auto mt-3 max-w-3xl">
            <IntakeTabs current="chat" />
          </div>
        )}
      </header>

      {hasUserTurn ? (
        /* ── Active conversation: scrolling transcript + bottom composer ── */
        <>
          <div className="flex-1 overflow-y-auto px-4 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-6 py-6">
              {messages.map((m, i) => (
                <Message key={i} role={m.role} content={m.content} userName={user?.fullName} />
              ))}
              {sending && <Typing />}
              <div ref={endRef} />
            </div>
          </div>

          {/* No border/band: a fade to the page colour so the transcript slides
              under the composer instead of stopping at a hard seam. */}
          <div className="shrink-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-4 pb-4 pt-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              {composer}
              <p className="mt-2 text-center text-xs text-slate-400">
                The assistant will ask about your goal, users, features, and preferred tech stack.
              </p>
            </div>
          </div>
        </>
      ) : (
        /* ── Empty state: hero + starters, composer pinned below ── */
        <>
          {/*
            `m-auto` on the child (not `items-center` on the parent) is what
            centres this: with flex centring, content taller than the container
            overflows past BOTH edges and the top becomes unreachable — which is
            why the heading was clipped and the chips were cut off.
          */}
          <div className="flex flex-1 overflow-y-auto px-4 py-8">
            <div className="m-auto w-full max-w-2xl">
              <h2 className="animate-fade-up text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                How can I <span className="gradient-shimmer">help you</span> today
                {user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}?
              </h2>
              <p className="animate-fade-up mt-2 text-center text-sm text-slate-500">
                Describe your project below — or scope it another way.
              </p>

              {/* Chat starters. */}
              <div
                className="animate-fade-up mt-6 flex flex-wrap justify-center gap-2"
                style={{ animationDelay: '80ms' }}
              >
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    onClick={() => void send(c)}
                    disabled={sending}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-60"
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* The other intake methods. */}
              <div
                className="animate-fade-up card mt-6 divide-y divide-slate-100 overflow-hidden"
                style={{ animationDelay: '160ms' }}
              >
                {OTHER_METHODS.map(({ icon: Icon, tint, title, subtitle, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5"
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tint}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">{title}</span>
                      <span className="block text-sm text-slate-500">{subtitle}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Composer anchored at the bottom, on the same surface — no seam. */}
          <div className="shrink-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-4 pb-4 pt-6 lg:px-8">
            <div className="mx-auto max-w-3xl">{composer}</div>
          </div>
        </>
      )}
    </main>
  );
}

/**
 * How complete the brief is (0–100), scored by the extraction model after each
 * turn. Tells the user when they've said enough to generate good documents,
 * instead of leaving them to guess.
 */
function CompletenessMeter({ value }: { value: number }) {
  const ready = value >= 70;
  return (
    <div className="hidden items-center gap-2 sm:flex" title="How complete your brief is">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            ready ? 'bg-emerald-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${Math.max(4, value)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${ready ? 'text-emerald-700' : 'text-slate-500'}`}>
        {ready ? 'Ready' : `${value}%`}
      </span>
    </div>
  );
}

function Message({
  role,
  content,
  userName,
}: {
  role: 'user' | 'assistant';
  content: string;
  userName?: string;
}) {
  const isUser = role === 'user';
  return (
    <div className={`animate-fade-up flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {isUser ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
          {initials(userName)}
        </span>
      ) : (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
      )}
      {/* Bubble */}
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'rounded-tr-sm bg-indigo-600 text-white'
            : 'rounded-tl-sm border border-slate-200 bg-white text-slate-800'
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
      </div>
    </div>
  );
}
