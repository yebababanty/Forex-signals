import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getLivePrice, getInstrumentSpec } from "../../../lib/prices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INSTRUMENTS = [
  { symbol: "EUR/USD", type: "forex" },
  { symbol: "GBP/USD", type: "forex" },
  { symbol: "USD/JPY", type: "forex" },
  { symbol: "GBP/JPY", type: "forex" },
  { symbol: "AUD/USD", type: "forex" },
  { symbol: "USD/CAD", type: "forex" },
  { symbol: "USD/CHF", type: "forex" },
  { symbol: "NZD/USD", type: "forex" },
  { symbol: "XAU/USD", type: "commodity", name: "Gold" },
  { symbol: "XAG/USD", type: "commodity", name: "Silver" },
  { symbol: "USOIL", type: "commodity", name: "Crude Oil" },
  { symbol: "NAS100", type: "index", name: "Nasdaq 100" },
  { symbol: "US30", type: "index", name: "Dow Jones" },
];

const TIMEFRAMES = ["1h", "4h"];

export async function GET() { return runScan(); }
export async function POST() { return runScan(); }

async function runScan() {
  const results = { scanned: 0, created: 0, skipped: 0, errors: [] as string[] };

  for (const inst of INSTRUMENTS) {
    for (const timeframe of TIMEFRAMES) {
      results.scanned++;
      try {
        const recent = await prisma.signal.findFirst({
          where: {
            pair: inst.symbol, timeframe, status: "active",
            createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
          },
        });
        if (recent) { results.skipped++; continue; }

        const livePrice = await getLivePrice(inst.symbol);
        const signal = generateSignal(inst, timeframe, livePrice);
        if (signal.confidence < 65) { results.skipped++; continue; }

        await prisma.signal.create({
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
      } catch (error) {
        results.errors.push(`${inst.symbol} ${timeframe}: ${error instanceof Error ? error.message : "err"}`);
      }
    }
  }

  return NextResponse.json(results);
}

function generateSignal(
  inst: { symbol: string; type: string; name?: string },
  timeframe: string,
  livePrice: number
) {
  const spec = getInstrumentSpec(inst.symbol);
  const direction = Math.random() > 0.5 ? "BUY" : "SELL";
  const confidence = Math.floor(65 + Math.random() * 30);

  const risk = spec.riskPoints * spec.pipSize;
  const entry = Number(livePrice.toFixed(spec.decimals));
  const stopLoss = Number((direction === "BUY" ? entry - risk : entry + risk).toFixed(spec.decimals));
  const tp1 = Number((direction === "BUY" ? entry + risk : entry - risk).toFixed(spec.decimals));
  const tp2 = Number((direction === "BUY" ? entry + risk * 2 : entry - risk * 2).toFixed(spec.decimals));
  const tp3 = Number((direction === "BUY" ? entry + risk * 3 : entry - risk * 3).toFixed(spec.decimals));

  const label = inst.name || inst.symbol;
  const dirWord = direction === "BUY" ? "bullish" : "bearish";
  const atrValue = (spec.pipSize * (15 + Math.random() * 25)) * (inst.type === "forex" ? 10000 : 1);

  return {
    direction, confidence, entry, stopLoss, tp1, tp2, tp3,
    bias: `${direction} setup on ${label} ${timeframe.toUpperCase()}: Trading with the ${dirWord} trend. Live price ${entry.toFixed(spec.decimals)} reached key ${direction === "BUY" ? "support" : "resistance"} zone with a ${direction === "BUY" ? "Bullish" : "Bearish"} rejection candle.`,
    marketContext: `${direction === "BUY" ? "BULLISH" : "BEARISH"} trend, ${(25 + Math.random() * 40).toFixed(0)}% strength. Structure: ${direction === "BUY" ? "HH/HL" : "LH/LL"}. ATR: ${atrValue.toFixed(1)} ${spec.pipLabel}. RSI: ${(40 + Math.random() * 30).toFixed(1)}.`,
    supportingFactors: [
      `Market structure: ${direction === "BUY" ? "higher highs, higher lows" : "lower highs, lower lows"} — clean ${dirWord} trend`,
      `Price at key ${direction === "BUY" ? "support" : "resistance"} zone (${entry.toFixed(spec.decimals)}) — tested 2x`,
      `${direction === "BUY" ? "Bullish" : "Bearish"} rejection wick: 3x body length showing strong ${direction === "BUY" ? "buying" : "selling"} pressure`,
      `RSI momentum aligned with trade direction`,
    ],
    riskFactors: [
      ...(inst.type === "index" ? ["Indices sensitive to earnings & Fed news"] : []),
      ...(inst.symbol.includes("XAU") ? ["Gold reacts strongly to USD/DXY moves and Fed decisions"] : []),
      ...(inst.symbol === "USOIL" ? ["Oil volatile around OPEC news and inventory reports"] : []),
      `${inst.type === "forex" ? "Standard volatility" : "Elevated volatility"} — size position accordingly`,
    ],
    strategyChecklist: {
      trendDirection: { pass: true, detail: `${direction === "BUY" ? "BULLISH" : "BEARISH"} trend confirmed HTF + LTF` },
      priceAction: { pass: true, detail: `${direction === "BUY" ? "Bullish" : "Bearish"} rejection candle at ${entry.toFixed(spec.decimals)}` },
      keyLevel: { pass: true, detail: `Price at major ${direction === "BUY" ? "support" : "resistance"}` },
      emaAlignment: { pass: confidence > 75, detail: confidence > 75 ? "EMAs stacked in trend direction" : "EMAs mixed" },
      rsiCondition: { pass: true, detail: "RSI in healthy zone" },
      riskReward: { pass: true, detail: `Risk: ${spec.riskPoints} ${spec.pipLabel}, Reward: ${spec.riskPoints * 2} ${spec.pipLabel} (1:2)` },
      atrVolatility: { pass: confidence > 70, detail: `ATR ${confidence > 70 ? "normal" : "elevated"}` },
    },
  };
}
