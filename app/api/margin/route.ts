import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getKrakenMarginPair, getKrakenTicker, placeKrakenMarginOrder } from '@/lib/kraken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LEVERAGE = 3;
const MAX_NOTIONAL_USD = 250;
const MIN_MARGIN_USD = 5;
const STABLES = new Set(['USD', 'USDT', 'USDC']);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const baseSym = typeof body?.baseSym === 'string' ? body.baseSym.toUpperCase() : '';
  const quoteSym = typeof body?.quoteSym === 'string' ? body.quoteSym.toUpperCase() : '';
  const side = body?.side === 'long' || body?.side === 'short' ? body.side : '';
  const marginUsd = Number(body?.marginUsd);
  const stopLoss = body?.stopLoss ? Number(body.stopLoss) : undefined;
  if (!baseSym || !STABLES.has(quoteSym) || !side || !Number.isFinite(marginUsd))
    return NextResponse.json({ error: 'Invalid margin order.' }, { status: 400 });
  if (marginUsd < MIN_MARGIN_USD || marginUsd * MAX_LEVERAGE > MAX_NOTIONAL_USD)
    return NextResponse.json({ error: `Margin must be between $${MIN_MARGIN_USD} and $${(MAX_NOTIONAL_USD / MAX_LEVERAGE).toFixed(2)} at 3x.` }, { status: 400 });
  if (stopLoss !== undefined && (!Number.isFinite(stopLoss) || stopLoss <= 0))
    return NextResponse.json({ error: 'Stop-loss price is invalid.' }, { status: 400 });
  try {
    const [pairInfo, price] = await Promise.all([getKrakenMarginPair(baseSym, quoteSym), getKrakenTicker(baseSym, quoteSym)]);
    const available = side === 'long' ? pairInfo.leverage_buy ?? [] : pairInfo.leverage_sell ?? [];
    if (!available.includes(MAX_LEVERAGE)) return NextResponse.json({ error: `Kraken does not offer 3x margin for ${baseSym}/${quoteSym} on this side.` }, { status: 400 });
    if (stopLoss !== undefined && ((side === 'long' && stopLoss >= price) || (side === 'short' && stopLoss <= price)))
      return NextResponse.json({ error: 'Stop-loss must be below market price for a long, or above it for a short.' }, { status: 400 });
    const notionalUsd = marginUsd * MAX_LEVERAGE;
    const volume = notionalUsd / price;
    const order = await placeKrakenMarginOrder({ side: side === 'long' ? 'buy' : 'sell', baseSym, quoteSym, volume, leverage: MAX_LEVERAGE, stopLoss });
    return NextResponse.json({ ok: true, real: true, orderId: order.txid, description: order.description, leverage: MAX_LEVERAGE, marginUsd, notionalUsd, price, volume, stopLoss });
  } catch (error) {
    console.error('[margin] Kraken order failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Kraken margin order failed.' }, { status: 502 });
  }
}
