import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Code2, ShieldCheck } from 'lucide-react';

const endpoints = [
  { method: 'GET', path: '/api/markets', description: 'List supported spot markets and trading metadata.' },
  { method: 'GET', path: '/api/ticker', description: 'Return live USD reference prices for supported assets.' },
  { method: 'GET', path: '/api/prices', description: 'Return the current price map keyed by asset symbol.' },
];

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-[#080a10] px-5 py-10 text-slate-200 antialiased sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/dcroc-logo.png" alt="SwapX" width={44} height={44} priority className="h-11 w-11 rounded-full" />
            <div><p className="text-xl font-bold text-white">Swap<span className="text-blue-400">X</span> API</p><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Public market documentation</p></div>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-white"><ArrowLeft size={16} />Back to exchange</Link>
        </header>

        <section className="grid gap-5 py-12 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
          <div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs text-blue-300"><BookOpen size={14} />Public API v1</div><h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">Markets built for transparent discovery.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">Use SwapX public endpoints to discover supported spot markets and read reference prices. Public market endpoints do not require authentication or API keys.</p></div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><ShieldCheck size={17} />Read-only access</div><p className="mt-2 text-sm leading-6 text-slate-400">Trading, withdrawals, account balances, and private data are never exposed through public endpoints.</p></div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Base URL</h2>
          <div className="rounded-xl border border-white/10 bg-[#10131c] p-4 font-mono text-sm text-blue-200">https://travian.icu</div>
          {endpoints.map((endpoint) => <article key={endpoint.path} className="rounded-2xl border border-white/10 bg-[#0f121a] p-5"><div className="flex flex-wrap items-center gap-3"><span className="rounded-md bg-emerald-400/10 px-2 py-1 font-mono text-xs font-bold text-emerald-300">{endpoint.method}</span><code className="text-sm text-white">{endpoint.path}</code></div><p className="mt-3 text-sm text-slate-400">{endpoint.description}</p><div className="mt-4 rounded-xl bg-[#080a10] p-4 font-mono text-xs leading-6 text-slate-400">{endpoint.path === '/api/markets' ? '{ "markets": [{ "symbol": "BTC/USDT", "base": "BTC", "quote": "USDT" }] }' : endpoint.path === '/api/ticker' ? '{ "ticker": { "BTC": { "price": 0, "currency": "USD" } } }' : '{ "prices": { "BTC": 0, "ETH": 0 } }'}</div></article>)}
        </section>

        <section className="mt-12 grid gap-5 md:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-[#0f121a] p-5"><div className="flex items-center gap-2 font-semibold text-white"><Code2 size={17} className="text-blue-300" />Example request</div><pre className="mt-4 overflow-x-auto rounded-xl bg-[#080a10] p-4 text-xs leading-6 text-slate-400">curl https://travian.icu/api/markets</pre></div><div className="rounded-2xl border border-white/10 bg-[#0f121a] p-5"><h2 className="font-semibold text-white">Usage policy</h2><p className="mt-3 text-sm leading-6 text-slate-400">Please cache responses, identify your application, and use a reasonable request rate. Private trading endpoints require an authenticated SwapX account.</p></div></section>
        <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-slate-500">SwapX API v1 · Public market data only · Contact support through the exchange</footer>
      </div>
    </main>
  );
}
