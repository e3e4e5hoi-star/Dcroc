import { GECKO_IDS } from './tokens';

export async function getTokenImages(): Promise<Record<string, string>> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(GECKO_IDS.join(','))}&per_page=250&page=1&sparkline=false`;
    const response = await fetch(url, { next: { revalidate: 86400 }, headers: { Accept: 'application/json' } });
    if (!response.ok) return {};
    const data = (await response.json()) as Array<{ id: string; image?: string }>;
    return Object.fromEntries(data.filter(item => item.image).map(item => [item.id, item.image as string]));
  } catch {
    return {};
  }
}
