import { NextRequest, NextResponse } from "next/server";
import { fetchMultiTF, getHigherTF, PAIRS } from "@/lib/market-data";
import { runAnalysis, generateSignal } from "@/lib/engine/signal-generator";
import { db } from "@/lib/db";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: any[] = [];
  const errors: any[] = [];
  const timeframes = ["1h", "4h"];

  for (const { symbol, code } of PAIRS) {
    for (const tf of timeframes) {
      try {
        // Skip if we already have a recent signal for this pair/tf
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

        if (existing) {
          continue;
        }

        const candles = await fetchMultiTF(symbol, tf);
        const higherTF = getHigherTF(tf);

        const primaryCandles = candles[tf];
        const htfCandles = candles[higherTF];

        if (!primaryCandles || primaryCandles.length < 200) {
          continue;
        }

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

        // Small delay to avoid rate limits
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
    errors: errors.length > 0 ? errors : undefined,
  });
}
