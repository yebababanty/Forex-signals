import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getSignals() {
  try {
    const signals = await prisma.signal.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return signals;
  } catch (error) {
    console.error("Error fetching signals:", error);
    return [];
  }
}

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "GBP/JPY"];

export default async function Home() {
  const signals = await getSignals();
  const activeCount = signals.length;

  function timeAgo(date: Date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    const hours = Math.floor(seconds / 3600);
    if (hours < 1) return `${Math.floor(seconds / 60)}m`;
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <Link href="/" className="text-emerald-400 font-bold text-lg">
          📈 ForexSignals
        </Link>
        <div className="flex gap-4 text-sm text-slate-400">
          <Link href="/" className="text-white">Dashboard</Link>
          <Link href="/signals" className="hover:text-white">Signals</Link>
          <Link href="/analysis" className="hover:text-white">Analysis</Link>
          <Link href="/scan" className="hover:text-white">🔄 Scan</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">Active Signals</p>
            <p className="text-3xl font-bold text-blue-400 mt-1">{activeCount}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">Total Signals</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">Analyze Pair</p>
            <Link href="/analysis" className="text-yellow-400 font-semibold mt-1 inline-block text-sm">
              Run Analysis →
            </Link>
          </div>
        </div>

        {/* Pair Analysis Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {PAIRS.map((pair) => (
            <Link
              key={pair}
              href={`/analysis?pair=${encodeURIComponent(pair)}`}
              className="bg-slate-800 hover:bg-slate-700 rounded-lg p-3 text-center transition"
            >
              <p className="font-bold text-sm">{pair}</p>
              <p className="text-xs text-slate-400 mt-1">Analyze →</p>
            </Link>
          ))}
        </div>

        {/* Active Signals */}
        <div>
          <h2 className="text-lg font-bold mb-3">Active Signals</h2>
          {signals.length === 0 ? (
            <div className="bg-slate-800 rounded-lg p-6 text-center">
              <p className="text-slate-400">No active signals yet.</p>
              <Link
                href="/scan"
                className="inline-block mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                🚀 Run First Scan
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {signals.map((signal) => (
                <Link
                  key={signal.id}
                  href={`/signals/${signal.id}`}
                  className="block bg-slate-800 hover:bg-slate-700 rounded-lg p-3 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{signal.pair}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        signal.direction === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {signal.direction === "BUY" ? "▲" : "▼"} {signal.direction}
                      </span>
                      <span className="text-xs text-slate-500">
                        {timeAgo(signal.createdAt)}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-semibold">
                      {signal.confidence}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
