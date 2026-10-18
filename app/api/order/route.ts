import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPortfolio, setBalance, logTx } from '@/lib/redis';
import { getPrices } from '@/lib/prices';
import { TOKEN_MAP } from '@/lib/tokens';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// CEX market buy/sell
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const uid = user.id;

  const { side, baseSym, quoteSym, amount, orderType, limitPrice } = await req.json();
  // side: 'buy' | 'sell'
  // baseSym: e.g. 'ETH'  quoteSym: e.g. 'USDT'
  // amount: in base units for sell, in USD for buy
  // orderType: 'market' | 'limit'

  if (!TOKEN_MAP[baseSym] || !TOKEN_MAP[quoteSym])
    return NextResponse.json({ error: 'Unknown token' }, { status: 400 });

  const [portfolio, prices] = await Promise.all([getPortfolio(uid), getPrices()]);
  const marketPrice = prices[baseSym];
  if (!marketPrice) return NextResponse.json({ error: 'Price unavailable' }, { status: 503 });

  // For limit orders, use the limit price if specified and more favorable
  const execPrice = orderType === 'limit' && limitPrice
    ? (side === 'buy'
        ? Math.min(limitPrice, marketPrice * 1.002)
        : Math.max(limitPrice, marketPrice * 0.998))
    : marketPrice;

  const FEE_RATE  = 0.001; // 0.1% CEX maker/taker fee
  const quotePrice = prices[quoteSym] ?? 1; // USDT/USDC ≈ 1 USD

  if (side === 'buy') {
    // Spend quoteSym to receive baseSym
    const spendUsd   = amount; // amount is in quote token
    const quoteBal   = portfolio[quoteSym] ?? 0;
    const spendQuote = spendUsd / quotePrice;
    if (quoteBal < spendQuote)
      return NextResponse.json({ error: `Insufficient ${quoteSym}` }, { status: 400 });
    const fee       = spendUsd * FEE_RATE;
    const baseAmt   = (spendUsd - fee) / execPrice;
    await Promise.all([
      setBalance(uid, quoteSym, quoteBal - spendQuote),
      setBalance(uid, baseSym, (portfolio[baseSym] ?? 0) + baseAmt),
      logTx(uid, { id: crypto.randomUUID(), type: 'buy', fromSym: quoteSym, toSym: baseSym, fromAmt: spendQuote, toAmt: baseAmt, price: execPrice, fee, ts: Date.now() }),
    ]);
    return NextResponse.json({ success: true, baseAmt, fee, execPrice });
  } else {
    // Sell baseSym for quoteSym
    const sellAmt  = amount;
    const baseBal  = portfolio[baseSym] ?? 0;
    if (baseBal < sellAmt)
      return NextResponse.json({ error: `Insufficient ${baseSym}` }, { status: 400 });
    const totalUsd   = sellAmt * execPrice;
    const fee        = totalUsd * FEE_RATE;
    const receiveUsd = totalUsd - fee;
    const quoteAmt   = receiveUsd / quotePrice;
    await Promise.all([
      setBalance(uid, baseSym, baseBal - sellAmt),
      setBalance(uid, quoteSym, (portfolio[quoteSym] ?? 0) + quoteAmt),
      logTx(uid, { id: crypto.randomUUID(), type: 'sell', fromSym: baseSym, toSym: quoteSym, fromAmt: sellAmt, toAmt: quoteAmt, price: execPrice, fee, ts: Date.now() }),
    ]);
    return NextResponse.json({ success: true, quoteAmt, fee, execPrice });
  }
}
