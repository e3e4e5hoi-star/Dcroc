import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getPortfolio, getTxHistory } from '@/lib/redis';
import { getPrices } from '@/lib/prices';
import { DashboardClient } from './dashboard-client';
import { TOKENS } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  const uid = user.id;

  const [portfolio, history, prices] = await Promise.all([
    getPortfolio(uid),
    getTxHistory(uid),
    getPrices(),
  ]);

  const totalUsd = Object.entries(portfolio).reduce(
    (sum, [sym, amt]) => sum + amt * (prices[sym] ?? 1),
    0
  );

  return (
    <DashboardClient
      user={{ name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Trader', email: user.email ?? '', image: user.user_metadata?.avatar_url ?? '' }}
      portfolio={portfolio}
      history={history}
      prices={prices}
      totalUsd={totalUsd}
      tokens={TOKENS}
    />
  );
}
