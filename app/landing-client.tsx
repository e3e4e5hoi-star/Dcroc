'use client';
import { signIn } from 'next-auth/react';

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
        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="flex items-center gap-2 bg-white text-gray-900 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors"
        >
          <GoogleIcon /> Sign in with Google
        </button>
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
            Redis portfolio tracking, and Google OAuth.
          </p>

          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl text-base transition-all hover:scale-105 shadow-lg mb-4"
            style={{ boxShadow: '0 0 30px rgba(59,130,246,.4)' }}
          >
            <GoogleIcon /> Connect with Google — it&apos;s free
          </button>

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
