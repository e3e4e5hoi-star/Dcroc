import { NextResponse } from 'next/server';
import { TOKENS } from '@/lib/tokens';

export const revalidate = 60;

export async function GET() {
  const markets = TOKENS.filter(token => token.type === 'crypto').map(token => ({
    symbol: `${token.symbol}/USDT`,
    base: token.symbol,
    quote: 'USDT',
    name: token.name,
    chain: token.chain ?? null,
    status: 'active',
  }));
  return NextResponse.json({ markets, updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
