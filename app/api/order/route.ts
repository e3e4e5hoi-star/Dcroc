import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPortfolio, setBalance, logTx } from '@/lib/redis';
import { getPrices } from '@/lib/prices';
import { TOKEN_MAP } from '@/lib/tokens';
import { placeKrakenOrder } from '@/lib/kraken';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// CEX market buy/sell
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const uid = user.id;

  const body = await req.json().catch(() => null);
  const { side, baseSym, quoteSym, amount, orderType, limitPrice } = body ?? {};
  // side: 'buy' | 'sell'
  // baseSym: e.g. 'ETH'  quoteSym: e.g. 'USDT'
  // amount: in base units for sell, in USD for buy
  // orderType: 'market' | 'limit'

  if ((side !== 'buy' && side !== 'sell') || (orderType !== 'market' && orderType !== 'limit'))
    return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
  if (typeof baseSym !== 'string' || typeof quoteSym !== 'string' || !TOKEN_MAP[baseSym] || !TOKEN_MAP[quoteSym] || baseSym === quoteSym)
    return NextResponse.json({ error: 'Unknown token pair' }, { status: 400 });
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000)
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  if (orderType === 'limit' && (typeof limitPrice !== 'number' || !Number.isFinite(limitPrice) || limitPrice <= 0))
    return NextResponse.json({ error: 'Invalid limit price' }, { status: 400 });

  const [portfolio, prices] = await Promise.all([getPortfolio(uid), getPrices()]);
  const marketPrice = prices[baseSym];
  if (!marketPrice) return NextResponse.json({ error: 'Price unavailable' }, { status: 503 });

  const quotePrice = prices[quoteSym] ?? 1;
  const quoteBal = portfolio[quoteSym] ?? 0;
  const baseBal = portfolio[baseSym] ?? 0;
  const spendQuote = side === 'buy' ? amount / quotePrice : amount * marketPrice / quotePrice;
  if (side === 'buy' && quoteBal < spendQuote)
    return NextResponse.json({ error: `Insufficient ${quoteSym}` }, { status: 400 });
  if (side === 'sell' && baseBal < amount)
    return NextResponse.json({ error: `Insufficient ${baseSym}` }, { status: 400 });

  const orderAmount = side === 'buy' ? (amount / marketPrice) * 0.999 : amount;
  let order: { txid: string; description?: string };
  try {
    order = await placeKrakenOrder({ side, baseSym, quoteSym, amount: orderAmount, orderType, limitPrice });
  } catch (error) {
    console.error('[v0] Kraken order failed', error);
    return NextResponse.json({ error: 'Kraken order could not be placed' }, { status: 502 });
  }

  const fee = amount * 0.001;
  const baseAmt = side === 'buy' ? orderAmount : 0;
  const quoteAmt = side === 'sell' ? (amount * marketPrice - fee) / quotePrice : 0;
  await Promise.all([
    side === 'buy'
      ? setBalance(uid, quoteSym, quoteBal - spendQuote)
      : setBalance(uid, baseSym, baseBal - amount),
    side === 'buy'
      ? setBalance(uid, baseSym, baseBal + baseAmt)
      : setBalance(uid, quoteSym, quoteBal + quoteAmt),
    logTx(uid, { id: crypto.randomUUID(), type: side, fromSym: side === 'buy' ? quoteSym : baseSym, toSym: side === 'buy' ? baseSym : quoteSym, fromAmt: side === 'buy' ? spendQuote : amount, toAmt: side === 'buy' ? baseAmt : quoteAmt, price: marketPrice, fee, ts: Date.now() }),
  ]);
  return NextResponse.json({ success: true, orderId: order.txid, status: 'accepted', baseAmt, quoteAmt, fee, execPrice: marketPrice });
}
