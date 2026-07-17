import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const signals = await db.signal.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const total = await db.signal.count();
  const active = await db.signal.count({ where: { status: "active" } });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">📊 Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-slate-400">Active Signals</div>
          <div className="text-3xl font-bold text-blue-400 mt-1">{active}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-400">Total Signals</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">{total}</div>
        </div>
        <div className="card col-span-2 md:col-span-1">
          <div className="text-sm text-slate-400">Analyze Pair</div>
          <Link href="/analysis/EURUSD" className="text-lg font-bold text-yellow-400 mt-1 block hover:text-yellow-300">
            Run Analysis →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["EURUSD", "GBPUSD", "USDJPY", "GBPJPY"].map((pair) => (
          <Link
            key={pair}
            href={`/analysis/${pair}`}
            className="card hover:bg-slate-700 transition-colors text-center"
          >
            <div className="text-lg font-bold">{pair.slice(0, 3)}/{pair.slice(3)}</div>
            <div className="text-xs text-slate-400 mt-1">Analyze →</div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Active Signals</h2>
        {signals.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400 text-lg">No active signals yet</p>
            <p className="text-slate-500 text-sm mt-2">
              Run analysis on a pair to generate signals
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map((signal) => (
              <Link key={signal.id} href={`/signals/${signal.id}`} className="block">
                <div className="card hover:bg-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{signal.pair}</span>
                      <span className={`badge ${signal.direction === "BUY" ? "badge-buy" : "badge-sell"}`}>
                        {signal.direction === "BUY" ? "▲" : "▼"} {signal.direction}
                      </span>
                      <span className="text-xs text-slate-500">{signal.timeframe}</span>
                    </div>
                    <div className="text-sm text-slate-400">{signal.confidence}%</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
