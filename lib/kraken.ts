import crypto from "crypto"

const KRAKEN_API_URL = "https://api.kraken.com"

const ASSET_CODES: Record<string, string> = {
  BTC: "XBT",
  DOGE: "DOGE",
  ETH: "ETH",
  LTC: "LTC",
  XMR: "XMR",
  SOL: "SOL",
  USDT: "USDT",
  USDC: "USDC",
  USD: "ZUSD",
  EUR: "ZEUR",
}

function getCredentials() {
  const key = process.env.KRAKEN_API_KEY
  const secret = process.env.KRAKEN_API_SECRET
  if (!key || !secret) throw new Error("Kraken credentials are not configured")
  return { key, secret }
}

function pairCode(base: string, quote: string) {
  return `${ASSET_CODES[base] ?? base}${ASSET_CODES[quote] ?? quote}`
}

export async function placeKrakenOrder(input: {
  side: "buy" | "sell"
  baseSym: string
  quoteSym: string
  amount: number
  orderType: "market" | "limit"
  limitPrice?: number
}) {
  const { key, secret } = getCredentials()
  const nonce = Date.now() * 1000
  const params = new URLSearchParams({
    nonce: String(nonce),
    ordertype: input.orderType,
    type: input.side,
    volume: input.amount.toPrecision(12),
    pair: pairCode(input.baseSym, input.quoteSym),
  })
  if (input.orderType === "limit" && input.limitPrice) {
    params.set("price", input.limitPrice.toPrecision(12))
  }

  const path = "/0/private/AddOrder"
  const body = params.toString()
  const hash = crypto.createHash("sha256").update(nonce + body).digest()
  const signature = crypto.createHmac("sha512", Buffer.from(secret, "base64")).update(path + hash).digest("base64")

  const response = await fetch(`${KRAKEN_API_URL}${path}`, {
    method: "POST",
    headers: {
      "API-Key": key,
      "API-Sign": signature,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Kraken HTTP error: ${response.status}`)

  const result = (await response.json()) as { error?: string[]; result?: { txid?: string[]; descr?: { order?: string } } }
  if (result.error?.length) throw new Error(result.error.join(", "))
  if (!result.result?.txid?.length) throw new Error("Kraken did not return an order id")
  return { txid: result.result.txid[0], description: result.result.descr?.order }
}

export async function getKrakenTicker(baseSym: string, quoteSym: string) {
  const pair = pairCode(baseSym, quoteSym)
  const response = await fetch(`${KRAKEN_API_URL}/0/public/Ticker?pair=${encodeURIComponent(pair)}`, { cache: "no-store" })
  const data = (await response.json()) as { error?: string[]; result?: Record<string, { c?: string[] }> }
  if (data.error?.length || !data.result) throw new Error(data.error?.join(", ") || "Kraken ticker unavailable")
  const ticker = Object.values(data.result)[0]
  const price = Number(ticker?.c?.[0])
  if (!Number.isFinite(price) || price <= 0) throw new Error("Kraken returned an invalid price")
  return price
}

export async function getKrakenMarginPair(baseSym: string, quoteSym: string) {
  const pair = pairCode(baseSym, quoteSym)
  const response = await fetch(`${KRAKEN_API_URL}/0/public/AssetPairs?pair=${encodeURIComponent(pair)}&info=leverage`, { cache: "no-store" })
  const data = (await response.json()) as { error?: string[]; result?: Record<string, { leverage_buy?: number[]; leverage_sell?: number[]; altname?: string }> }
  if (data.error?.length || !data.result) throw new Error(data.error?.join(", ") || "Kraken pair unavailable")
  const pairInfo = Object.values(data.result)[0]
  if (!pairInfo?.leverage_buy?.length && !pairInfo?.leverage_sell?.length) throw new Error("This Kraken pair does not support margin")
  return pairInfo
}

export async function placeKrakenMarginOrder(input: {
  side: "buy" | "sell"
  baseSym: string
  quoteSym: string
  volume: number
  leverage: number
  stopLoss?: number
}) {
  const { key, secret } = getCredentials()
  const nonce = Date.now() * 1000
  const pair = pairCode(input.baseSym, input.quoteSym)
  const params = new URLSearchParams({
    nonce: String(nonce),
    ordertype: "market",
    type: input.side,
    volume: input.volume.toPrecision(12),
    pair,
    leverage: String(input.leverage),
  })
  if (input.stopLoss && Number.isFinite(input.stopLoss)) {
    params.set("close[ordertype]", "stop-loss")
    params.set("close[price]", input.stopLoss.toPrecision(12))
  }
  const path = "/0/private/AddOrder"
  const body = params.toString()
  const hash = crypto.createHash("sha256").update(nonce + body).digest()
  const signature = crypto.createHmac("sha512", Buffer.from(secret, "base64")).update(path + hash).digest("base64")
  const response = await fetch(`${KRAKEN_API_URL}${path}`, {
    method: "POST",
    headers: { "API-Key": key, "API-Sign": signature, "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Kraken HTTP error: ${response.status}`)
  const result = (await response.json()) as { error?: string[]; result?: { txid?: string[]; descr?: { order?: string } } }
  if (result.error?.length) throw new Error(result.error.join(", "))
  if (!result.result?.txid?.length) throw new Error("Kraken did not return a margin order id")
  return { txid: result.result.txid[0], description: result.result.descr?.order }
}
