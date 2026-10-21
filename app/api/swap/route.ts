import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPortfolio, logTx } from '@/lib/redis';
import { getPrices } from '@/lib/prices';
import { placeKrakenOrder } from '@/lib/kraken';
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

  if (fromSym === 'RAT' || toSym === 'RAT' || fromSym === 'GRAM' || toSym === 'GRAM')
    return NextResponse.json({ error: 'This asset is not supported by Kraken spot markets.' }, { status: 400 });

  const quoteSym = ['USDT', 'USDC', 'USD', 'EUR'].includes(toSym) ? toSym : fromSym;
  const baseSym = quoteSym === toSym ? fromSym : toSym;
  const side = quoteSym === toSym ? 'sell' : 'buy';
  const amount = quoteSym === toSym ? fromAmt : (fromAmt * fromPrice) / toPrice;
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Invalid Kraken order size' }, { status: 400 });

  const order = await placeKrakenOrder({ side, baseSym, quoteSym, amount, orderType: 'market' });
  await logTx(uid, { id: crypto.randomUUID(), type: 'swap', fromSym, toSym, fromAmt, toAmt: 0, price: fromPrice / toPrice, fee: 0, ts: Date.now() });
  return NextResponse.json({ success: true, status: 'submitted', orderId: order.txid, message: 'Order submitted to Kraken. Balances update after fill sync.' });
}
