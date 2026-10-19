'use client';
import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { Token } from '@/lib/tokens';
import type { TxRecord } from '@/lib/redis';

interface Props {
  user:       { name: string; email: string; image: string };
  portfolio:  Record<string, number>;
  history:    TxRecord[];
  prices:     Record<string, number>;
  totalUsd:   number;
  tokens:     Token[];
}

type Tab = 'dex' | 'cex' | 'portfolio' | 'history';

function fmt(n: number, d = 2) {
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: d });
  if (n >= 1)    return '$' + n.toFixed(d);
  return '$' + n.toFixed(6);
}

function fmtAmt(n: number, sym: string) {
  if (['USDT','USDC','DAI','PYUSD'].includes(sym)) return n.toFixed(2);
  if (n < 0.001) return n.toFixed(6);
  if (n < 1)     return n.toFixed(4);
  return n.toFixed(3);
}

function TokenIcon({ token, size = 32 }: { token?: Token; size?: number }) {
  if (!token) return <span className="inline-flex items-center justify-center rounded-full bg-[#252a3a] text-xs text-gray-400" style={{ width: size, height: size }}>?</span>;
  return (
    <img
      src={`https://cdn.simpleicons.org/${token.symbol.toLowerCase()}`}
      alt={`${token.name} logo`}
      width={size}
      height={size}
      className="rounded-full object-contain bg-[#0f1117] p-0.5"
      style={{ width: size, height: size }}
      onError={(event) => { event.currentTarget.style.display = 'none'; }}
    />
  );
}

function pctChange() { return (Math.random() * 6 - 3).toFixed(2); } // simulated 24h change

