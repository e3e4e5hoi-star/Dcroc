import { NextResponse } from 'next/server';
import { getPrices } from '@/lib/prices';

export const revalidate = 30;

export async function GET() {
  try {
    const prices = await getPrices();
    const ticker = Object.fromEntries(Object.entries(prices).map(([symbol, price]) => [symbol, { symbol, price, currency: 'USD' }]));
    return NextResponse.json({ ticker, updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
  } catch {
    return NextResponse.json({ error: 'Price feed unavailable' }, { status: 503 });
  }
}
