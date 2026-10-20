import { Redis } from '@upstash/redis';

// Singleton Redis client
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const fallbackHashes = new Map<string, Record<string, string>>();
const fallbackValues = new Map<string, string>();
const fallbackLists = new Map<string, string[]>();

// Keep the preview usable while environment variables are being injected. A
// configured deployment still uses Upstash for durable portfolio data.
export const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : {
      async get<T>(key: string) { return (fallbackValues.get(key) as T | undefined) ?? null; },
      async set(key: string, value: string | number) { fallbackValues.set(key, String(value)); return 'OK'; },
      async del(key: string) { fallbackValues.delete(key); fallbackHashes.delete(key); fallbackLists.delete(key); return 1; },
      async hgetall(key: string) { return fallbackHashes.get(key) ?? {}; },
      async hset(key: string, values: Record<string, string>) {
        fallbackHashes.set(key, { ...(fallbackHashes.get(key) ?? {}), ...values });
        return Object.keys(values).length;
      },
      async hdel(key: string, field: string) {
        const hash = fallbackHashes.get(key) ?? {};
        delete hash[field];
        fallbackHashes.set(key, hash);
        return 1;
      },
      async lpush(key: string, value: string) {
        const list = fallbackLists.get(key) ?? [];
        list.unshift(value);
        fallbackLists.set(key, list);
        return list.length;
      },
      async ltrim(key: string, start: number, end: number) {
        fallbackLists.set(key, (fallbackLists.get(key) ?? []).slice(start, end + 1));
        return 'OK';
      },
      async lrange(key: string, start: number, end: number) {
        return (fallbackLists.get(key) ?? []).slice(start, end + 1);
      },
    };

// ── Key helpers ───────────────────────────────────────────────────
export const keys = {
  portfolio:   (uid: string) => `user:${uid}:portfolio`,
  orders:      (uid: string) => `user:${uid}:orders`,
  swaps:       (uid: string) => `user:${uid}:swaps`,
  priceCache:  () => 'prices:cache',
  priceTs:     () => 'prices:ts',
  authOtp:     (email: string) => `auth:otp:${email}`,
  authUser:    (id: string) => `auth:user:${id}`,
  authByEmail: (email: string) => `auth:email:${email}`,
  authSession: (token: string) => `auth:session:${token}`,
  walletAddresses: (uid: string) => `user:${uid}:wallet:addresses`,
  withdrawals: (uid: string) => `user:${uid}:wallet:withdrawals`,
};

// ── Portfolio helpers ─────────────────────────────────────────────
export async function getPortfolio(uid: string): Promise<Record<string, number>> {
  const raw = await redis.hgetall(keys.portfolio(uid));
  if (!raw || Object.keys(raw).length === 0) return {};
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, parseFloat(v as string)])
  );
}

export async function setBalance(uid: string, symbol: string, amount: number) {
  if (amount < 0) amount = 0;
  if (amount === 0) {
    await redis.hdel(keys.portfolio(uid), symbol);
  } else {
    await redis.hset(keys.portfolio(uid), { [symbol]: amount.toString() });
  }
}

// ── Transaction log helpers ────────────────────────────────────────
export interface TxRecord {
  id:        string;
  type:      'swap' | 'buy' | 'sell' | 'withdrawal';
  fromSym:   string;
  toSym:     string;
  fromAmt:   number;
  toAmt:     number;
  price:     number;
  fee:       number;
  ts:        number;
}

export async function logTx(uid: string, tx: TxRecord) {
  const key = keys.swaps(uid);
  await redis.lpush(key, JSON.stringify(tx));
  await redis.ltrim(key, 0, 99); // keep last 100 transactions
}

export async function getTxHistory(uid: string): Promise<TxRecord[]> {
  const raw = await redis.lrange(keys.swaps(uid), 0, 49);
  return raw.map(r => JSON.parse(r as string)) as TxRecord[];
}
