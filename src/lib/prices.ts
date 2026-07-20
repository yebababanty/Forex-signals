// Real-time price fetcher using multiple free APIs with fallbacks
// Sources: Yahoo Finance, gold-api, exchangerate-api

interface PriceCache {
  price: number;
  timestamp: number;
}

const CACHE: Record<string, PriceCache> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds

// Realistic fallback prices (updated Nov 2024)
const FALLBACK: Record<string, number> = {
  "EUR/USD": 1.0550,
  "GBP/USD": 1.2650,
  "USD/JPY": 154.50,
  "GBP/JPY": 195.30,
  "AUD/USD": 0.6580,
  "USD/CAD": 1.3950,
  "USD/CHF": 0.8820,
  "NZD/USD": 0.5920,
  "XAU/USD": 4008.00,
  "XAG/USD": 47.50,
  "USOIL": 68.50,
  "NAS100": 20800.00,
  "US30": 44500.00,
};

// Yahoo Finance symbols
const YAHOO_SYMBOLS: Record<string, string> = {
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "USD/JPY": "JPY=X",
  "GBP/JPY": "GBPJPY=X",
  "AUD/USD": "AUDUSD=X",
  "USD/CAD": "CAD=X",
  "USD/CHF": "CHF=X",
  "NZD/USD": "NZDUSD=X",
  "XAU/USD": "GC=F",     // Gold futures
  "XAG/USD": "SI=F",     // Silver futures
  "USOIL": "CL=F",       // Crude oil futures
  "NAS100": "^NDX",      // Nasdaq 100
  "US30": "^DJI",        // Dow Jones
};

async function fetchYahoo(symbol: string): Promise<number | null> {
  try {
    const yahooSymbol = YAHOO_SYMBOLS[symbol];
    if (!yahooSymbol) return null;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ForexSignals/1.0)",
        "Accept": "application/json",
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && !isNaN(price) ? price : null;
  } catch (e) {
    console.error(`Yahoo failed for ${symbol}:`, e);
    return null;
  }
}

async function fetchGoldAPI(symbol: string): Promise<number | null> {
  try {
    const metal = symbol === "XAU/USD" ? "XAU" : symbol === "XAG/USD" ? "XAG" : null;
    if (!metal) return null;

    const res = await fetch(`https://api.gold-api.com/price/${metal}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.price === "number" ? data.price : null;
  } catch {
    return null;
  }
}

async function fetchExchangeRate(symbol: string): Promise<number | null> {
  try {
    if (!symbol.includes("/") || symbol.startsWith("XAU") || symbol.startsWith("XAG")) return null;

    const [base, quote] = symbol.split("/");
    // Use open.er-api.com (free, no key)
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.[quote];
    return typeof rate === "number" ? rate : null;
  } catch {
    return null;
  }
}

export async function getLivePrice(symbol: string): Promise<number> {
  // Check cache first
  const cached = CACHE[symbol];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  let price: number | null = null;

  // Try Yahoo Finance first (most reliable, covers everything)
  price = await fetchYahoo(symbol);

  // Fallback to gold-api for metals
  if (!price && (symbol === "XAU/USD" || symbol === "XAG/USD")) {
    price = await fetchGoldAPI(symbol);
  }

  // Fallback to exchange rate for forex
  if (!price && symbol.includes("/")) {
    price = await fetchExchangeRate(symbol);
  }

  // Final fallback to hardcoded
  if (!price || isNaN(price)) {
    console.warn(`⚠️ Using fallback price for ${symbol}`);
    price = FALLBACK[symbol] || 1;
  }

  CACHE[symbol] = { price, timestamp: Date.now() };
  console.log(`✅ Live price ${symbol}: ${price}`);
  return price;
}

// Get pip size and decimals per instrument
export function getInstrumentSpec(symbol: string) {
  if (symbol === "XAU/USD") return { pipSize: 0.1, decimals: 2, pipLabel: "pts", riskPoints: 100 };
  if (symbol === "XAG/USD") return { pipSize: 0.01, decimals: 3, pipLabel: "pts", riskPoints: 30 };
  if (symbol === "USOIL")   return { pipSize: 0.01, decimals: 2, pipLabel: "cts", riskPoints: 50 };
  if (symbol === "NAS100")  return { pipSize: 1, decimals: 1, pipLabel: "pts", riskPoints: 80 };
  if (symbol === "US30")    return { pipSize: 1, decimals: 1, pipLabel: "pts", riskPoints: 100 };
  if (symbol.includes("JPY")) return { pipSize: 0.01, decimals: 3, pipLabel: "pips", riskPoints: 30 };
  return { pipSize: 0.0001, decimals: 5, pipLabel: "pips", riskPoints: 30 };
}

// Batch fetch for efficiency
export async function getLivePrices(symbols: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  await Promise.all(
    symbols.map(async (s) => {
      results[s] = await getLivePrice(s);
    })
  );
  return results;
}
