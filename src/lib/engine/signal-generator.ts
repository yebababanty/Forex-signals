import { OHLCV, AnalysisResult, TradeSetup } from "../types";
import { analyzeTrend } from "./trend";
import { detectSRZones, findNearestLevels } from "./support-resistance";
import { detectPriceAction } from "./price-action";
import { rsi, atr } from "./indicators";
import { buildBias } from "./bias-builder";
import { pipValue, toPips } from "../market-data";

export function runAnalysis(
  pair: string,
  primaryCandles: OHLCV[],
  higherTFCandles: OHLCV[],
  timeframe: string
): AnalysisResult {
  const closes = primaryCandles.map((c) => c.close);
  const highs = primaryCandles.map((c) => c.high);
  const lows = primaryCandles.map((c) => c.low);

  const trend = analyzeTrend(primaryCandles, higherTFCandles);
  const srZones = detectSRZones(primaryCandles, 5);
  const priceAction = detectPriceAction(primaryCandles, srZones);

  const rsiValues = rsi(closes, 14);
  const atrValues = atr(highs, lows, closes, 14);
  const currentRSI = rsiValues[rsiValues.length - 1];
  const currentATR = atrValues[atrValues.length - 1];

  return {
    pair,
    timeframe,
    trend,
    srZones,
    priceAction,
    currentPrice: closes[closes.length - 1],
    indicators: {
      rsi: parseFloat((currentRSI || 50).toFixed(2)),
      atr: parseFloat((currentATR || 0).toFixed(6)),
      atrPips: parseFloat(toPips(pair, currentATR || 0).toFixed(1)),
    },
  };
}

export function generateSignal(analysis: AnalysisResult): TradeSetup | null {
  const { pair, timeframe, trend, srZones, priceAction, currentPrice, indicators } = analysis;

  // GATE 1: Trend must be clear
  if (trend.direction === "NEUTRAL" || trend.strength < 30) return null;

  // GATE 2: Price action must align with trend
  const alignedPatterns = priceAction.filter((pa) => pa.direction === trend.direction);
  if (alignedPatterns.length === 0) return null;

  // GATE 3: Prefer patterns at key levels
  const confirmedAtLevel = alignedPatterns.filter((pa) => pa.atKeyLevel);
  const bestPattern =
    confirmedAtLevel.length > 0
      ? confirmedAtLevel.sort((a, b) => b.reliability - a.reliability)[0]
      : alignedPatterns.sort((a, b) => b.reliability - a.reliability)[0];

  const atKeyLevel = bestPattern.atKeyLevel;

  // GATE 4: Don't trade against higher timeframe
  const htfAligned = trend.higherTFBias === trend.direction || trend.higherTFBias === "NEUTRAL";
  if (trend.higherTFBias !== "NEUTRAL" && trend.higherTFBias !== trend.direction) return null;

  // Calculate confidence
  let confidence = 50;
  confidence += (trend.strength / 100) * 25;
  confidence += atKeyLevel ? 20 : 5;
  confidence += (bestPattern.reliability / 100) * 15;
  if (trend.higherTFBias === trend.direction) confidence += 10;
  if (trend.direction === "BULLISH" && indicators.rsi < 40) confidence += 5;
  if (trend.direction === "BEARISH" && indicators.rsi > 60) confidence += 5;
  if (trend.direction === "BULLISH" && indicators.rsi > 75) confidence -= 10;
  if (trend.direction === "BEARISH" && indicators.rsi < 25) confidence -= 10;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  if (confidence < 60) return null;

  const direction: "BUY" | "SELL" = trend.direction === "BULLISH" ? "BUY" : "SELL";
  const { nearestSupport, nearestResistance } = findNearestLevels(srZones, currentPrice);

  const pip = pipValue(pair);
  const levels = calculateLevels(direction, currentPrice, indicators.atr, nearestSupport, nearestResistance, pip);

  const displayPair = pair.length === 6 ? `${pair.slice(0, 3)}/${pair.slice(3)}` : pair;

  const biasReasoning = buildBias(trend, bestPattern, nearestSupport, nearestResistance, indicators, htfAligned, direction);

  return {
    pair,
    display: displayPair,
    direction,
    bias: trend.direction as "BULLISH" | "BEARISH",
    confidence,
    timeframe,
    ...levels,
    biasReasoning,
    analysis,
  };
}

function calculateLevels(
  direction: "BUY" | "SELL",
  price: number,
  atrVal: number,
  support: { price: number } | null,
  resistance: { price: number } | null,
  pip: number
) {
  let entry = price;
  let stopLoss: number;
  let tp1: number, tp2: number, tp3: number;

  if (direction === "BUY") {
    stopLoss = support
      ? Math.min(support.price - atrVal * 0.3, price - atrVal * 1.5)
      : price - atrVal * 1.5;

    const risk = entry - stopLoss;
    tp1 = entry + risk * 1.0;
    tp2 = entry + risk * 2.0;
    tp3 = entry + risk * 3.0;

    if (resistance && resistance.price < tp1) {
      tp1 = resistance.price;
      tp2 = resistance.price + risk;
      tp3 = resistance.price + risk * 2;
    }
  } else {
    stopLoss = resistance
      ? Math.max(resistance.price + atrVal * 0.3, price + atrVal * 1.5)
      : price + atrVal * 1.5;

    const risk = stopLoss - entry;
    tp1 = entry - risk * 1.0;
    tp2 = entry - risk * 2.0;
    tp3 = entry - risk * 3.0;

    if (support && support.price > tp1) {
      tp1 = support.price;
      tp2 = support.price - risk;
      tp3 = support.price - risk * 2;
    }
  }

  const riskPips = Math.abs(entry - stopLoss) / pip;
  const rewardPips = Math.abs(tp2 - entry) / pip;
  const decimals = pip < 0.001 ? 5 : 3;

  return {
    entry: parseFloat(entry.toFixed(decimals)),
    stopLoss: parseFloat(stopLoss.toFixed(decimals)),
    takeProfit1: parseFloat(tp1.toFixed(decimals)),
    takeProfit2: parseFloat(tp2.toFixed(decimals)),
    takeProfit3: parseFloat(tp3.toFixed(decimals)),
    riskPips: parseFloat(riskPips.toFixed(1)),
    rewardPips: parseFloat(rewardPips.toFixed(1)),
    riskRewardRatio: parseFloat((rewardPips / riskPips).toFixed(2)),
  };
}
