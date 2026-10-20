import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { getKrakenDepositAddress, getKrakenDepositMethods, getKrakenDepositStatus } from '@/lib/kraken';
import { getPortfolio, keys, redis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'XRP', 'DOGE', 'LTC']);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const asset = new URL(request.url).searchParams.get('asset')?.toUpperCase() ?? 'BTC';
  if (!ALLOWED.has(asset)) return NextResponse.json({ error: 'Unsupported asset.' }, { status: 400 });
  try {
    const methods = await getKrakenDepositMethods(asset);
    const method = methods[0]?.method;
    if (!method) return NextResponse.json({ error: `Kraken has no deposit method available for ${asset}.` }, { status: 400 });
    const stored = (await redis.hgetall(keys.walletAddresses(user.id))) ?? {};
    let address = stored[asset] ? JSON.parse(stored[asset] as string) : null;
    if (!address || address.method !== method) {
      const deposit = await getKrakenDepositAddress(asset, method);
      address = { asset, method, ...deposit, fetchedAt: Date.now() };
      await redis.hset(keys.walletAddresses(user.id), { [asset]: JSON.stringify(address) });
    }
    const deposits = (await getKrakenDepositStatus(asset)).filter(d => d.info === address.address);
    return NextResponse.json({ asset, methods, address, deposits, portfolio: await getPortfolio(user.id) });
  } catch (error) {
    console.error('[wallet] Kraken funding read failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load wallet.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const asset = typeof body?.asset === 'string' ? body.asset.toUpperCase() : '';
  const amount = Number(body?.amount);
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  if (!ALLOWED.has(asset) || !Number.isFinite(amount) || amount <= 0 || !address) return NextResponse.json({ error: 'Enter a valid asset, amount and address.' }, { status: 400 });
  const requestRecord = { id: randomUUID(), userId: user.id, asset, amount, address, status: 'pending_review', createdAt: Date.now() };
  await redis.lpush(keys.withdrawals(user.id), JSON.stringify(requestRecord));
  await redis.ltrim(keys.withdrawals(user.id), 0, 49);
  return NextResponse.json({ ok: true, request: requestRecord });
}
