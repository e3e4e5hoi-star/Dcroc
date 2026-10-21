import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPrices } from '@/lib/prices';
import { getPortfolio } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 12;
const MAX_CHARS = 1200;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  const safeMessages = (messages as unknown[])
    .filter((message: unknown): message is { role: 'user' | 'assistant'; content: string } => {
      if (!message || typeof message !== 'object') return false;
      const value = message as Record<string, unknown>;
      return (value.role === 'user' || value.role === 'assistant') && typeof value.content === 'string';
    })
    .map(message => ({ role: message.role, content: message.content.slice(0, MAX_CHARS) }));

  const [prices, portfolio] = await Promise.all([getPrices(), getPortfolio(user.id)]);
  const context = JSON.stringify({ prices, portfolio: Object.keys(portfolio) });
  const result = await generateText({
    model: 'openai/gpt-4o-mini',
    instructions: `You are SwapX support, a careful crypto exchange support assistant. Answer in English, concise and professional. Explain that you cannot execute trades, approve withdrawals, or change security settings. Never request API keys, passwords, seed phrases, private keys, or full wallet secrets. Give operational help about deposits, pending withdrawals, Kraken spot trading, margin risk, fees, and account navigation. Never promise a withdrawal or a price. Current non-sensitive app context: ${context}`,
    messages: safeMessages,
    maxOutputTokens: 300,
    temperature: 0.2,
  });

  return NextResponse.json({ message: result.text });
}
