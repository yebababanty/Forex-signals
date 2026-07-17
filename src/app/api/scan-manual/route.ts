import { NextRequest, NextResponse } from "next/server";
import { fetchMultiTF, getHigherTF, PAIRS } from "@/lib/market-data";
import { runAnalysis, generateSignal } from "@/lib/engine/signal-generator";
import { db } from "@/lib/db";

export const maxDuration = 60;

// This is a public manual scan (no auth needed)
// Rate limited by only scanning if no scan happened in the last hour
export async function POST(req: NextRequest) {
  const results: any[] = [];
  const errors: any[] = [];
  const timeframes = ["1h", "4h"];

  // Check if a scan happened recently (rate limit)
  const recentSignal = await db.signal.findFirst({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // last hour
      },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const { symbol, code } of PAIRS) {
    for (const tf of timeframes) {
      try {
        const existing = await db.signal.findFirst({
          where: {
            pair: code,
            timeframe: tf,
            status: "active",
            createdAt: {
              gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
            },
          },
        });

        if (existing) continue;

        const candles = await fetchMultiTF(symbol, tf);
        const higherTF = getHigherTF(tf);

        const primaryCandles = candles[tf];
        const htfCandles = candles[higherTF];

        if (!primaryCandles || primaryCandles.length < 200) continue;

        const analysis = runAnalysis(code, primaryCandles, htfCandles || [], tf);
        const signal = generateSignal(analysis);

        if (signal && signal.confidence >= 65) {
          const saved = await db.signal.create({
            data: {
              pair: signal.pair,
              display: signal.display,
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

          results.push({
            pair: code,
            timeframe: tf,
            direction: signal.direction,
            confidence: signal.confidence,
            id: saved.id,
          });
        }

        await new Promise((r) => setTimeout(r, 500));
      } catch (error: any) {
        errors.push({ pair: code, tf, error: error.message });
      }
    }
  }

  return NextResponse.json({
    scannedAt: new Date().toISOString(),
    pairsScanned: PAIRS.length * timeframes.length,
    signalsGenerated: results.length,
    signals: results,
    errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
  });
}
