import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/market-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair: pairCode } = await params;
  const searchParams = req.nextUrl.searchParams;
  const timeframe = searchParams.get("timeframe") || "4h";
  const count = parseInt(searchParams.get("count") || "150");

  const displayPair = `${pairCode.slice(0, 3)}/${pairCode.slice(3)}`;

  try {
    const candles = await fetchCandles(displayPair, timeframe, count);

    // Format for lightweight-charts
    const formatted = candles.map((c) => ({
      time: Math.floor(new Date(c.time).getTime() / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    return NextResponse.json({ candles: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
