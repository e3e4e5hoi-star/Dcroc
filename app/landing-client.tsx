'use client';
import { useState } from 'react';

interface TickerToken { symbol: string; name: string; color: string; price: number; }

export function LandingClient({ tickerTokens }: { tickerTokens: TickerToken[] }) {
  const doubled = [...tickerTokens, ...tickerTokens]; // for seamless loop

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0b10' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[#1e2235]">
        <div className="flex items-center gap-2">
          <img src="/dcroc-logo.png" alt="Dcroc" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-bold text-xl text-white">Dcroc<span className="text-blue-400"> Exchange</span></span>
          <span className="ml-2 text-xs text-[#6b7280] border border-[#1e2235] px-2 py-0.5 rounded-full">BETA</span>
        </div>
        <EmailAuth compact />
      </nav>

      {/* Ticker */}
      <div className="ticker-wrap border-b border-[#1e2235] py-2 bg-[#0f1117]">
        <div className="ticker-inner">
          {doubled.map((t, i) => (
            <div key={i} className="flex items-center gap-2 px-6 text-sm mono">
              <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              <span className="text-gray-300 font-medium">{t.symbol}</span>
              <span className="text-gray-500">
                {t.price > 0 ? '$' + (t.price >= 1 ? t.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : t.price.toFixed(6)) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center relative">
        {/* Glow background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-blue-400 border border-blue-400/30 bg-blue-400/5 px-3 py-1 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live prices · 30+ tokens · Redis-backed
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 leading-tight">
            Trade on the<br/>
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #3b82f6, #a855f7)' }}>
              Next-Gen Exchange
            </span>
          </h1>

          <p className="text-[#9ca3af] text-lg mb-8 max-w-xl mx-auto">
            Dcroc Exchange combines a Centralized Exchange (CEX) order interface with a
            Decentralized Exchange (DEX) AMM swap — powered by real-time prices,
            Redis portfolio tracking, and secure email verification.
          </p>

          <EmailAuth />

          <p className="text-xs text-[#4b5563]">No crypto wallet needed · Simulated portfolio · Educational demo</p>
        </div>
      </main>

      {/* Feature cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-8 pb-10 max-w-5xl mx-auto w-full">
        {[
          { icon: '🏛️', title: 'CEX Trading',    color: '#3b82f6', desc: 'Market & limit orders, order book simulation, real-time fills with 0.1% maker fee.' },
          { icon: '🔄', title: 'DEX Swap',       color: '#a855f7', desc: 'AMM-style token swaps with 0.3% fee, slippage model, and 30+ token pairs.' },
          { icon: '📊', title: 'Live Portfolio', color: '#22c55e', desc: 'Redis-backed balances, full tx history, P&L tracking, CoinGecko price feed.' },
        ].map(f => (
          <div key={f.title} className="glass rounded-2xl p-5">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-white mb-1" style={{ color: f.color }}>{f.title}</h3>
            <p className="text-sm text-[#6b7280]">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-[#1e2235] px-8 py-4 flex items-center justify-between text-xs text-[#4b5563]">
        <span>© 2026 Dcroc Exchange · <a href="https://expediator.github.io/resume/" className="text-blue-400 hover:underline">expediator</a></span>
        <span>Demo — not financial advice</span>
      </footer>
    </div>
  );
}

function EmailAuth({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inputClass = 'w-full rounded-lg border border-[#2a3046] bg-[#0f1117] px-3 py-2 text-sm text-white outline-none focus:border-blue-400';
  function normalizeDigits(value: string) {
    return value.replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632));
  }

  async function sendCode() {
    if (!email.trim() || !email.includes('@')) {
      setMessage('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/auth/request-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(result.error ?? 'Could not send the verification code.');
    else { setSent(true); setMessage('A 6-digit verification code was sent to your email.'); }
    setBusy(false);
  }

  async function verifyCode() {
    const normalizedCode = normalizeDigits(code);
    if (!/^\d{6}$/.test(normalizedCode)) {
      setMessage('Enter the 6-digit verification code.');
      return;
    }
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/auth/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: normalizedCode }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? 'Invalid verification code.');
      setBusy(false);
      return;
    }
    window.location.assign('/dashboard');
  }

  return (
    <div className={compact ? 'flex items-center gap-2' : 'mx-auto flex w-full max-w-md flex-col gap-3'}>
      {!sent ? (
        <div className={compact ? 'flex items-center gap-2' : 'flex flex-col gap-2'}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" aria-label="Email address" className={compact ? `${inputClass} w-48` : inputClass} onKeyDown={e => { if (e.key === 'Enter') void sendCode(); }} />
          <button type="button" onClick={() => void sendCode()} disabled={busy} className={compact ? 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60' : 'rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-blue-500 disabled:opacity-60'}>
            {busy ? 'Sending...' : 'Continue with Email'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-300">Enter the code sent to <span className="font-semibold text-white">{email}</span>.</p>
          <div className="flex gap-2">
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(normalizeDigits(e.target.value).replace(/\D/g, ''))} placeholder="6-digit code" aria-label="Verification code" className={`${inputClass} tracking-[0.35em]`} onKeyDown={e => { if (e.key === 'Enter') void verifyCode(); }} />
            <button type="button" onClick={() => void verifyCode()} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{busy ? '...' : 'Verify'}</button>
          </div>
          <button type="button" onClick={() => { setSent(false); setCode(''); setMessage(''); }} className="self-start text-xs text-blue-400 hover:underline">Use another email / resend</button>
        </div>
      )}
      {message && <p role="alert" className={`text-xs ${message.includes('sent') ? 'text-green-300' : 'text-red-300'}`}>{message}</p>}
    </div>
  );
}
