import { cookies } from 'next/headers';
import { redis, keys } from '@/lib/redis';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: { name?: string; avatar_url?: string };
}

const SESSION_COOKIE = 'dcroc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const raw = await redis.get<string | AuthUser>(keys.authSession(token));
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) as AuthUser : raw; } catch { return null; }
}

export async function createSession(user: AuthUser) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await redis.set(keys.authSession(token), JSON.stringify(user));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await redis.del(keys.authSession(token));
  cookieStore.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
