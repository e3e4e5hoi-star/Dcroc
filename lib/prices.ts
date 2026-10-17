import { redis, keys } from './redis';
import { GECKO_IDS, TOKEN_MAP, TOKENS } from './tokens';

const CACHE_TTL = 60; // seconds

export interface PriceMap { [symbol: string]: number; }

export async function getPrices(): Promise<PriceMap> {
  // Redis may be temporarily unavailable during preview startup. Price fetching
  // must still work without turning the whole page into a server error.
  try {
    const cacheTs = await redis.get<number>(keys.priceTs());
    if (cacheTs && Date.now() - cacheTs < CACHE_TTL * 1000) {
      const raw = await redis.hgetall(keys.priceCache());
      if (raw && Object.keys(raw).length > 0) {
        return Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, parseFloat(v as string)])
        );
      }
    }
  } catch {
    // Continue with the live CoinGecko request.
  }

  // Fetch from CoinGecko
  try {
    const ids = GECKO_IDS.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res  = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });
    const data = await res.json();

    const priceMap: PriceMap = {};
    for (const token of TOKENS) {
      const usd = data[token.geckoId]?.usd;
      if (usd) priceMap[token.symbol] = usd;
    }

    // Cache in Redis
    const toStore: Record<string, string> = {};
    for (const [sym, price] of Object.entries(priceMap)) toStore[sym] = price.toString();
    if (Object.keys(toStore).length > 0) {
      await redis.hset(keys.priceCache(), toStore);
      await redis.set(keys.priceTs(), Date.now());
    }

    return priceMap;
  } catch {
    // Return cached prices even if stale, when Redis is available.
    try {
      const raw = await redis.hgetall(keys.priceCache());
      if (!raw) return {};
      return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, parseFloat(v as string)]));
    } catch {
      return {};
    }
  }
}
