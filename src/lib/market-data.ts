import axios from "axios";
import { OHLCV } from "./types";

const API_KEY = process.env.TWELVE_DATA_API_KEY!;
const BASE = "https://api.twelvedata.com";

const TF_MAP: Record<string, string> = {
  "15m": "15min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1day",
  "1w": "1week",
};

export async function fetchCandles(
  symbol: string,
  timeframe: string,
  count = 200
): Promise<OHLCV[]> {
  const interval = TF_MAP[timeframe] || timeframe;

  const { data } = await axios.get(`${BASE}/time_series`, {
    params: {
      symbol,
      interval,
      outputsize: count,
      apikey: API_KEY,
      format: "JSON",
    },
  });

  if (data.status === "error") {
    throw new Error(`Twelve Data error: ${data.message}`);
  }

  const values: any[] = data.values || [];
  return values
    .map((v: any) => ({
      time: v.datetime,
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseFloat(v.volume || "0"),
    }))
    .reverse();
}

export async function fetchMultiTF(
  symbol: string,
  primaryTF: string
): Promise<Record<string, OHLCV[]>> {
  const tfMap: Record<string, string[]> = {
    "15m": ["15m", "1h", "4h"],
    "1h": ["1h", "4h", "1d"],
    "4h": ["4h", "1d", "1w"],
    "1d": ["1d", "1w", "1w"],
  };

  const timeframes = tfMap[primaryTF] || ["1h", "4h", "1d"];
  const results: Record<string, OHLCV[]> = {};

  for (const tf of timeframes) {
    results[tf] = await fetchCandles(symbol, tf, 200);
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}

export function getHigherTF(tf: string): string {
  const map: Record<string, string> = {
    "15m": "1h",
    "1h": "4h",
    "4h": "1d",
    "1d": "1w",
  };
  return map[tf] || "1d";
}

export const PAIRS = [
  { symbol: "EUR/USD", code: "EURUSD" },
  { symbol: "GBP/USD", code: "GBPUSD" },
  { symbol: "USD/JPY", code: "USDJPY" },
  { symbol: "GBP/JPY", code: "GBPJPY" },
  { symbol: "AUD/USD", code: "AUDUSD" },
  { symbol: "USD/CAD", code: "USDCAD" },
  { symbol: "EUR/GBP", code: "EURGBP" },
  { symbol: "NZD/USD", code: "NZDUSD" },
];

export function pipValue(pair: string): number {
  return pair.includes("JPY") ? 0.01 : 0.0001;
}

export function toPips(pair: string, priceDistance: number): number {
  return Math.abs(priceDistance) / pipValue(pair);
}
