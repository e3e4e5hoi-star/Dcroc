'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
        <OtpSignIn compact />
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
            Redis portfolio tracking, and secure email OTP sign-in.
          </p>

          <OtpSignIn />

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

function OtpSignIn({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    if (!sent) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setBusy(false);
      if (error) return setMessage('ارسال کد انجام نشد. ایمیل را بررسی کنید.');
      setSent(true);
      setMessage('کد تأیید به ایمیل شما ارسال شد.');
      return;
    }
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setBusy(false);
    if (error) return setMessage('کد واردشده معتبر نیست یا منقضی شده است.');
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={compact ? 'flex items-center gap-2' : 'mx-auto flex max-w-md flex-col gap-3'}>
      {!sent ? (
        <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ایمیل شما" className={compact ? 'w-40 rounded-lg border border-[#1e2235] bg-[#151824] px-3 py-2 text-sm text-white outline-none' : 'rounded-xl border border-[#29304a] bg-[#151824] px-4 py-3 text-white outline-none focus:border-blue-500'} />
      ) : (
        <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder="کد ۶ رقمی" className="rounded-xl border border-[#29304a] bg-[#151824] px-4 py-3 text-center tracking-[0.4em] text-white outline-none focus:border-blue-500" />
      )}
      <button type="submit" disabled={busy} className={compact ? 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60' : 'rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-blue-500 disabled:opacity-60'}>{busy ? 'در حال ارسال...' : sent ? 'تأیید کد' : 'ورود با کد ایمیل'}</button>
      {message && <p className="text-xs text-blue-300">{message}</p>}
    </form>
  );
}
