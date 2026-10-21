'use client';

import { useState } from 'react';
import { Send, X, Sparkles, LoaderCircle } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

export function SupportAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi, I’m SwapX Support. Ask me about deposits, withdrawals, trading, or account safety.' },
  ]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || loading) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessages(current => [...current, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages(current => [...current, { role: 'assistant', content: 'I could not connect right now. Please try again or contact support.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open SwapX AI support" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-950/40 transition hover:bg-blue-500">
        <Sparkles className="h-4 w-4" /> AI Support
      </button>
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(620px,calc(100vh-40px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-[#293453] bg-[#0d111c] shadow-2xl shadow-black/50" role="dialog" aria-label="SwapX AI support">
          <div className="flex items-center justify-between border-b border-[#1e2a43] bg-gradient-to-r from-blue-950/70 to-[#111827] p-4">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-500/15 p-2 text-blue-300"><Sparkles className="h-5 w-5" /></div><div><div className="font-semibold text-white">SwapX AI Support</div><div className="text-[11px] text-emerald-300">Online · security-first guidance</div></div></div>
            <button onClick={() => setOpen(false)} aria-label="Close AI support" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'border border-[#26324d] bg-[#151c2d] text-slate-200'}`}>{message.content}</div>)}
            {loading && <div className="flex items-center gap-2 text-xs text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking secure support context…</div>}
          </div>
          <div className="border-t border-[#1e2a43] p-3"><div className="flex items-center gap-2 rounded-2xl border border-[#2a3856] bg-[#111827] p-2"><input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) void sendMessage(); }} maxLength={1200} placeholder="Ask about your account…" className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-500" /><button onClick={() => void sendMessage()} disabled={loading || !input.trim()} aria-label="Send message" className="rounded-xl bg-blue-600 p-2 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div><div className="mt-2 text-center text-[10px] text-slate-500">Never share passwords, API keys, or wallet seed phrases.</div></div>
        </div>
      )}
    </>
  );
}
