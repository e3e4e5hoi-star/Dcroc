import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { keys, redis } from '@/lib/redis';
import { createSession, normalizeEmail, type AuthUser } from '@/lib/auth';
import { normalizeDigits } from '@/lib/normalize-digits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashCode(email: string, code: string) {
  return createHash('sha256').update(`${email}:${code}:${process.env.AUTH_SECRET ?? 'dcroc-otp'}`).digest('hex');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const code = typeof body?.code === 'string' ? normalizeDigits(body.code.trim()) : '';
  if (!email || !/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the 6-digit verification code.' }, { status: 400 });
  const raw = await redis.get<string>(keys.authOtp(email));
  if (!raw) return NextResponse.json({ error: 'The code is missing or expired.' }, { status: 400 });
  let record: { hash: string; expiresAt: number; attempts: number };
  try { record = JSON.parse(raw); } catch { return NextResponse.json({ error: 'The code is invalid.' }, { status: 400 }); }
  if (record.expiresAt < Date.now() || record.attempts >= 5) {
    await redis.del(keys.authOtp(email));
    return NextResponse.json({ error: 'The code is expired. Request a new one.' }, { status: 400 });
  }
  if (record.hash !== hashCode(email, code)) {
    record.attempts += 1;
    await redis.set(keys.authOtp(email), JSON.stringify(record));
    return NextResponse.json({ error: 'Incorrect verification code.' }, { status: 400 });
  }
  await redis.del(keys.authOtp(email));
  const existingId = await redis.get<string>(keys.authByEmail(email));
  const id = existingId ?? crypto.randomUUID();
  const user: AuthUser = { id, email, user_metadata: { name: email.split('@')[0] } };
  await redis.set(keys.authByEmail(email), id);
  await redis.set(keys.authUser(id), JSON.stringify(user));
  await createSession(user);
  return NextResponse.json({ ok: true });
}
