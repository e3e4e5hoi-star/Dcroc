import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { getKrakenDepositAddress, getKrakenDepositMethods, getKrakenDepositStatus } from '@/lib/kraken';
import { getPortfolio, setBalance, keys, redis } from '@/lib/redis';

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
    if (!methods.length) return NextResponse.json({ error: `Kraken has no deposit method available for ${asset}.` }, { status: 400 });
    const stored = (await redis.hgetall(keys.walletAddresses(user.id))) ?? {};
    let address = stored[asset] ? JSON.parse(String(stored[asset])) : null;
    if (!address?.address) {
      let lastError: unknown;
      for (const candidate of methods) {
        try {
          const deposit = await getKrakenDepositAddress(asset, candidate.method);
          if (deposit?.address) {
            address = { asset, method: candidate.method, ...deposit, fetchedAt: Date.now() };
            await redis.hset(keys.walletAddresses(user.id), { [asset]: JSON.stringify(address) });
            break;
          }
        } catch (error) { lastError = error; }
      }
      if (!address?.address) throw new Error(lastError instanceof Error ? lastError.message : `Kraken did not return a ${asset} deposit address`);
    }
    const normalizedAddress = String(address.address).trim().toLowerCase();
    const deposits = (await getKrakenDepositStatus(asset)).filter(d => String(d.info ?? '').trim().toLowerCase() === normalizedAddress);
    const storedDeposits = (await redis.hgetall(keys.deposits(user.id))) ?? {};
    const credited = [];
    for (const deposit of deposits) {
      const confirmations = deposit.confirmations;
      // Kraken's Success status already means its funding checks passed. Older
      // API responses omit confirmations, so do not reject those valid deposits.
      const confirmed = deposit.status.toLowerCase() === 'success' && (confirmations === undefined || confirmations >= 1);
      if (!confirmed || storedDeposits[deposit.txid]) continue;
      const amount = Number(deposit.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const portfolio = await getPortfolio(user.id);
      await setBalance(user.id, asset, (portfolio[asset] ?? 0) + amount);
      const record = { txid: deposit.txid, asset, amount, address: address.address, status: 'credited', creditedAt: Date.now() };
      await redis.hset(keys.deposits(user.id), { [deposit.txid]: JSON.stringify(record) });
      credited.push(record);
    }
    return NextResponse.json({ asset, methods, address, deposits, credited, portfolio: await getPortfolio(user.id) });
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
  const idempotencyKey = request.headers.get('idempotency-key')?.trim() || String(body?.requestId ?? '').trim();
  if (!ALLOWED.has(asset) || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 1e8)) || !address) return NextResponse.json({ error: 'Enter a valid asset, amount and address.' }, { status: 400 });
  if (address.length > 128 || /\s/.test(address) || !/^[a-zA-Z0-9:_-]+$/.test(address)) return NextResponse.json({ error: 'Enter a valid destination address.' }, { status: 400 });
  if (idempotencyKey && !/^[a-zA-Z0-9_-]{8,80}$/.test(idempotencyKey)) return NextResponse.json({ error: 'Invalid withdrawal request key.' }, { status: 400 });
  if (amount > 250) return NextResponse.json({ error: 'Withdrawal limit is $250 per request.' }, { status: 400 });
  const portfolio = await getPortfolio(user.id);
  const balance = portfolio[asset] ?? 0;
  if (balance < amount) return NextResponse.json({ error: `Insufficient ${asset} balance.` }, { status: 400 });
  const fee = Math.max(0.0001, amount * 0.001);
  const requestRecord = { id: randomUUID(), userId: user.id, asset, amount, netAmount: amount - fee, fee, address, status: 'pending_review', createdAt: Date.now() };
  if (idempotencyKey) {
    const previous = await redis.get(keys.withdrawalRequest(user.id, idempotencyKey));
    if (previous) return NextResponse.json({ ok: true, duplicate: true, request: JSON.parse(String(previous)) });
  }
  try {
    if (idempotencyKey) await redis.set(keys.withdrawalRequest(user.id, idempotencyKey), JSON.stringify(requestRecord), { ex: 86400, nx: true });
    await setBalance(user.id, asset, balance - amount);
    await redis.lpush(keys.withdrawals(user.id), JSON.stringify(requestRecord));
    await redis.ltrim(keys.withdrawals(user.id), 0, 49);
    return NextResponse.json({ ok: true, request: requestRecord });
  } catch (error) {
    if (idempotencyKey) await redis.del(keys.withdrawalRequest(user.id, idempotencyKey)).catch(() => undefined);
    await setBalance(user.id, asset, balance).catch(() => undefined);
    console.error('[wallet] withdrawal request failed', error);
    return NextResponse.json({ error: 'Could not submit the withdrawal request. Your balance was restored.' }, { status: 503 });
  }
}
