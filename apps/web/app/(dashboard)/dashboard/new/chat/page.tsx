'use client';

import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Turn = { role: 'user' | 'assistant'; content: string };

const GREETING: Turn = {
  role: 'assistant',
  content:
    "Hi! I'll help you scope your project. To start — what do you want to build, and who is it for?",
};

export default function ChatIntakePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Turn[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const hasUserTurn = messages.some((m) => m.role === 'user');

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const { reply } = await apiFetch<{ reply: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: next }),
      });
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
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
      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: project.name,
          industry: project.industry || undefined,
          description: project.description || undefined,
          budgetRange: project.budgetRange || undefined,
        }),
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-57px)] max-w-2xl flex-col px-6 py-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <button
          onClick={createProject}
          disabled={!hasUserTurn || creating || sending}
          className="btn-primary px-4 py-2 text-sm"
        >
          <Sparkles className="h-4 w-4" />
          {creating ? 'Creating…' : 'Create project'}
        </button>
      </div>

      <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">Chat with AI</h1>

      {/* Messages */}
      <div className="card mt-3 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">
              Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          className="input"
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn-primary px-4 py-2.5" disabled={sending || !input.trim()}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}
