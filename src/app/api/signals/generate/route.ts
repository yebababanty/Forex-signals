import { NextRequest, NextResponse } from "next/server";
import { fetchMultiTF, getHigherTF } from "@/lib/market-data";
import { runAnalysis, generateSignal } from "@/lib/engine/signal-generator";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { pair, timeframe = "4h" } = await req.json();

    if (!pair) {
      return NextResponse.json(
        { error: "pair is required (e.g. EUR/USD)" },
        { status: 400 }
      );
    }

    const candles = await fetchMultiTF(pair, timeframe);
    const higherTF = getHigherTF(timeframe);

    const primaryCandles = candles[timeframe];
    const htfCandles = candles[higherTF];

    if (!primaryCandles || primaryCandles.length < 200) {
      return NextResponse.json(
        { error: "Insufficient candle data" },
        { status: 400 }
      );
    }

    const analysis = runAnalysis(
      pair.replace("/", ""),
      primaryCandles,
      htfCandles || [],
      timeframe
    );

    const signal = generateSignal(analysis);

    if (!signal) {
      return NextResponse.json({
        message: "No trade setup found — strategy criteria not fully met",
        analysis: {
          trend: analysis.trend,
          srZones: analysis.srZones.slice(0, 5),
          priceAction: analysis.priceAction,
          indicators: analysis.indicators,
          currentPrice: analysis.currentPrice,
        },
        missingCriteria: getMissingCriteria(analysis),
      });
    }

    const saved = await db.signal.create({
      data: {
        pair: signal.pair,
        direction: signal.direction,
        bias: signal.bias,
        timeframe: signal.timeframe,
        confidence: signal.confidence,
        entryPrice: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit1: signal.takeProfit1,
        takeProfit2: signal.takeProfit2,
        takeProfit3: signal.takeProfit3,
        riskPips: signal.riskPips,
        rewardPips: signal.rewardPips,
        riskRewardRatio: signal.riskRewardRatio,
        biasReasoning: signal.biasReasoning as any,
        analysis: {
          trend: signal.analysis.trend,
          srZones: signal.analysis.srZones,
          priceAction: signal.analysis.priceAction,
          indicators: signal.analysis.indicators,
        } as any,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ signal: saved });
  } catch (error: any) {
    console.error("Signal generation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

function getMissingCriteria(analysis: any): string[] {
  const missing: string[] = [];

  if (analysis.trend.direction === "NEUTRAL" || analysis.trend.strength < 30) {
    missing.push(`Trend is ${analysis.trend.direction} with only ${analysis.trend.strength}% strength — need clear directional bias`);
  }

  if (analysis.priceAction.length === 0) {
    missing.push("No price action confirmation patterns detected at current levels");
  } else {
    const aligned = analysis.priceAction.filter(
      (pa: any) => pa.direction === analysis.trend.direction
    );
    if (aligned.length === 0) {
      missing.push(`Price action patterns detected but they oppose the trend direction (${analysis.trend.direction})`);
    }
  }

  const patternsAtLevel = analysis.priceAction.filter((pa: any) => pa.atKeyLevel);
  if (patternsAtLevel.length === 0) {
    missing.push("No price action at key support/resistance levels");
  }

  if (analysis.trend.higherTFBias !== "NEUTRAL" && analysis.trend.higherTFBias !== analysis.trend.direction) {
    missing.push(`Higher timeframe bias (${analysis.trend.higherTFBias}) opposes current timeframe trend (${analysis.trend.direction})`);
  }

  return missing;
}
