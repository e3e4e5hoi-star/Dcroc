import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LandingClient } from './landing-client';
import { getPrices } from '@/lib/prices';
import { TOKENS } from '@/lib/tokens';

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  // Fetch prices for the ticker (best-effort, can fail)
  let prices: Record<string, number> = {};
  try { prices = await getPrices(); } catch {}

  const tickerTokens = TOKENS.slice(0, 16).map(t => ({
    symbol: t.symbol,
    name:   t.name,
    color:  t.color,
    price:  prices[t.symbol] ?? 0,
  }));

  return <LandingClient tickerTokens={tickerTokens} />;
}
