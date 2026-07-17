import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pair, timeframe = "4h" } = body;

    if (!pair) {
      return NextResponse.json({ error: "pair is required" }, { status: 400 });
    }

    const signal = generateMockSignal(pair, timeframe);

    const saved = await prisma.signal.create({
      data: {
        pair,
        direction: signal.direction,
        timeframe,
        confidence: signal.confidence,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        tp1: signal.tp1,
        tp2: signal.tp2,
        tp3: signal.tp3,
        riskReward: "1:2",
        bias: signal.bias,
        marketContext: signal.marketContext,
        supportingFactors: signal.supportingFactors,
        riskFactors: signal.riskFactors,
        strategyChecklist: signal.strategyChecklist,
        status: "active",
      },
    });

    return NextResponse.json(saved);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function generateMockSignal(pair: string, timeframe: string) {
  const isJPY = pair.includes("JPY");
  const basePrice = isJPY ? 150 + Math.random() * 5 : 1.05 + Math.random() * 0.15;
  const pipMultiplier = isJPY ? 0.01 : 0.0001;
  const direction = Math.random() > 0.5 ? "BUY" : "SELL";
  const confidence = Math.floor(65 + Math.random() * 30);
  const risk = 30 * pipMultiplier;
  const entry = basePrice;
  const stopLoss = direction === "BUY" ? entry - risk : entry + risk;
  const tp1 = direction === "BUY" ? entry + risk : entry - risk;
  const tp2 = direction === "BUY" ? entry + risk * 2 : entry - risk * 2;
  const tp3 = direction === "BUY" ? entry + risk * 3 : entry - risk * 3;

  return {
    direction,
    confidence,
    entry: Number(entry.toFixed(5)),
    stopLoss: Number(stopLoss.toFixed(5)),
    tp1: Number(tp1.toFixed(5)),
    tp2: Number(tp2.toFixed(5)),
    tp3: Number(tp3.toFixed(5)),
    bias: `${direction} setup on ${pair} ${timeframe}: Trading with the ${direction === "BUY" ? "bullish" : "bearish"} trend across multiple timeframes.`,
    marketContext: `${direction === "BUY" ? "BULLISH" : "BEARISH"} trend detected. ATR normal. RSI in healthy range.`,
    supportingFactors: [
      "Market structure aligns with trade direction",
      "Price reacting at key level",
      "RSI shows healthy momentum",
    ],
    riskFactors: ["Volatility elevated — wider stops needed"],
    strategyChecklist: {
      trendDirection: { pass: true, detail: `${direction === "BUY" ? "BULLISH" : "BEARISH"} trend confirmed` },
      priceAction: { pass: true, detail: "Rejection candle at key level" },
      keyLevel: { pass: true, detail: "Price at major S/R zone" },
      emaAlignment: { pass: confidence > 75, detail: "EMAs aligned with trend" },
      rsiCondition: { pass: true, detail: "RSI in healthy range" },
      riskReward: { pass: true, detail: "R:R of 1:2 or better" },
      atrVolatility: { pass: confidence > 70, detail: "ATR within normal range" },
    },
  };
}
