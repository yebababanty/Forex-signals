// Real-time price fetcher with multi-source fallback
// Primary: gold-api.com for metals, Yahoo for FX/indices, exchangerate for FX backup

interface PriceCache {
  price: number;
  timestamp: number;
}

const CACHE: Record<string, PriceCache> = {};
const CACHE_TTL = 30 * 1000;

const FALLBACK: Record<string, number> = {
  "EUR/USD": 1.0550, "GBP/USD": 1.2650, "USD/JPY": 154.50, "GBP/JPY": 195.30,
  "AUD/USD": 0.6580, "USD/CAD": 1.3950, "USD/CHF": 0.8820, "NZD/USD": 0.5920,
  "XAU/USD": 4008.00, "XAG/USD": 47.50, "USOIL": 68.50,
  "NAS100": 20800.00, "US30": 44500.00,
};

const YAHOO_SYMBOLS: Record<string, string> = {
  "EUR/USD": "EURUSD=X", "GBP/USD": "GBPUSD=X", "USD/JPY": "USDJPY=X",
  "GBP/JPY": "GBPJPY=X", "AUD/USD": "AUDUSD=X", "USD/CAD": "USDCAD=X",
  "USD/CHF": "USDCHF=X", "NZD/USD": "NZDUSD=X",
  "USOIL": "CL=F", "NAS100": "^NDX", "US30": "^DJI",
};

// PRIMARY source for gold/silver: gold-api.com (real spot price)
async function fetchGoldAPI(symbol: string): Promise<number | null> {
  try {
    const metal = symbol === "XAU/USD" ? "XAU" : symbol === "XAG/USD" ? "XAG" : null;
    if (!metal) return null;
    const res = await fetch(`https://api.gold-api.com/price/${metal}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const p = typeof data?.price === "number" ? data.price : null;
    if (p && p > 100) return p; // Sanity check: gold should be > $100
    return null;
  } catch (e) {
    console.error(`gold-api failed for ${symbol}:`, e);
    return null;
  }
}

// Metals.dev free tier backup
async function fetchMetalsBackup(symbol: string): Promise<number | null> {
  try {
    if (symbol !== "XAU/USD" && symbol !== "XAG/USD") return null;
    // Try alternate free source
    const res = await fetch(`https://data-asg.goldprice.org/dbXRates/USD`, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data?.items?.[0];
    if (!items) return null;
    if (symbol === "XAU/USD" && items.xauPrice) return items.xauPrice;
    if (symbol === "XAG/USD" && items.xagPrice) return items.xagPrice;
    return null;
  } catch {
    return null;
  }
}

async function fetchYahoo(symbol: string): Promise<number | null> {
  try {
    const ys = YAHOO_SYMBOLS[symbol];
    if (!ys) return null;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ys}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof p === "number" && !isNaN(p) ? p : null;
  } catch (e) {
    console.error(`Yahoo failed for ${symbol}:`, e);
    return null;
  }
}

async function fetchExchangeRate(symbol: string): Promise<number | null> {
  try {
    if (!symbol.includes("/") || symbol.startsWith("XAU") || symbol.startsWith("XAG")) return null;
    const [base, quote] = symbol.split("/");
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.[quote];
    return typeof rate === "number" ? rate : null;
  } catch { return null; }
}

export async function getLivePrice(symbol: string): Promise<number> {
  const cached = CACHE[symbol];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.price;

  let price: number | null = null;

  // METALS: gold-api first, then goldprice.org, then Yahoo
  if (symbol === "XAU/USD" || symbol === "XAG/USD") {
    price = await fetchGoldAPI(symbol);
    if (!price) price = await fetchMetalsBackup(symbol);
    if (!price) price = await fetchYahoo(symbol);
  }
  // Everything else: Yahoo first
  else {
    price = await fetchYahoo(symbol);
    if (!price && symbol.includes("/")) price = await fetchExchangeRate(symbol);
  }

  // Sanity checks — reject bogus prices
  if (price) {
    if (symbol === "XAU/USD" && price < 1000) price = null; // Gold can't be below $1000
    if (symbol === "XAG/USD" && price < 5) price = null;
    if (symbol === "US30" && price < 10000) price = null;
    if (symbol === "NAS100" && price < 5000) price = null;
  }

  if (!price || isNaN(price)) {
    console.warn(`⚠️ Using fallback for ${symbol}`);
    price = FALLBACK[symbol] || 1;
  }

  CACHE[symbol] = { price, timestamp: Date.now() };
  console.log(`✅ ${symbol}: ${price}`);
  return price;
}

export function getInstrumentSpec(symbol: string) {
  if (symbol === "XAU/USD") return { pipSize: 0.1, decimals: 2, pipLabel: "pts", riskPoints: 100 };
  if (symbol === "XAG/USD") return { pipSize: 0.01, decimals: 3, pipLabel: "pts", riskPoints: 30 };
  if (symbol === "USOIL")   return { pipSize: 0.01, decimals: 2, pipLabel: "cts", riskPoints: 50 };
  if (symbol === "NAS100")  return { pipSize: 1, decimals: 1, pipLabel: "pts", riskPoints: 80 };
  if (symbol === "US30")    return { pipSize: 1, decimals: 1, pipLabel: "pts", riskPoints: 100 };
  if (symbol.includes("JPY")) return { pipSize: 0.01, decimals: 3, pipLabel: "pips", riskPoints: 30 };
  return { pipSize: 0.0001, decimals: 5, pipLabel: "pips", riskPoints: 30 };
}
