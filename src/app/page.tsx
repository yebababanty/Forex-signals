import Link from "next/link";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData() {
  try {
    const signals = await prisma.signal.findMany({
      orderBy: { createdAt: "desc" }, take: 50,
    });
    const active = signals.filter((s) => s.status === "active");
    const closed = signals.filter((s) => s.outcome && s.outcome !== "PENDING");
    const wins = closed.filter((s) => s.outcome === "WIN").length;
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    return { signals: active, total: signals.length, winRate, closedCount: closed.length, winsCount: wins };
  } catch (e) {
    console.error(e);
    return { signals: [], total: 0, winRate: 0, closedCount: 0, winsCount: 0 };
  }
}

const FOREX = ["EUR/USD", "GBP/USD", "USD/JPY", "GBP/JPY"];
const COMMODITIES = [
  { symbol: "XAU/USD", label: "Gold", emoji: "🥇" },
  { symbol: "XAG/USD", label: "Silver", emoji: "🥈" },
  { symbol: "USOIL", label: "Oil", emoji: "🛢️" },
];
const INDICES = [
  { symbol: "NAS100", label: "Nasdaq", emoji: "💻" },
  { symbol: "US30", label: "Dow Jones", emoji: "🏛️" },
];

export default async function Home() {
  const { signals, total, winRate, closedCount, winsCount } = await getData();

  function timeAgo(date: Date) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    const h = Math.floor(s / 3600);
    if (h < 1) return `${Math.max(1, Math.floor(s / 60))}m`;
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">📊 Dashboard</h1>

      {/* Win Rate Banner */}
      <Link href="/stats" className="block bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-lg p-4 border border-emerald-500/30 hover:border-emerald-400 transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-300 uppercase tracking-wider">Win Rate</p>
            <p className={`text-3xl font-bold mt-1 ${
              winRate >= 60 ? "text-emerald-400" : winRate >= 45 ? "text-yellow-400" : "text-red-400"
            }`}>{winRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">{winsCount}W / {closedCount} closed trades</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">View Full Stats →</p>
          </div>
        </div>
      </Link>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400">Active</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{signals.length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{total}</p>
        </div>
        <Link href="/scan" className="bg-slate-800 hover:bg-slate-700 rounded-lg p-4 transition">
          <p className="text-xs text-slate-400">Scan Now</p>
          <p className="text-yellow-400 font-semibold mt-1 text-sm">Run Scan →</p>
        </Link>
      </div>

      {/* Forex */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">💱 Forex Majors</h3>
        <div className="grid grid-cols-4 gap-2">
          {FOREX.map((pair) => (
            <Link key={pair} href={`/scan`} className="bg-slate-800 hover:bg-slate-700 rounded-lg p-3 text-center transition">
              <p className="font-bold text-sm">{pair}</p>
              <p className="text-xs text-slate-400 mt-1">Analyze →</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Commodities */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">🥇 Commodities</h3>
        <div className="grid grid-cols-3 gap-2">
          {COMMODITIES.map((c) => (
            <Link key={c.symbol} href={`/scan`} className="bg-slate-800 hover:bg-slate-700 rounded-lg p-3 text-center transition">
              <p className="text-lg">{c.emoji}</p>
              <p className="font-bold text-sm">{c.label}</p>
              <p className="text-xs text-slate-500 mt-1">{c.symbol}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Indices */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">📈 Indices</h3>
        <div className="grid grid-cols-2 gap-2">
          {INDICES.map((idx) => (
            <Link key={idx.symbol} href={`/scan`} className="bg-slate-800 hover:bg-slate-700 rounded-lg p-3 text-center transition">
              <p className="text-lg">{idx.emoji}</p>
              <p className="font-bold text-sm">{idx.label}</p>
              <p className="text-xs text-slate-500 mt-1">{idx.symbol}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Active Signals */}
      <div>
        <h2 className="text-lg font-bold mb-3">Active Signals</h2>
        {signals.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <p className="text-slate-400">No active signals.</p>
            <Link href="/scan" className="inline-block mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition">
              🚀 Run Scan
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {signals.map((signal) => (
              <Link key={signal.id} href={`/signals/${signal.id}`}
                className="block bg-slate-800 hover:bg-slate-700 rounded-lg p-3 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{signal.pair}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      signal.direction === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>{signal.direction === "BUY" ? "▲" : "▼"} {signal.direction}</span>
                    <span className="text-xs text-slate-500">{timeAgo(signal.createdAt)}</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">{signal.confidence}%</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
