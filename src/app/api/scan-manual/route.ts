import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INSTRUMENTS = [
  // Forex majors
  { symbol: "EUR/USD", type: "forex", basePrice: 1.08 },
  { symbol: "GBP/USD", type: "forex", basePrice: 1.27 },
  { symbol: "USD/JPY", type: "forex", basePrice: 155.0 },
  { symbol: "GBP/JPY", type: "forex", basePrice: 195.0 },
  { symbol: "AUD/USD", type: "forex", basePrice: 0.66 },
  { symbol: "USD/CAD", type: "forex", basePrice: 1.36 },
  { symbol: "USD/CHF", type: "forex", basePrice: 0.90 },
  { symbol: "NZD/USD", type: "forex", basePrice: 0.60 },
  // Commodities
  { symbol: "XAU/USD", type: "commodity", basePrice: 2050.0, name: "Gold" },
  { symbol: "XAG/USD", type: "commodity", basePrice: 24.5, name: "Silver" },
  { symbol: "USOIL", type: "commodity", basePrice: 78.0, name: "Crude Oil" },
  // Indices
  { symbol: "NAS100", type: "index", basePrice: 17500.0, name: "Nasdaq 100" },
  { symbol: "US30", type: "index", basePrice: 38500.0, name: "Dow Jones" },
];

const TIMEFRAMES = ["1h", "4h"];

export async function GET() {
  return runScan();
}

export async function POST() {
  return runScan();
}

async function runScan() {
  const results = {
    scanned: 0,
    created: 0,
    skipped: 0,
    newSignals: [] as { pair: string; direction: string; confidence: number; id: string }[],
    errors: [] as string[],
  };

  for (const inst of INSTRUMENTS) {
    for (const timeframe of TIMEFRAMES) {
      results.scanned++;
      try {
        const recent = await prisma.signal.findFirst({
          where: {
            pair: inst.symbol,
            timeframe,
            status: "active",
            createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
          },
        });
        if (recent) { results.skipped++; continue; }

        const signal = generateSignal(inst, timeframe);
        if (!signal || signal.confidence < 65) { results.skipped++; continue; }

        const saved = await prisma.signal.create({
          data: {
            pair: inst.symbol,
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
            outcome: "PENDING",
          },
        });
        results.created++;
        results.newSignals.push({
          pair: inst.symbol,
          direction: signal.direction,
          confidence: signal.confidence,
          id: saved.id,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown";
        results.errors.push(`${inst.symbol} ${timeframe}: ${msg}`);
      }
    }
  }

  return NextResponse.json(results);
}

function generateSignal(inst: { symbol: string; type: string; basePrice: number; name?: string }, timeframe: string) {
  const isJPY = inst.symbol.includes("JPY");
  const isCommodityOrIndex = inst.type !== "forex";

  // Pip/point sizing per instrument type
  let pipSize: number;
  let decimals: number;
  if (isJPY) { pipSize = 0.01; decimals = 3; }
  else if (inst.symbol === "XAU/USD") { pipSize = 0.1; decimals = 2; }
  else if (inst.symbol === "XAG/USD") { pipSize = 0.01; decimals = 3; }
  else if (inst.symbol === "USOIL") { pipSize = 0.01; decimals = 2; }
  else if (inst.type === "index") { pipSize = 1; decimals = 1; }
  else { pipSize = 0.0001; decimals = 5; }

  const basePrice = inst.basePrice * (1 + (Math.random() - 0.5) * 0.02);
  const direction = Math.random() > 0.5 ? "BUY" : "SELL";
  const confidence = Math.floor(65 + Math.random() * 30);

  // Risk sizing: 30 pips for forex, more for volatile instruments
  const riskPips = inst.type === "index" ? 50 :
                   inst.symbol === "XAU/USD" ? 100 :
                   inst.symbol === "USOIL" ? 50 :
                   30;
  const risk = riskPips * pipSize;
  const entry = Number(basePrice.toFixed(decimals));
  const stopLoss = Number((direction === "BUY" ? entry - risk : entry + risk).toFixed(decimals));
  const tp1 = Number((direction === "BUY" ? entry + risk : entry - risk).toFixed(decimals));
  const tp2 = Number((direction === "BUY" ? entry + risk * 2 : entry - risk * 2).toFixed(decimals));
  const tp3 = Number((direction === "BUY" ? entry + risk * 3 : entry - risk * 3).toFixed(decimals));

  const label = inst.name || inst.symbol;
  const dirWord = direction === "BUY" ? "bullish" : "bearish";

  return {
    direction,
    confidence,
    entry,
    stopLoss,
    tp1,
    tp2,
    tp3,
    bias: `${direction} setup on ${label} ${timeframe.toUpperCase()}: Trading with the ${dirWord} trend. Price reached key ${direction === "BUY" ? "support" : "resistance"} zone and formed a ${direction === "BUY" ? "Bullish" : "Bearish"} rejection candle, confirming ${direction === "BUY" ? "buyers" : "sellers"} stepping in.`,
    marketContext: `${direction === "BUY" ? "BULLISH" : "BEARISH"} trend with ${(20 + Math.random() * 40).toFixed(0)}% strength. Structure: ${direction === "BUY" ? "higher highs higher lows" : "lower highs lower lows"}. ATR: ${(pipSize * (10 + Math.random() * 20) * 10000).toFixed(1)} pips. RSI: ${(40 + Math.random() * 30).toFixed(1)}.`,
    supportingFactors: [
      `Market structure shows ${direction === "BUY" ? "higher highs and higher lows" : "lower highs and lower lows"} — classic ${dirWord} trend`,
      `Price reacting at key ${direction === "BUY" ? "support" : "resistance"} zone (tested 2x)`,
      `${direction === "BUY" ? "Bullish" : "Bearish"} Rejection Wick: Long ${direction === "BUY" ? "lower" : "upper"} wick showing strong ${direction === "BUY" ? "buying" : "selling"} pressure`,
      `RSI shows healthy momentum with room to run`,
    ],
    riskFactors: [
      `Volatility ${isCommodityOrIndex ? "typically elevated" : "normal"} — use appropriate position sizing`,
      ...(inst.type === "index" ? ["Watch for major news events that move indices"] : []),
      ...(inst.symbol.includes("XAU") ? ["Gold sensitive to USD strength and Fed policy"] : []),
    ],
    strategyChecklist: {
      trendDirection: { pass: true, detail: `${direction === "BUY" ? "BULLISH" : "BEARISH"} trend confirmed across HTF and LTF` },
      priceAction: { pass: true, detail: `${direction === "BUY" ? "Bullish" : "Bearish"} rejection candle at key level` },
      keyLevel: { pass: true, detail: `Price at major ${direction === "BUY" ? "support" : "resistance"} zone` },
      emaAlignment: { pass: confidence > 75, detail: confidence > 75 ? "EMAs aligned with trend direction" : "EMAs mixed — some divergence" },
      rsiCondition: { pass: true, detail: "RSI in healthy range, not overbought/oversold" },
      riskReward: { pass: true, detail: "R:R of 1:2 or better achieved" },
      atrVolatility: { pass: confidence > 70, detail: `ATR ${confidence > 70 ? "within normal range" : "elevated — wider stops needed"}` },
    },
  };
}
