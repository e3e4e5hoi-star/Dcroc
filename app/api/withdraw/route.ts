import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { getPortfolio, setBalance, logTx, redis } from '@/lib/redis';
import { TOKEN_MAP } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

const addressPattern = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{15,127}$/;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const symbol = typeof body?.symbol === 'string' ? body.symbol.toUpperCase() : '';
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  const amount = typeof body?.amount === 'number' ? body.amount : Number(body?.amount);
  const token = TOKEN_MAP[symbol];

  if (!token) return NextResponse.json({ error: 'Unsupported asset' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
  if (!addressPattern.test(address)) return NextResponse.json({ error: 'Enter a valid destination address' }, { status: 400 });
  if (amount > 250) return NextResponse.json({ error: 'Daily withdrawal limit is $250 per request' }, { status: 400 });

  const portfolio = await getPortfolio(user.id);
  const balance = portfolio[symbol] ?? 0;
  if (balance < amount) return NextResponse.json({ error: `Insufficient ${symbol} balance` }, { status: 400 });

  const id = crypto.randomUUID();
  const fee = Math.max(0.0001, amount * 0.001);
  const netAmount = amount - fee;
  await setBalance(user.id, symbol, balance - amount);
  await redis.hset(`withdrawal:${id}`, {
    id, userId: user.id, symbol, address, amount: amount.toString(), fee: fee.toString(),
    netAmount: netAmount.toString(), status: 'pending_review', createdAt: Date.now().toString(),
  });
  await logTx(user.id, {
    id, type: 'withdrawal', fromSym: symbol, toSym: symbol, fromAmt: amount, toAmt: netAmount,
    price: 0, fee, ts: Date.now(),
  });

  return NextResponse.json({ success: true, id, status: 'pending_review', netAmount, fee });
}
