import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getPortfolio, setBalance } from '@/lib/redis';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  if (!signature || !secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const asset = session.metadata?.creditAsset;
    const amount = Number(session.metadata?.creditAmount);
    if (session.payment_status === 'paid' && userId && asset === 'USDC' && Number.isFinite(amount) && amount > 0) {
      const portfolio = await getPortfolio(userId);
      await setBalance(userId, asset, (portfolio[asset] ?? 0) + amount);
    }
  }

  return NextResponse.json({ received: true });
}
