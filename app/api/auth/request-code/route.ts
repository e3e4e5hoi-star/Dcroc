import { NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import { keys, redis } from '@/lib/redis';
import { normalizeEmail } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const OTP_TTL_SECONDS = 10 * 60;
const RESEND_API_URL = 'https://api.resend.com/emails';

function hashCode(email: string, code: string) {
  return createHash('sha256').update(`${email}:${code}:${process.env.AUTH_SECRET ?? 'dcroc-otp'}`).digest('hex');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  const existing = await redis.get<string>(keys.authOtp(email));
  if (existing) return NextResponse.json({ error: 'Please wait before requesting another code.' }, { status: 429 });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email service is not configured yet.' }, { status: 503 });
  const code = String(randomInt(100000, 1000000));
  const result = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.DCROC_EMAIL_FROM ?? 'Dcroc Exchange <no-reply@travian.icu>',
      to: [email],
      subject: 'Your Dcroc Exchange verification code',
      text: `Your Dcroc Exchange verification code is ${code}. It expires in 10 minutes.`,
      html: `<div style="font-family:Arial,sans-serif"><h2>Dcroc Exchange</h2><p>Your verification code is:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes.</p></div>`,
    }),
  });
  if (!result.ok) {
    console.error('Resend request failed', await result.text());
    return NextResponse.json({ error: 'Could not send the verification email.' }, { status: 502 });
  }
  await redis.set(keys.authOtp(email), JSON.stringify({ hash: hashCode(email, code), expiresAt: Date.now() + OTP_TTL_SECONDS * 1000, attempts: 0 }));
  return NextResponse.json({ ok: true });
}
