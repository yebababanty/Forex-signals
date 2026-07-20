"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  total: number; pending: number; closed: number;
  wins: number; losses: number; breakevens: number;
  winRate: number; totalPips: number; avgPipsPerTrade: number;
  byPair: Record<string, { total: number; wins: number; losses: number; winRate: number }>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((d) => { setStats(d); setLoading(false); });
  }, []);

  if (loading || !stats) return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <Link href="/" className="text-emerald-400 font-bold text-lg">📈 ForexSignals</Link>
        <div className="flex gap-4 text-sm text-slate-400">
          <Link href="/" className="hover:text-white">Dashboard</Link>
          <Link href="/stats" className="text-white">📊 Stats</Link>
          <Link href="/scan" className="hover:text-white">🔄 Scan</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">📊 Performance Stats</h1>

        {/* Win Rate Hero */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-lg p-6 border border-emerald-500/30 text-center">
          <p className="text-sm text-slate-300 uppercase tracking-wider">Overall Win Rate</p>
          <p className={`text-6xl font-bold my-3 ${
            stats.winRate >= 60 ? "text-emerald-400" :
            stats.winRate >= 45 ? "text-yellow-400" : "text-red-400"
          }`}>{stats.winRate}%</p>
          <p className="text-sm text-slate-400">
            {stats.wins} wins / {stats.closed} closed trades
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">Total Signals</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.total}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">Wins ✅</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.wins}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">Losses ❌</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.losses}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">Total Pips</p>
            <p className={`text-2xl font-bold mt-1 ${stats.totalPips >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {stats.totalPips > 0 ? "+" : ""}{stats.totalPips}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">Avg per Trade</p>
            <p className={`text-2xl font-bold mt-1 ${stats.avgPipsPerTrade >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {stats.avgPipsPerTrade > 0 ? "+" : ""}{stats.avgPipsPerTrade}p
            </p>
          </div>
        </div>

        {/* By Pair */}
        {Object.keys(stats.byPair).length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">Win Rate by Pair</h3>
            <div className="space-y-3">
              {Object.entries(stats.byPair).sort((a, b) => b[1].winRate - a[1].winRate).map(([pair, s]) => {
                const closedCount = s.wins + s.losses;
                return (
                  <div key={pair}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{pair}</span>
                      <span className="text-slate-400">
                        {s.wins}W / {s.losses}L
                        {closedCount > 0 && (
                          <span className={`ml-2 font-bold ${
                            s.winRate >= 60 ? "text-emerald-400" :
                            s.winRate >= 45 ? "text-yellow-400" : "text-red-400"
                          }`}>{s.winRate.toFixed(0)}%</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className={`h-2 rounded-full ${
                        s.winRate >= 60 ? "bg-emerald-400" :
                        s.winRate >= 45 ? "bg-yellow-400" : "bg-red-400"
                      }`} style={{ width: `${closedCount > 0 ? s.winRate : 0}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stats.closed === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-200">
            💡 No closed trades yet. Open any signal and mark it as WIN/LOSS to start tracking your win rate!
          </div>
        )}
      </div>
    </div>
  );
}