export function DashboardClient({ user, portfolio: initPortfolio, history: initHistory, prices: initPrices, totalUsd: initTotal, tokens }: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>('dex');
  const [portfolio, setPortfolio] = useState(initPortfolio);
  const [history, setHistory] = useState(initHistory);
  const [prices] = useState(initPrices);
  const [totalUsd, setTotalUsd] = useState(initTotal);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout>>();

  // DEX state
  const [dexFrom, setDexFrom] = useState('USDT');
  const [dexTo,   setDexTo]   = useState('ETH');
  const [dexAmt,  setDexAmt]  = useState('');
  const [dexLoading, setDexLoading] = useState(false);

  // CEX state
  const [cexBase,   setCexBase]   = useState('ETH');
  const [cexQuote,  setCexQuote]  = useState('USDT');
  const [cexSide,   setCexSide]   = useState<'buy'|'sell'>('buy');
  const [cexAmt,    setCexAmt]    = useState('');
  const [cexType,   setCexType]   = useState<'market'|'limit'>('market');
  const [cexLimit,  setCexLimit]  = useState('');
  const [cexLoading, setCexLoading] = useState(false);

  const notify = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), 4000);
  };

  const refreshPortfolio = useCallback(async () => {
    const res = await fetch('/api/portfolio');
    if (!res.ok) return;
    const d = await res.json();
    setPortfolio(d.portfolio);
    setHistory(d.history);
    setTotalUsd(d.totalUsd);
  }, []);

  // DEX swap
  const doSwap = async () => {
    if (!dexAmt || parseFloat(dexAmt) <= 0) return notify('Enter an amount', false);
    setDexLoading(true);
    try {
      const res = await fetch('/api/swap', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromSym: dexFrom, toSym: dexTo, fromAmt: parseFloat(dexAmt) }) });
      const d = await res.json();
      if (!res.ok) return notify(d.error, false);
      notify(`Swapped ${dexAmt} ${dexFrom} → ${d.toAmt.toFixed(6)} ${dexTo} (fee $${d.fee.toFixed(3)})`, true);
      setDexAmt('');
      await refreshPortfolio();
    } finally { setDexLoading(false); }
  };

  // CEX order
  const doOrder = async () => {
    if (!cexAmt || parseFloat(cexAmt) <= 0) return notify('Enter an amount', false);
    setCexLoading(true);
    try {
      const res = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side: cexSide, baseSym: cexBase, quoteSym: cexQuote, amount: parseFloat(cexAmt),
          orderType: cexType, limitPrice: cexLimit ? parseFloat(cexLimit) : undefined }) });
      const d = await res.json();
      if (!res.ok) return notify(d.error, false);
      notify(`${cexSide === 'buy' ? 'Bought' : 'Sold'} @ $${d.execPrice.toLocaleString()} · fee $${d.fee.toFixed(3)}`, true);
      setCexAmt('');
      await refreshPortfolio();
    } finally { setCexLoading(false); }
  };

  const dexOutAmt = dexAmt && prices[dexFrom] && prices[dexTo]
    ? ((parseFloat(dexAmt) * prices[dexFrom] * 0.997) / prices[dexTo]).toFixed(6)
    : '—';

  const cexPrice = prices[cexBase];

  // Mock order book rows
  const mkOrderBook = (p: number, side: 'ask'|'bid', n = 7) =>
    Array.from({ length: n }, (_, i) => ({
      price: side === 'ask' ? p * (1 + 0.0003 * (i + 1)) : p * (1 - 0.0003 * (i + 1)),
      qty:   (Math.random() * 3 + 0.1).toFixed(4),
    }));

  const asks = cexPrice ? mkOrderBook(cexPrice, 'ask') : [];
  const bids = cexPrice ? mkOrderBook(cexPrice, 'bid') : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0b10' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#1e2235] glass sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/dcroc-logo.png" alt="Dcroc" className="h-7 w-7 rounded-full object-cover" />
          <span className="font-bold text-white">Swap<span className="text-blue-400">X</span></span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#0f1117] border border-[#1e2235] rounded-xl p-1">
          {([['dex','🔄 DEX Swap'], ['cex','🏛 CEX Trade'], ['portfolio','📊 Portfolio'], ['history','📋 History']] as [Tab,string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-[#1e2235] text-blue-400' : 'text-[#6b7280] hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-[#6b7280]">Portfolio</div>
            <div className="font-bold text-green-400">{fmt(totalUsd)}</div>
          </div>
          {user.image && <Image src={user.image} width={32} height={32} className="rounded-full" alt={user.name} />}
          <button onClick={async () => { await supabase.auth.signOut(); window.location.assign('/'); }}
            className="text-xs text-[#6b7280] hover:text-red-400 border border-[#1e2235] px-3 py-1.5 rounded-lg transition-colors">
            Sign out
          </button>
        </div>
      </header>

      {/* Notification */}
      {msg && (
        <div className={`fixed top-16 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${msg.ok ? 'bg-green-900/90 text-green-300 border border-green-700' : 'bg-red-900/90 text-red-300 border border-red-700'}`}>
          {msg.ok ? '✅' : '❌'} {msg.text}
        </div>
      )}

      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">

        {/* ── DEX SWAP ──────────────────────────────────────────────── */}
        {tab === 'dex' && (
          <div className="flex gap-4 h-full">
            {/* Swap card */}
            <div className="w-96 flex-shrink-0">
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-white text-lg">DEX Swap</h2>
                  <span className="text-xs text-[#6b7280] mono">Fee: 0.3%</span>
                </div>

                <label className="text-xs text-[#6b7280] mb-1 block">From</label>
                <div className="flex gap-2 mb-2">
                  <select value={dexFrom} onChange={e => setDexFrom(e.target.value)}
                    className="input-dark w-28 flex-shrink-0 cursor-pointer">
                    {tokens.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
                  </select>
                  <input type="number" placeholder="0.00" value={dexAmt} onChange={e => setDexAmt(e.target.value)}
                    className="input-dark flex-1" />
                </div>
                <div className="text-xs text-[#6b7280] mb-4">
                  Balance: <span className="text-gray-300 mono">{fmtAmt(portfolio[dexFrom] ?? 0, dexFrom)} {dexFrom}</span>
                  {dexAmt && <> · ≈ {fmt(parseFloat(dexAmt||'0') * (prices[dexFrom]??0))}</>}
                  {portfolio[dexFrom] && (
                    <button onClick={() => setDexAmt((portfolio[dexFrom]).toString())}
                      className="ml-2 text-blue-400 hover:underline">MAX</button>
                  )}
                </div>

                {/* Swap arrow */}
                <div className="flex justify-center my-2">
                  <button onClick={() => { setDexFrom(dexTo); setDexTo(dexFrom); setDexAmt(''); }}
                    className="p-2 rounded-lg bg-[#1e2235] hover:bg-[#252a3a] text-blue-400 text-xl transition-colors">⇅</button>
                </div>

                <label className="text-xs text-[#6b7280] mb-1 block">To (estimated)</label>
                <div className="flex gap-2 mb-2">
                  <select value={dexTo} onChange={e => setDexTo(e.target.value)}
                    className="input-dark w-28 flex-shrink-0 cursor-pointer">
                    {tokens.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
                  </select>
                  <div className="input-dark flex-1 text-[#9ca3af] mono">{dexOutAmt}</div>
                </div>
                <div className="text-xs text-[#6b7280] mb-4">
                  Balance: <span className="text-gray-300 mono">{fmtAmt(portfolio[dexTo] ?? 0, dexTo)} {dexTo}</span>
                </div>

                {/* Price info */}
                <div className="bg-[#0f1117] rounded-xl p-3 mb-4 text-xs space-y-1.5">
                  <div className="flex justify-between"><span className="text-[#6b7280]">Rate</span>
                    <span className="mono text-gray-300">1 {dexFrom} = {prices[dexFrom] && prices[dexTo] ? (prices[dexFrom]/prices[dexTo]).toFixed(6) : '—'} {dexTo}</span></div>
                  <div className="flex justify-between"><span className="text-[#6b7280]">Price impact</span>
                    <span className="text-green-400 mono">&lt; 0.1%</span></div>
                  <div className="flex justify-between"><span className="text-[#6b7280]">Slippage tolerance</span>
                    <span className="mono text-gray-300">0.5%</span></div>
                  <div className="flex justify-between"><span className="text-[#6b7280]">Min received</span>
                    <span className="mono text-gray-300">{dexOutAmt !== '—' ? (parseFloat(dexOutAmt)*0.995).toFixed(6) : '—'} {dexTo}</span></div>
                </div>

                <button onClick={doSwap} disabled={dexLoading} className="btn-swap">
                  {dexLoading ? '⏳ Swapping…' : '🔄 Swap'}
                </button>
              </div>
            </div>

            {/* Token market overview */}
            <div className="flex-1 overflow-auto">
              <div className="glass rounded-2xl p-4">
                <h3 className="font-semibold text-white mb-3">Market Overview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#6b7280] text-xs border-b border-[#1e2235]">
                        <th className="text-left py-2 pl-2">Token</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">24h %</th>
                        <th className="text-right py-2">Type</th>
                        <th className="text-right py-2 pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map(t => {
                        const change = parseFloat(pctChange());
                        return (
                          <tr key={t.symbol} className="border-b border-[#0f1117] hover:bg-[#0f1117] transition-colors">
                            <td className="py-2.5 pl-2">
                              <div className="flex items-center gap-2">
                                <TokenIcon token={t} size={28} />
                                <span className="font-medium text-white">{t.symbol}</span>
                                <span className="text-[#6b7280] text-xs hidden sm:inline">{t.name}</span>
                              </div>
                            </td>
                            <td className="text-right mono text-gray-300">
                              {prices[t.symbol] ? fmt(prices[t.symbol]) : <span className="text-[#4b5563]">—</span>}
                            </td>
                            <td className={`text-right mono font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {change >= 0 ? '+' : ''}{change}%
                            </td>
                            <td className="text-right">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                t.type === 'stable' ? 'bg-green-900/40 text-green-400' :
                                t.type === 'defi'   ? 'bg-purple-900/40 text-purple-400' :
                                'bg-blue-900/40 text-blue-400'
                              }`}>{t.type}</span>
                            </td>
                            <td className="text-right pr-2">
                              <button onClick={() => { setDexFrom('USDT'); setDexTo(t.symbol); setTab('dex'); }}
                                className="text-xs text-blue-400 hover:underline">Swap</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CEX TRADE ─────────────────────────────────────────────── */}
        {tab === 'cex' && (
          <div className="flex gap-4">
            {/* Order panel */}
            <div className="w-80 flex-shrink-0 space-y-3">
              <div className="glass rounded-2xl p-5">
                <h2 className="font-bold text-white text-lg mb-4">CEX Trade</h2>

                {/* Pair selector */}
                <div className="flex gap-2 mb-4">
                  <div>
                    <label className="text-xs text-[#6b7280] mb-1 block">Base</label>
                    <select value={cexBase} onChange={e => setCexBase(e.target.value)} className="input-dark cursor-pointer">
                      {tokens.filter(t => t.type !== 'stable').map(t => <option key={t.symbol}>{t.symbol}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#6b7280] mb-1 block">Quote</label>
                    <select value={cexQuote} onChange={e => setCexQuote(e.target.value)} className="input-dark cursor-pointer">
                      {tokens.filter(t => t.type === 'stable').map(t => <option key={t.symbol}>{t.symbol}</option>)}
                    </select>
                  </div>
                </div>

                {/* Market price */}
                {cexPrice && (
                  <div className="bg-[#0f1117] rounded-xl p-3 mb-4 text-center">
                    <div className="text-xs text-[#6b7280] mb-1">{cexBase}/{cexQuote}</div>
                    <div className="text-2xl font-bold text-white mono">{fmt(cexPrice)}</div>
                  </div>
                )}

                {/* Order type */}
                <div className="flex gap-1 bg-[#0a0b10] rounded-lg p-1 mb-4">
                  {(['market','limit'] as const).map(t => (
                    <button key={t} onClick={() => setCexType(t)}
                      className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-all ${cexType === t ? 'bg-[#1e2235] text-blue-400' : 'text-[#6b7280]'}`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Buy / Sell tabs */}
                <div className="flex gap-1 mb-4">
                  {(['buy','sell'] as const).map(s => (
                    <button key={s} onClick={() => setCexSide(s)}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                        cexSide === s ? (s === 'buy' ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'bg-[#1e2235] text-[#6b7280]'
                      }`}>
                      {s === 'buy' ? '▲ Buy' : '▼ Sell'}
                    </button>
                  ))}
                </div>

                {cexType === 'limit' && (
                  <>
                    <label className="text-xs text-[#6b7280] mb-1 block">Limit Price (USD)</label>
                    <input type="number" placeholder={cexPrice ? cexPrice.toString() : '0'} value={cexLimit}
                      onChange={e => setCexLimit(e.target.value)} className="input-dark mb-3" />
                  </>
                )}

                <label className="text-xs text-[#6b7280] mb-1 block">
                  {cexSide === 'buy' ? `Amount (${cexQuote} to spend)` : `Amount (${cexBase} to sell)`}
                </label>
                <input type="number" placeholder="0.00" value={cexAmt} onChange={e => setCexAmt(e.target.value)} className="input-dark mb-1" />
                <div className="text-xs text-[#6b7280] mb-3">
                  Balance: {cexSide === 'buy'
                    ? <span className="text-gray-300 mono">{fmtAmt(portfolio[cexQuote]??0, cexQuote)} {cexQuote}</span>
                    : <span className="text-gray-300 mono">{fmtAmt(portfolio[cexBase]??0, cexBase)} {cexBase}</span>}
                </div>

                {/* Cost estimate */}
                {cexAmt && cexPrice && (
                  <div className="bg-[#0f1117] rounded-xl p-3 mb-4 text-xs space-y-1">
                    {cexSide === 'buy' ? (
                      <>
                        <div className="flex justify-between"><span className="text-[#6b7280]">You pay</span><span className="mono">{fmt(parseFloat(cexAmt||'0'))}</span></div>
                        <div className="flex justify-between"><span className="text-[#6b7280]">You receive ≈</span><span className="mono text-green-400">{((parseFloat(cexAmt||'0')*0.999)/cexPrice).toFixed(5)} {cexBase}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between"><span className="text-[#6b7280]">You sell</span><span className="mono">{cexAmt} {cexBase}</span></div>
                        <div className="flex justify-between"><span className="text-[#6b7280]">You receive ≈</span><span className="mono text-green-400">{fmt(parseFloat(cexAmt||'0') * cexPrice * 0.999)}</span></div>
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-[#6b7280]">Fee (0.1%)</span><span className="mono text-[#6b7280]">{fmt(parseFloat(cexAmt||'0')*(cexSide==='buy'?1:cexPrice)*0.001)}</span></div>
                  </div>
                )}

                <button onClick={doOrder} disabled={cexLoading}
                  className={cexSide === 'buy' ? 'btn-buy' : 'btn-sell'}>
                  {cexLoading ? '⏳ Processing…' : (cexSide === 'buy' ? `▲ Buy ${cexBase}` : `▼ Sell ${cexBase}`)}
                </button>
              </div>
            </div>

            {/* Order Book */}
            <div className="flex-1 space-y-3">
              <div className="glass rounded-2xl p-4">
                <h3 className="font-semibold text-white mb-3">Order Book — {cexBase}/{cexQuote}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Asks */}
                  <div>
                    <div className="text-xs text-[#6b7280] grid grid-cols-2 mb-2">
                      <span>Price</span><span className="text-right">Qty ({cexBase})</span>
                    </div>
                    {asks.reverse().map((a, i) => (
                      <div key={i} className="grid grid-cols-2 text-xs py-0.5 hover:bg-red-900/10 rounded transition-colors">
                        <span className="text-red-400 mono">{fmt(a.price)}</span>
                        <span className="text-right text-[#9ca3af] mono">{a.qty}</span>
                      </div>
                    ))}
                    {cexPrice && (
                      <div className="text-center font-bold text-white mono py-1.5 border-y border-[#1e2235] my-1 text-sm">
                        {fmt(cexPrice)}
                      </div>
                    )}
                    {bids.map((b, i) => (
                      <div key={i} className="grid grid-cols-2 text-xs py-0.5 hover:bg-green-900/10 rounded transition-colors">
                        <span className="text-green-400 mono">{fmt(b.price)}</span>
                        <span className="text-right text-[#9ca3af] mono">{b.qty}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recent trades */}
                  <div>
                    <div className="text-xs text-[#6b7280] grid grid-cols-2 mb-2">
                      <span>Price</span><span className="text-right">Side</span>
                    </div>
                    {Array.from({ length: 14 }, (_, i) => {
                      const isBuy = Math.random() > 0.5;
                      const p = cexPrice ? cexPrice * (1 + (Math.random() * 0.002 - 0.001)) : 0;
                      return (
                        <div key={i} className="grid grid-cols-2 text-xs py-0.5">
                          <span className={`${isBuy ? 'text-green-400' : 'text-red-400'} mono`}>{p ? fmt(p) : '—'}</span>
                          <span className={`text-right text-xs ${isBuy ? 'text-green-400' : 'text-red-400'}`}>{isBuy ? 'BUY' : 'SELL'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* All tokens mini list */}
              <div className="glass rounded-2xl p-4">
                <h3 className="font-semibold text-white mb-3 text-sm">Quick Select</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {tokens.filter(t => t.type !== 'stable').map(t => (
                    <button key={t.symbol} onClick={() => setCexBase(t.symbol)}
                      className={`p-2 rounded-xl text-xs font-medium transition-all text-center ${cexBase === t.symbol ? 'ring-1 ring-blue-400 bg-blue-900/20' : 'bg-[#0f1117] hover:bg-[#1e2235]'}`}>
                      <TokenIcon token={t} size={32} />
                      <div className="text-white mt-1">{t.symbol}</div>
                      <div className="text-[#6b7280]" style={{ fontSize: '10px' }}>{prices[t.symbol] ? fmt(prices[t.symbol]) : '—'}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PORTFOLIO ────────────────────────────��────────────────── */}
        {tab === 'portfolio' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Value', value: fmt(totalUsd), color: 'text-green-400' },
                { label: 'Assets', value: Object.keys(portfolio).length.toString(), color: 'text-blue-400' },
                { label: 'Transactions', value: history.length.toString(), color: 'text-purple-400' },
                { label: 'Stablecoins', value: fmt((['USDT','USDC','DAI','PYUSD'] as string[]).reduce((s,sym) => s + (portfolio[sym]??0)*(prices[sym]??1), 0)), color: 'text-yellow-400' },
              ].map(c => (
                <div key={c.label} className="glass rounded-2xl p-4">
                  <div className="text-xs text-[#6b7280] mb-1">{c.label}</div>
                  <div className={`text-2xl font-bold mono ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Holdings */}
            <div className="glass rounded-2xl p-4">
              <h3 className="font-semibold text-white mb-3">Holdings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#6b7280] text-xs border-b border-[#1e2235]">
                      <th className="text-left py-2 pl-2">Token</th>
                      <th className="text-right py-2">Balance</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Value</th>
                      <th className="text-right py-2 pr-2">Alloc %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(portfolio)
                      .map(([sym, amt]) => ({ sym, amt, val: amt * (prices[sym] ?? 1) }))
                      .sort((a, b) => b.val - a.val)
                      .map(({ sym, amt, val }) => (
                        <tr key={sym} className="border-b border-[#0f1117] hover:bg-[#0f1117] transition-colors">
                          <td className="py-2.5 pl-2">
                            <div className="flex items-center gap-2">
                              <TokenIcon token={tokens.find(t => t.symbol === sym)} size={28} />
                              <span className="font-medium text-white">{sym}</span>
                            </div>
                          </td>
                          <td className="text-right mono text-gray-300">{fmtAmt(amt, sym)}</td>
                          <td className="text-right mono text-gray-300">{prices[sym] ? fmt(prices[sym]) : '—'}</td>
                          <td className="text-right mono font-semibold text-white">{fmt(val)}</td>
                          <td className="text-right pr-2">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-[#1e2235] rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, val/totalUsd*100)}%` }} />
                              </div>
                              <span className="text-[#6b7280] text-xs mono">{(val/totalUsd*100).toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY ───────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-white mb-3">Transaction History</h3>
            {history.length === 0 ? (
              <div className="text-center text-[#6b7280] py-12">
                No transactions yet. Start trading to see history here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#6b7280] text-xs border-b border-[#1e2235]">
                      <th className="text-left py-2 pl-2">Type</th>
                      <th className="text-right py-2">From</th>
                      <th className="text-right py-2">To</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Fee</th>
                      <th className="text-right py-2 pr-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(tx => (
                      <tr key={tx.id} className="border-b border-[#0f1117] hover:bg-[#0f1117] transition-colors">
                        <td className="py-2.5 pl-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            tx.type === 'buy'  ? 'bg-green-900/40 text-green-400' :
                            tx.type === 'sell' ? 'bg-red-900/40 text-red-400' :
                            'bg-blue-900/40 text-blue-400'
                          }`}>{tx.type.toUpperCase()}</span>
                        </td>
                        <td className="text-right mono text-gray-300">{fmtAmt(tx.fromAmt, tx.fromSym)} {tx.fromSym}</td>
                        <td className="text-right mono text-green-400">{fmtAmt(tx.toAmt, tx.toSym)} {tx.toSym}</td>
                        <td className="text-right mono text-gray-300">{fmt(tx.price)}</td>
                        <td className="text-right mono text-[#6b7280]">${tx.fee.toFixed(3)}</td>
                        <td className="text-right pr-2 text-xs text-[#6b7280]">
                          {new Date(tx.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
