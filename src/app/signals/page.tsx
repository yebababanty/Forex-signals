import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const signals = await db.signal.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">🎯 All Signals</h1>

      {signals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No signals yet</p>
          <Link href="/analysis/EURUSD" className="inline-block mt-4 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Run First Analysis →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <Link key={signal.id} href={`/signals/${signal.id}`} className="block">
              <div className="card hover:bg-slate-700 transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{signal.display}</span>
                    <span className={`badge ${signal.direction === "BUY" ? "badge-buy" : "badge-sell"}`}>
                      {signal.direction === "BUY" ? "▲" : "▼"} {signal.direction}
                    </span>
                    <span className="text-xs text-slate-500">{signal.timeframe}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`font-semibold ${signal.confidence >= 80 ? "text-emerald-400" : "text-yellow-400"}`}>
                      {signal.confidence}%
                    </span>
                    <span className="text-slate-400">RR 1:{signal.riskRewardRatio}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
