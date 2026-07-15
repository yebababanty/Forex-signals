import { OHLCV, PriceActionSignal, SRZone } from "../types";

export function detectPriceAction(
  candles: OHLCV[],
  srZones: SRZone[]
): PriceActionSignal[] {
  const signals: PriceActionSignal[] = [];
  const recent = candles.slice(-10);

  for (let i = 1; i < recent.length; i++) {
    const current = recent[i];
    const prev = recent[i - 1];

    const nearLevel = findNearLevel(current, srZones);

    const rejectionResult = detectRejectionWick(current, nearLevel);
    if (rejectionResult) signals.push(rejectionResult);

    const engulfingResult = detectEngulfing(current, prev, nearLevel);
    if (engulfingResult) signals.push(engulfingResult);
  }

  return signals;
}

function detectRejectionWick(
  candle: OHLCV,
  nearLevel: { zone: SRZone; distance: number } | null
): PriceActionSignal | null {
  const body = Math.abs(candle.close - candle.open);
  const totalRange = candle.high - candle.low;

  if (totalRange === 0) return null;

  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const bodyRatio = body / totalRange;
  const atKeyLevel = nearLevel !== null && nearLevel.distance < totalRange * 2;

  if (lowerWick > body * 2 && upperWick < body * 0.5 && bodyRatio < 0.35) {
    const isAtSupport = atKeyLevel && nearLevel!.zone.type === "support";
    return {
      pattern: "Bullish Rejection Wick (Hammer)",
      direction: "BULLISH",
      reliability: isAtSupport ? 78 : 55,
      description: isAtSupport
        ? `Hammer candle with long lower wick rejecting ${nearLevel!.zone.type} at ${nearLevel!.zone.price}. Wick is ${(lowerWick / body).toFixed(1)}x the body, strong buying pressure.`
        : `Hammer candle detected but not at a key support level.`,
      candle,
      atKeyLevel: isAtSupport,
      nearestLevel: nearLevel?.zone,
    };
  }

  if (upperWick > body * 2 && lowerWick < body * 0.5 && bodyRatio < 0.35) {
    const isAtResistance = atKeyLevel && nearLevel!.zone.type === "resistance";
    return {
      pattern: "Bearish Rejection Wick (Shooting Star)",
      direction: "BEARISH",
      reliability: isAtResistance ? 78 : 55,
      description: isAtResistance
        ? `Shooting star with long upper wick rejecting ${nearLevel!.zone.type} at ${nearLevel!.zone.price}. Wick is ${(upperWick / body).toFixed(1)}x the body, strong selling pressure.`
        : `Shooting star detected but not at a key resistance level.`,
      candle,
      atKeyLevel: isAtResistance,
      nearestLevel: nearLevel?.zone,
    };
  }

  return null;
}

function detectEngulfing(
  current: OHLCV,
  prev: OHLCV,
  nearLevel: { zone: SRZone; distance: number } | null
): PriceActionSignal | null {
  const prevBody = Math.abs(prev.close - prev.open);
  const currBody = Math.abs(current.close - current.open);

  if (prevBody === 0 || currBody === 0) return null;

  const prevBearish = prev.close < prev.open;
  const prevBullish = prev.close > prev.open;
  const currBearish = current.close < current.open;
  const currBullish = current.close > current.open;

  const totalRange = current.high - current.low;
  const atKeyLevel = nearLevel !== null && nearLevel.distance < totalRange * 2;

  if (prevBearish && currBullish && current.close > prev.open && current.open < prev.close && currBody > prevBody * 1.2) {
    const isAtSupport = atKeyLevel && nearLevel!.zone.type === "support";
    return {
      pattern: "Bullish Engulfing",
      direction: "BULLISH",
      reliability: isAtSupport ? 82 : 60,
      description: isAtSupport
        ? `Bullish engulfing at ${nearLevel!.zone.type} ${nearLevel!.zone.price} (tested ${nearLevel!.zone.touches}x). Bullish candle engulfs previous bearish candle.`
        : `Bullish engulfing pattern detected. Candle body is ${(currBody / prevBody).toFixed(1)}x larger than previous.`,
      candle: current,
      atKeyLevel: isAtSupport,
      nearestLevel: nearLevel?.zone,
    };
  }

  if (prevBullish && currBearish && current.close < prev.open && current.open > prev.close && currBody > prevBody * 1.2) {
    const isAtResistance = atKeyLevel && nearLevel!.zone.type === "resistance";
    return {
      pattern: "Bearish Engulfing",
      direction: "BEARISH",
      reliability: isAtResistance ? 82 : 60,
      description: isAtResistance
        ? `Bearish engulfing at ${nearLevel!.zone.type} ${nearLevel!.zone.price} (tested ${nearLevel!.zone.touches}x). Bearish candle engulfs previous bullish candle.`
        : `Bearish engulfing pattern detected. Candle body is ${(currBody / prevBody).toFixed(1)}x larger than previous.`,
      candle: current,
      atKeyLevel: isAtResistance,
      nearestLevel: nearLevel?.zone,
    };
  }

  return null;
}

function findNearLevel(
  candle: OHLCV,
  srZones: SRZone[]
): { zone: SRZone; distance: number } | null {
  if (srZones.length === 0) return null;

  let nearest: SRZone | null = null;
  let minDist = Infinity;

  for (const zone of srZones) {
    const distFromLow = Math.abs(candle.low - zone.price);
    const distFromHigh = Math.abs(candle.high - zone.price);
    const dist = Math.min(distFromLow, distFromHigh);

    if (dist < minDist) {
      minDist = dist;
      nearest = zone;
    }
  }

  return nearest ? { zone: nearest, distance: minDist } : null;
}
