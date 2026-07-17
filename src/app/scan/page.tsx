"use client";

import { useState } from "react";
import Link from "next/link";

export default function ScanPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const runScan = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/scan-manual", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Scan failed");
        return;
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">🔄 Auto-Scan All Pairs</h1>

      <div className="card">
        <p className="text-slate-300 mb-4">
          Scans all 8 major forex pairs on 1H and 4H timeframes. Only saves signals with 65%+ confidence.
        </p>
        <p className="text-sm text-slate-400 mb-4">
          ℹ️ This scan also runs automatically every day at 8am UTC (Mon-Fri).
        </p>
        <button
          onClick={runScan}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {loading ? "⏳ Scanning 16 markets... (~30-60 seconds)" : "🚀 Scan All Pairs Now"}
        </button>
      </div>

      {error && (
        <div className="card border-red-500/20 bg-red-500/5">
          <p className="text-red-400">❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="card border-emerald-500/30 bg-emerald-500/5">
            <h2 className="text-xl font-bold mb-3">✅ Scan Complete!</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>Pairs Scanned: <span className="font-bold">{result.pairsScanned}</span></div>
              <div>New Signals: <span className="font-bold text-emerald-400">{result.signalsGenerated}</span></div>
            </div>
          </div>

          {result.signals?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">🎯 Generated Signals</h3>
              <div className="space-y-2">
                {result.signals.map((s: any) => (
                  <Link key={s.id} href={`/signals/${s.id}`} className="block">
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{s.pair}</span>
                        <span className={`badge ${s.direction === "BUY" ? "badge-buy" : "badge-sell"}`}>
                          {s.direction === "BUY" ? "▲" : "▼"} {s.direction}
                        </span>
                        <span className="text-xs text-slate-500">{s.timeframe}</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-400">{s.confidence}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {result.signals?.length === 0 && (
            <div className="card border-yellow-500/20 bg-yellow-500/5">
              <p className="text-yellow-400 font-semibold">⚠️ No new signals generated</p>
              <p className="text-sm text-slate-400 mt-2">
                All pairs scanned but no new setups meet the 65%+ confidence threshold. Existing recent signals were skipped to avoid duplicates. Try again in a few hours or during more volatile market hours.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
