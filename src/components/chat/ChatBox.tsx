'use client';

import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface Msg { role: 'user' | 'assistant'; content: string }

// Renders the model's **bold** markers; every other character stays plain text.
function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
        i % 2 ? <strong key={i} className="font-bold">{part}</strong> : part,
      )}
    </>
  );
}

// Deliberately not a <form>: it is embedded inside the add-transaction form.
export default function ChatBox({ image }: { image?: string | null }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, image: image?.startsWith('data:image/') ? image : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not get an answer');
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        {image ? 'Ask about this receipt or your spending' : 'Ask about your spending'}
      </p>

      {messages.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
          {messages.map((m, i) => (
            <p
              key={i}
              className={`px-3 py-2 rounded-xl whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white ml-8'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 mr-8 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {m.role === 'assistant' ? <Bold text={m.content} /> : m.content}
            </p>
          ))}
          {loading && <p className="text-slate-400 px-1">Thinking…</p>}
        </div>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send();
            }
          }}
          maxLength={500}
          placeholder="e.g. How much did I spend on milk?"
          className="min-w-0 flex-1 px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading || !input.trim()}
          aria-label="Send question"
          className="px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 touch-target focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
