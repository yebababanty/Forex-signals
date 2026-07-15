import { OHLCV, SRZone } from "../types";

interface SwingPoint {
  index: number;
  price: number;
  type: "high" | "low";
}

export function detectSRZones(candles: OHLCV[], lookback = 5): SRZone[] {
  const swings = findSwingPoints(candles, lookback);
  const clustered = clusterLevels(swings, candles);
  const scored = scoreLevels(clustered, candles);

  return scored
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10);
}

function findSwingPoints(candles: OHLCV[], lookback: number): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const windowHighs = candles.slice(i - lookback, i + lookback + 1).map((c) => c.high);
    const windowLows = candles.slice(i - lookback, i + lookback + 1).map((c) => c.low);

    if (candles[i].high === Math.max(...windowHighs)) {
      swings.push({ index: i, price: candles[i].high, type: "high" });
    }
    if (candles[i].low === Math.min(...windowLows)) {
      swings.push({ index: i, price: candles[i].low, type: "low" });
    }
  }

  return swings;
}

function clusterLevels(swings: SwingPoint[], candles: OHLCV[]): SRZone[] {
  if (swings.length === 0) return [];

  const recentCandles = candles.slice(-50);
  const priceRange =
    Math.max(...recentCandles.map((c) => c.high)) -
    Math.min(...recentCandles.map((c) => c.low));
  const threshold = priceRange * 0.005;

  const sorted = [...swings].sort((a, b) => a.price - b.price);
  const clusters: SRZone[] = [];
  let currentCluster: SwingPoint[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].price - sorted[i - 1].price <= threshold) {
      currentCluster.push(sorted[i]);
    } else {
      clusters.push(buildZone(currentCluster));
      currentCluster = [sorted[i]];
    }
  }
  clusters.push(buildZone(currentCluster));

  return clusters;
}

function buildZone(cluster: SwingPoint[]): SRZone {
  const avgPrice = cluster.reduce((sum, s) => sum + s.price, 0) / cluster.length;
  const hasHighs = cluster.some((s) => s.type === "high");
  const hasLows = cluster.some((s) => s.type === "low");

  return {
    price: parseFloat(avgPrice.toFixed(5)),
    strength: cluster.length,
    type: hasHighs && !hasLows ? "resistance" : hasLows && !hasHighs ? "support" : "support",
    touches: cluster.length,
  };
}

function scoreLevels(zones: SRZone[], candles: OHLCV[]): SRZone[] {
  const currentPrice = candles[candles.length - 1].close;
  const priceRange =
    Math.max(...candles.slice(-50).map((c) => c.high)) -
    Math.min(...candles.slice(-50).map((c) => c.low));
  const threshold = priceRange * 0.003;

  return zones.map((zone) => {
    const type: "support" | "resistance" =
      zone.price < currentPrice ? "support" : "resistance";

    let touches = 0;
    for (const c of candles.slice(-100)) {
      if (
        Math.abs(c.low - zone.price) <= threshold ||
        Math.abs(c.high - zone.price) <= threshold
      ) {
        touches++;
      }
    }

    return {
      ...zone,
      type,
      touches,
      strength: touches + zone.strength,
    };
  });
}

export function findNearestLevels(
  zones: SRZone[],
  currentPrice: number
): { nearestSupport: SRZone | null; nearestResistance: SRZone | null } {
  const supports = zones
    .filter((z) => z.price < currentPrice)
    .sort((a, b) => b.price - a.price);

  const resistances = zones
    .filter((z) => z.price > currentPrice)
    .sort((a, b) => a.price - b.price);

  return {
    nearestSupport: supports[0] || null,
    nearestResistance: resistances[0] || null,
  };
}
