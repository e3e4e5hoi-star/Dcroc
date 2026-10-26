'use client'

import Image from 'next/image'
import { Check, ChevronRight, Copy, ShieldCheck, Sparkles, Wallet, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'

const TGE_DATE = new Date('2027-01-15T18:00:00Z').getTime()

const tasks = [
  { id: 'telegram', title: 'Join the Telegram community', detail: 'Follow announcements and claim updates.', icon: Zap, action: 'Open Telegram', href: 'https://t.me/' },
  { id: 'social', title: 'Follow the $RAT journey', detail: 'Stay close to new missions and drops.', icon: Sparkles, action: 'Open channel', href: 'https://t.me/' },
]

export default function AirdropClient() {
  const [copied, setCopied] = useState(false)
  const [tonConnectUI] = useTonConnectUI()
  const tonAddress = useTonAddress()
  const wallet = tonAddress ? `${tonAddress.slice(0, 6)}…${tonAddress.slice(-4)}` : ''
  const [completed, setCompleted] = useState<string[]>([])
  const [connecting, setConnecting] = useState(false)
  const [walletError, setWalletError] = useState('')
  const [remaining, setRemaining] = useState(() => Math.max(0, TGE_DATE - Date.now()))
  const contract = 'Coming soon'

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(0, TGE_DATE - Date.now())), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const countdown = {
    days: Math.floor(remaining / 86400000),
    hours: Math.floor(remaining / 3600000) % 24,
    minutes: Math.floor(remaining / 60000) % 60,
    seconds: Math.floor(remaining / 1000) % 60,
  }

  async function connectWallet() {
    setConnecting(true)
    setWalletError('')
    try {
      if (tonAddress) await tonConnectUI.disconnect()
      else await tonConnectUI.openModal()
    } catch (error) {
      console.error('[v0] TON wallet connection failed', error)
      setWalletError(error instanceof Error && error.message ? error.message : 'TON wallet connection was cancelled.')
    } finally { setConnecting(false) }
  }

  async function copyContract() {
    if (contract === 'Coming soon') return
    try {
      await navigator.clipboard.writeText(contract)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch { setCopied(false) }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080b14] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#3a1f51_0%,transparent_38%),radial-gradient(circle_at_80%_35%,#132b56_0%,transparent_28%)]" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="flex items-center gap-3"><Image src="/rat-logo.jpg" alt="$RAT" width={42} height={42} className="rounded-xl object-cover" priority /><span className="font-semibold tracking-tight">$RAT <span className="text-[#a78bfa]">Airdrop</span></span></a>
        <div className="flex flex-col items-end gap-1"><button onClick={() => void connectWallet()} disabled={connecting} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur transition hover:bg-white/15 disabled:opacity-60"><Wallet size={15} />{connecting ? 'Connecting…' : wallet || 'Connect TON wallet'}</button>{walletError && <p role="status" className="max-w-[190px] text-right text-[10px] text-rose-300">{walletError}</p>}</div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pt-4 sm:px-8"><div className="relative overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-gradient-to-r from-violet-400/10 via-fuchsia-300/10 to-cyan-300/10 p-4 shadow-[0_0_70px_rgba(139,92,246,.12)] sm:p-5"><div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/15 blur-3xl rat-pulse" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200/80">Token generation event</p><h2 className="mt-1 text-lg font-bold text-white">$RAT goes live in</h2></div><div className="grid grid-cols-4 gap-2 text-center">{Object.entries(countdown).map(([label, value]) => <div key={label} className="min-w-[3.6rem] rounded-xl border border-white/10 bg-black/20 px-2 py-2"><div className="font-mono text-xl font-bold text-white">{String(value).padStart(2, '0')}</div><div className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-400">{label}</div></div>)}</div></div></div></section>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-14">
        <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" /> Community distribution is live</div><h1 className="max-w-xl text-5xl font-black leading-[.96] tracking-[-.06em] sm:text-7xl">Meet the next <span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">$RAT</span>.</h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-300">Complete simple community missions, connect your wallet, and become part of the first $RAT distribution.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={() => void connectWallet()} className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#11101a] shadow-[0_0_35px_rgba(216,180,254,.25)] hover:bg-violet-100"><Wallet size={17} />{wallet ? 'Wallet connected' : 'Connect & join'}</button><a href="#missions" className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">View missions <ChevronRight size={16} /></a></div></div>
        <div className="relative mx-auto w-full max-w-md"><div className="absolute -inset-6 rounded-[2.5rem] bg-fuchsia-500/15 blur-3xl rat-pulse" /><div className="absolute -inset-2 rounded-[2rem] border border-dashed border-cyan-300/20 rat-spin" /><div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[.08] p-4 shadow-2xl backdrop-blur-xl"><div className="flex items-center justify-between rounded-2xl bg-black/20 p-4"><div><p className="text-xs text-slate-400">Total distribution</p><p className="mt-1 text-2xl font-bold">1,000,000,000 <span className="text-sm text-violet-300">$RAT</span></p></div><Image src="/rat-logo.jpg" alt="RAT token logo" width={68} height={68} className="rat-float rounded-2xl" /></div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs text-slate-400">Community pool</p><p className="mt-2 font-semibold text-white">70%</p></div><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs text-slate-400">Status</p><p className="mt-2 font-semibold text-emerald-300">Active</p></div></div><div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-300/15 bg-amber-300/10 p-3 text-xs text-amber-100"><ShieldCheck size={16} /> Contract address will be published before claiming.</div></div></div>
      </section>

      <section id="missions" className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-8"><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Earn your allocation</p><h2 className="mt-2 text-2xl font-bold">Community missions</h2></div><span className="text-sm text-slate-400">{completed.length}/2 complete</span></div><div className="grid gap-3 md:grid-cols-2">{tasks.map(task => { const Icon = task.icon; const done = completed.includes(task.id); return <div key={task.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur transition hover:border-violet-300/30"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-violet-300/10 p-3 text-violet-200"><Icon size={18} /></div><div className="min-w-0"><p className="font-semibold">{task.title}</p><p className="mt-1 truncate text-xs text-slate-400">{task.detail}</p></div></div>{done ? <span className="rounded-lg bg-emerald-300/10 p-2 text-emerald-300"><Check size={17} /></span> : <a href={task.href} target="_blank" rel="noreferrer" onClick={() => setCompleted(current => [...current, task.id])} className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10">{task.action}</a>}</div> })}</div><div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"><div><p className="text-xs text-slate-400">Token contract</p><p className="mt-1 font-mono text-sm text-slate-200">{contract}</p></div><button onClick={copyContract} className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-white/10" title="Copy contract"><Copy size={16} />{copied && <span className="sr-only">Copied</span>}</button></div></section>
      <footer className="relative z-10 border-t border-white/10 px-5 py-6 text-center text-xs text-slate-500">$RAT is a community token. Never share your seed phrase or private keys. Verify contract details before signing.</footer>
    </main>
  )
}
