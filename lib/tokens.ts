export interface Token {
  symbol:   string;
  name:     string;
  geckoId:  string;
  color:    string;
  decimals: number;
  type:     'crypto' | 'stable' | 'defi';
  chain?:   string;
}

export const TOKENS: Token[] = [
  // ── Major Layer-1 ────────────────────────────────────────────────
  { symbol: 'BTC',   name: 'Bitcoin',          geckoId: 'bitcoin',                        color: '#f7931a', decimals: 8,  type: 'crypto' },
  { symbol: 'ETH',   name: 'Ethereum',          geckoId: 'ethereum',                       color: '#627eea', decimals: 18, type: 'crypto' },
  { symbol: 'SOL',   name: 'Solana',            geckoId: 'solana',                         color: '#9945ff', decimals: 9,  type: 'crypto' },
  { symbol: 'BNB',   name: 'BNB',               geckoId: 'binancecoin',                    color: '#f3ba2f', decimals: 18, type: 'crypto' },
  { symbol: 'XRP',   name: 'XRP',               geckoId: 'ripple',                         color: '#006097', decimals: 6,  type: 'crypto' },
  { symbol: 'ADA',   name: 'Cardano',           geckoId: 'cardano',                        color: '#0033ad', decimals: 6,  type: 'crypto' },
  { symbol: 'AVAX',  name: 'Avalanche',         geckoId: 'avalanche-2',                    color: '#e84142', decimals: 18, type: 'crypto' },
  { symbol: 'DOGE',  name: 'Dogecoin',          geckoId: 'dogecoin',                       color: '#c3a634', decimals: 8,  type: 'crypto' },
  { symbol: 'DOT',   name: 'Polkadot',          geckoId: 'polkadot',                       color: '#e6007a', decimals: 10, type: 'crypto' },
  { symbol: 'MATIC', name: 'Polygon',           geckoId: 'matic-network',                  color: '#8247e5', decimals: 18, type: 'crypto' },
  { symbol: 'ATOM',  name: 'Cosmos',            geckoId: 'cosmos',                         color: '#2e3148', decimals: 6,  type: 'crypto' },
  { symbol: 'NEAR',  name: 'NEAR Protocol',     geckoId: 'near',                           color: '#00ec97', decimals: 24, type: 'crypto' },
  { symbol: 'SUI',   name: 'Sui',               geckoId: 'sui',                            color: '#4da2ff', decimals: 9,  type: 'crypto' },
  { symbol: 'APT',   name: 'Aptos',             geckoId: 'aptos',                          color: '#00d4ab', decimals: 8,  type: 'crypto' },
  { symbol: 'LTC',   name: 'Litecoin',          geckoId: 'litecoin',                       color: '#bfbbbb', decimals: 8,  type: 'crypto' },
  { symbol: 'HBAR',  name: 'Hedera',            geckoId: 'hedera-hashgraph',               color: '#222', decimals: 8,    type: 'crypto' },
  { symbol: 'XMR',   name: 'Monero',             geckoId: 'monero',                          color: '#ff6600', decimals: 12,   type: 'crypto' },
  // ── Layer-2 / EVM ────────────────────────────────────────────────
  { symbol: 'OP',    name: 'Optimism',          geckoId: 'optimism',                       color: '#ff0420', decimals: 18, type: 'crypto', chain: 'Optimism' },
  { symbol: 'ARB',   name: 'Arbitrum',          geckoId: 'arbitrum',                       color: '#28a0f0', decimals: 18, type: 'crypto', chain: 'Arbitrum' },
  { symbol: 'INJ',   name: 'Injective',         geckoId: 'injective-protocol',             color: '#0082fa', decimals: 18, type: 'crypto' },
  // ── DeFi ─────────────────────────────────────────────────────────
  { symbol: 'LINK',  name: 'Chainlink',         geckoId: 'chainlink',                      color: '#2a5ada', decimals: 18, type: 'defi' },
  { symbol: 'UNI',   name: 'Uniswap',           geckoId: 'uniswap',                        color: '#ff007a', decimals: 18, type: 'defi' },
  { symbol: 'AAVE',  name: 'Aave',              geckoId: 'aave',                           color: '#b6509e', decimals: 18, type: 'defi' },
  { symbol: 'MKR',   name: 'Maker',             geckoId: 'maker',                          color: '#1aab9b', decimals: 18, type: 'defi' },
  { symbol: 'COMP',  name: 'Compound',          geckoId: 'compound-governance-token',      color: '#00d395', decimals: 18, type: 'defi' },
  { symbol: 'LDO',   name: 'Lido DAO',          geckoId: 'lido-dao',                       color: '#00a3ff', decimals: 18, type: 'defi' },
  { symbol: 'CRV',   name: 'Curve DAO',         geckoId: 'curve-dao-token',                color: '#3a3a3a', decimals: 18, type: 'defi' },
  { symbol: 'JTO',   name: 'Jito',              geckoId: 'jito-governance-token',          color: '#25d366', decimals: 9,  type: 'defi', chain: 'Solana' },
  // ── Stablecoins ───────────────────────────────────────────────────
  { symbol: 'USDT',  name: 'Tether USD',        geckoId: 'tether',                         color: '#26a17b', decimals: 6,  type: 'stable' },
  { symbol: 'USDC',  name: 'USD Coin',          geckoId: 'usd-coin',                       color: '#2775ca', decimals: 6,  type: 'stable' },
  { symbol: 'DAI',   name: 'Dai',               geckoId: 'dai',                            color: '#f5ac37', decimals: 18, type: 'stable' },
  { symbol: 'PYUSD', name: 'PayPal USD',        geckoId: 'paypal-usd',                     color: '#003087', decimals: 6,  type: 'stable' },
];

export const TOKEN_MAP = Object.fromEntries(TOKENS.map(t => [t.symbol, t]));

export const INITIAL_PORTFOLIO: Record<string, number> = {
  USDT: 10000,
  USDC: 5000,
  ETH:  0.5,
  BTC:  0.005,
  SOL:  10,
  BNB:  1,
};

export const GECKO_IDS = TOKENS.map(t => t.geckoId);
