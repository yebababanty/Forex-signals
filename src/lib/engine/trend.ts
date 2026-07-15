import { OHLCV, TrendResult } from "../types";
import { ema } from "./indicators";

export function analyzeTrend(
  candles: OHLCV[],
  higherTFCandles?: OHLCV[]
): TrendResult {
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);

  const e20 = ema20[ema20.length - 1];
  const e50 = ema50[ema50.length - 1];
  const e200 = ema200[ema200.length - 1];

  const alignment = getEMAAlignment(currentPrice, e20, e50, e200);
  const structure = detectMarketStructure(candles);

  let htfBias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (higherTFCandles && higherTFCandles.length > 200) {
    const htfCloses = higherTFCandles.map((c) => c.close);
    const htfEma50 = ema(htfCloses, 50);
    const htfEma200 = ema(htfCloses, 200);
    const htf50 = htfEma50[htfEma50.length - 1];
    const htf200 = htfEma200[htfEma200.length - 1];
    const htfPrice = htfCloses[htfCloses.length - 1];

    if (htfPrice > htf50 && htf50 > htf200) htfBias = "BULLISH";
    else if (htfPrice < htf50 && htf50 < htf200) htfBias = "BEARISH";
  }

  const score = calculateTrendScore(alignment, structure, htfBias);
  const direction: "BULLISH" | "BEARISH" | "NEUTRAL" =
    score >= 60 ? "BULLISH" : score <= 40 ? "BEARISH" : "NEUTRAL";

  return {
    direction,
    strength: Math.abs(score - 50) * 2,
    ema20: parseFloat(e20.toFixed(5)),
    ema50: parseFloat(e50.toFixed(5)),
    ema200: parseFloat(e200.toFixed(5)),
    alignment,
    higherTFBias: htfBias,
    marketStructure: structure,
  };
}

function getEMAAlignment(price: number, e20: number, e50: number, e200: number): string {
  if (price > e20 && e20 > e50 && e50 > e200) return "strong_bullish";
  if (price > e50 && e50 > e200) return "bullish";
  if (price > e200 && e20 > e200) return "weak_bullish";
  if (price < e20 && e20 < e50 && e50 < e200) return "strong_bearish";
  if (price < e50 && e50 < e200) return "bearish";
  if (price < e200 && e20 < e200) return "weak_bearish";
  return "mixed";
}

function detectMarketStructure(candles: OHLCV[]): string {
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = 3; i < candles.length - 3; i++) {
    const windowHighs = candles.slice(i - 3, i + 4).map((c) => c.high);
    const windowLows = candles.slice(i - 3, i + 4).map((c) => c.low);

    if (candles[i].high === Math.max(...windowHighs)) {
      swingHighs.push(candles[i].high);
    }
    if (candles[i].low === Math.min(...windowLows)) {
      swingLows.push(candles[i].low);
    }
  }

  if (swingHighs.length < 2 || swingLows.length < 2) return "insufficient_data";

  const recentHighs = swingHighs.slice(-3);
  const recentLows = swingLows.slice(-3);

  const higherHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1] > recentHighs[recentHighs.length - 2];
  const higherLows = recentLows.length >= 2 && recentLows[recentLows.length - 1] > recentLows[recentLows.length - 2];
  const lowerHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1] < recentHighs[recentHighs.length - 2];
  const lowerLows = recentLows.length >= 2 && recentLows[recentLows.length - 1] < recentLows[recentLows.length - 2];

  if (higherHighs && higherLows) return "higher_highs_higher_lows";
  if (lowerHighs && lowerLows) return "lower_highs_lower_lows";
  if (higherHighs && lowerLows) return "expanding";
  if (lowerHighs && higherLows) return "contracting";
  return "range";
}

function calculateTrendScore(alignment: string, structure: string, htfBias: string): number {
  let score = 50;

  const alignmentScores: Record<string, number> = {
    strong_bullish: 20, bullish: 14, weak_bullish: 7,
    mixed: 0,
    weak_bearish: -7, bearish: -14, strong_bearish: -20,
  };
  score += alignmentScores[alignment] || 0;

  const structureScores: Record<string, number> = {
    higher_highs_higher_lows: 17,
    lower_highs_lower_lows: -17,
    expanding: 0, contracting: 0, range: 0,
  };
  score += structureScores[structure] || 0;

  if (htfBias === "BULLISH") score += 13;
  else if (htfBias === "BEARISH") score -= 13;

  return Math.max(0, Math.min(100, score));
}
