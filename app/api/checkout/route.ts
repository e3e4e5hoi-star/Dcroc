import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const amountUsd = Number(body?.amountUsd);
  if (!Number.isInteger(amountUsd * 100) || amountUsd < 10 || amountUsd > 250) {
    return NextResponse.json({ error: 'Amount must be between $10 and $250.' }, { status: 400 });
  }

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    ui_mode: 'hosted_page',
    line_items: [{ price_data: { currency: 'usd', product_data: { name: 'SwapX account balance' }, unit_amount: Math.round(amountUsd * 100) }, quantity: 1 }],
    customer_email: user.email ?? undefined,
    metadata: { userId: user.id, creditAsset: 'USDC', creditAmount: amountUsd.toFixed(2) },
    success_url: `${origin}/dashboard?payment=success`,
    cancel_url: `${origin}/dashboard?payment=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
