import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getLivePrice, getInstrumentSpec } from "../../../lib/prices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() { return runCheck(); }
export async function POST() { return runCheck(); }

async function runCheck() {
  const results = {
    checked: 0,
    updated: 0,
    wins: 0,
    losses: 0,
    stillPending: 0,
    details: [] as Array<{ pair: string; id: string; outcome: string; livePrice: number; entry: number }>,
  };

  try {
    // Get all pending signals
    const pending = await prisma.signal.findMany({
      where: {
        OR: [{ outcome: "PENDING" }, { outcome: null }],
        status: "active",
      },
    });

    // Group by pair to minimize API calls
    const pairs = [...new Set(pending.map((s) => s.pair))];
    const priceMap: Record<string, number> = {};
    for (const pair of pairs) {
      priceMap[pair] = await getLivePrice(pair);
    }

    for (const signal of pending) {
      results.checked++;
      const livePrice = priceMap[signal.pair];
      const spec = getInstrumentSpec(signal.pair);
      const isBuy = signal.direction === "BUY";

      let outcome: string | null = null;
      let pipsGained = 0;

      // Check if SL or any TP was hit
      // Since we only have current price (not historical high/low), we approximate:
      // - Check if price crossed SL (loss) or TP2 (main target)
      if (isBuy) {
        if (livePrice <= signal.stopLoss) {
          outcome = "LOSS";
          pipsGained = -Math.abs(signal.entry - signal.stopLoss) / spec.pipSize;
        } else if (livePrice >= signal.tp3) {
          outcome = "WIN";
          pipsGained = Math.abs(signal.tp3 - signal.entry) / spec.pipSize;
        } else if (livePrice >= signal.tp2) {
          outcome = "WIN";
          pipsGained = Math.abs(signal.tp2 - signal.entry) / spec.pipSize;
        } else if (livePrice >= signal.tp1) {
          outcome = "WIN";
          pipsGained = Math.abs(signal.tp1 - signal.entry) / spec.pipSize;
        }
      } else {
        // SELL
        if (livePrice >= signal.stopLoss) {
          outcome = "LOSS";
          pipsGained = -Math.abs(signal.entry - signal.stopLoss) / spec.pipSize;
        } else if (livePrice <= signal.tp3) {
          outcome = "WIN";
          pipsGained = Math.abs(signal.entry - signal.tp3) / spec.pipSize;
        } else if (livePrice <= signal.tp2) {
          outcome = "WIN";
          pipsGained = Math.abs(signal.entry - signal.tp2) / spec.pipSize;
        } else if (livePrice <= signal.tp1) {
          outcome = "WIN";
          pipsGained = Math.abs(signal.entry - signal.tp1) / spec.pipSize;
        }
      }

      if (outcome) {
        await prisma.signal.update({
          where: { id: signal.id },
          data: {
            outcome,
            pipsGained: Number(pipsGained.toFixed(1)),
            outcomeHitAt: new Date(),
            status: "closed",
          },
        });
        results.updated++;
        if (outcome === "WIN") results.wins++;
        else results.losses++;
        results.details.push({
          pair: signal.pair,
          id: signal.id,
          outcome,
          livePrice: Number(livePrice.toFixed(spec.decimals)),
          entry: signal.entry,
        });
      } else {
        results.stillPending++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed", ...results },
      { status: 500 }
    );
  }
}
