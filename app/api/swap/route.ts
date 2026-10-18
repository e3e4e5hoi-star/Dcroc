import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPortfolio, setBalance, logTx } from '@/lib/redis';
import { getPrices } from '@/lib/prices';
import { TOKEN_MAP } from '@/lib/tokens';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// DEX swap: from → to
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const uid = user.id;

  const body = await req.json().catch(() => null);
  const { fromSym, toSym, fromAmt } = body ?? {};

  if (typeof fromSym !== 'string' || typeof toSym !== 'string' || !TOKEN_MAP[fromSym] || !TOKEN_MAP[toSym])
    return NextResponse.json({ error: 'Unknown token pair' }, { status: 400 });
  if (fromSym === toSym)
    return NextResponse.json({ error: 'Cannot swap same token' }, { status: 400 });
  if (typeof fromAmt !== 'number' || !Number.isFinite(fromAmt) || fromAmt <= 0 || fromAmt > 1_000_000_000)
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

  const [portfolio, prices] = await Promise.all([getPortfolio(uid), getPrices()]);

  const fromBal  = portfolio[fromSym] ?? 0;
  const fromPrice = prices[fromSym];
  const toPrice   = prices[toSym];

  if (!fromPrice || !toPrice)
    return NextResponse.json({ error: 'Price unavailable' }, { status: 503 });
  if (fromBal < fromAmt)
    return NextResponse.json({ error: `Insufficient ${fromSym} balance` }, { status: 400 });

  const FEE_RATE  = 0.003; // 0.3% DEX fee
  const slippage  = 1 - 0.001 * Math.random(); // simulate tiny slippage
  const fromUsd   = fromAmt * fromPrice;
  const fee       = fromUsd * FEE_RATE;
  const toAmt     = ((fromUsd - fee) / toPrice) * slippage;

  await Promise.all([
    setBalance(uid, fromSym, fromBal - fromAmt),
    setBalance(uid, toSym, (portfolio[toSym] ?? 0) + toAmt),
    logTx(uid, {
      id:      crypto.randomUUID(),
      type:    'swap',
      fromSym, toSym,
      fromAmt,
      toAmt,
      price:   fromPrice,
      fee,
      ts:      Date.now(),
    }),
  ]);

  return NextResponse.json({ success: true, toAmt, fee, rate: fromPrice / toPrice });
}
