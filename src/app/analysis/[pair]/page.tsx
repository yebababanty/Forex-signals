"use client";

import { useState, use } from "react";
import Link from "next/link";

export default function AnalysisPage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair: pairCode } = use(params);
  const displayPair = `${pairCode.slice(0, 3)}/${pairCode.slice(3)}`;

  const [timeframe, setTimeframe] = useState("4h");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "AUDUSD", "USDCAD", "EURGBP", "NZDUSD"];

  const runAnalysis = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/signals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair: displayPair, timeframe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return;
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const signal = result?.signal;
  const noSignal = result && !signal;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold">🔍 Analysis</h1>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Currency Pair</label>
            <div className="flex flex-wrap gap-2">
              {PAIRS.map((p) => (
                <Link
                  key={p}
                  href={`/analysis/${p}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${p === pairCode ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                >
                  {p.slice(0, 3)}/{p.slice(3)}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Timeframe</label>
            <div className="flex gap-2">
              {["1h", "4h", "1d"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${timeframe === tf ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"}`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              {loading ? "⏳ Analyzing..." : "🔍 Run Analysis"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card border-red-500/20 bg-red-500/5">
          <p className="text-red-400">❌ {error}</p>
        </div>
      )}

      {noSignal && (
        <div className="card border-yellow-500/20 bg-yellow-500/5">
          <h3 className="font-semibold text-yellow-400 mb-2">⚠️ No Trade Setup Found</h3>
          <p className="text-sm text-slate-400 mb-3">{result.message}</p>
          {result.missingCriteria?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-2">Missing criteria:</p>
              <ul className="space-y-2">
                {result.missingCriteria.map((c: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="text-yellow-500">✕</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.analysis?.trend && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-sm font-semibold text-slate-300 mb-2">Current Analysis:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Trend: <span className="font-semibold">{result.analysis.trend.direction}</span></div>
                <div>Strength: <span className="font-semibold">{result.analysis.trend.strength}%</span></div>
                <div>HTF: <span className="font-semibold">{result.analysis.trend.higherTFBias}</span></div>
                <div>RSI: <span className="font-semibold">{result.analysis.indicators?.rsi}</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {signal && (
        <div className="card border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">✅ Signal Generated!</h2>
            <Link
              href={`/signals/${signal.id}`}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              View Full Detail →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>Direction: <span className="font-bold">{signal.direction}</span></div>
            <div>Confidence: <span className="font-bold">{signal.confidence}%</span></div>
            <div>Entry: <span className="font-mono font-bold text-blue-400">{signal.entryPrice}</span></div>
            <div>SL: <span className="font-mono font-bold text-red-400">{signal.stopLoss}</span></div>
            <div>TP1: <span className="font-mono font-bold text-emerald-400">{signal.takeProfit1}</span></div>
            <div>RR: <span className="font-bold">1:{signal.riskReward}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
